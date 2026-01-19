import { prisma } from "@/lib/db";
import { ok, bad } from "@/lib/http";
import { getBearerToken, verifyAuthToken } from "@/lib/auth";
import { getTronWebPublic } from "@/lib/tron";
import { decodePaymentEvent, toBytes32, normHex } from "@/lib/tronEvents";
import { USDT } from "@/config";

/**
 * POST /api/orders/confirm
 * Body: { txid, order_id? , invoice_id? }
 */
export async function POST(req) {
  try {
    const bearer = getBearerToken(req);
    if (!bearer) return bad("Missing Authorization: Bearer <token>", 401);
    const auth = await verifyAuthToken(bearer);

    const body = await req.json();
    const { txid, order_id, invoice_id } = body || {};
    if (!txid) return bad("Missing required field: txid", 400);
    if (!order_id && !invoice_id) return bad("Provide at least one: order_id or invoice_id", 400);

    const order = await prisma.order.findFirst({
      where: {
        merchant_id: auth.sub,
        ...(order_id ? { order_id: String(order_id) } : {}),
        ...(invoice_id ? { invoice_id: String(invoice_id) } : {})
      }
    });

    if (!order) return bad("Order not found for this merchant", 404);

    // Idempotency: if txid already stored
    if (order.txid) {
      if (order.txid === String(txid)) {
        return ok({ updated: false, status: order.status, txid: order.txid, reason: "Already confirmed with same txid" });
      }
      return bad("Order already confirmed with a different txid", 409, { existingTxid: order.txid, newTxid: String(txid) });
    }

    const tronWeb = getTronWebPublic();
    const txInfo = await tronWeb.trx.getTransactionInfo(String(txid));

    if (!txInfo || !txInfo.id) {
      return bad("Transaction not found yet. Try again after confirmation.", 404);
    }

    const receiptResult = String(txInfo?.receipt?.result || "").toUpperCase();
    const receiptOk = receiptResult === "SUCCESS";

    const decoded = decodePaymentEvent(tronWeb, txInfo);

    if (!decoded) {
      const fallbackStatus = receiptOk ? "IN_PROGRESS" : "FAILED";

      await prisma.order.update({
        where: { id: order.id },
        data: { status: fallbackStatus }
      });

      return ok({
        updated: true,
        status: fallbackStatus,
        receipt: receiptResult,
        txid: txInfo.id,
        reason: "No event decoded from logs (ensure Payment ABI includes events)"
      });
    }

    if (decoded.eventName !== "PaymentDetected") {
      return bad(`Unexpected event decoded: ${decoded.eventName}`, 409);
    }

    // Validate IDs (bytes32)
    const evMerchantId = normHex(decoded.args.merchantId);
    const evOrderId = normHex(decoded.args.orderId);
    const evInvoiceId = normHex(decoded.args.invoiceId);

    const dbMerchantB32 = normHex(toBytes32(tronWeb, order.merchant_id));
    const dbOrderB32 = normHex(toBytes32(tronWeb, order.order_id));
    const dbInvoiceB32 = normHex(toBytes32(tronWeb, order.invoice_id));

    if (evMerchantId && evMerchantId !== dbMerchantB32) {
      return bad("merchantId mismatch", 409, { expected: dbMerchantB32, got: evMerchantId });
    }
    if (evOrderId && evOrderId !== dbOrderB32) {
      return bad("orderId mismatch", 409, { expected: dbOrderB32, got: evOrderId });
    }
    if (evInvoiceId && evInvoiceId !== dbInvoiceB32) {
      return bad("invoiceId mismatch", 409, { expected: dbInvoiceB32, got: evInvoiceId });
    }

    // Validate token address: PaymentDetected.paymentToken should equal USDT contract
    // decoded.args.paymentToken is base58 (we convert in decoder)
    const expectedToken = String(USDT.address);
    const gotToken = String(decoded.args.paymentToken || "");

    if (expectedToken && gotToken && expectedToken !== gotToken) {
      return bad("paymentToken mismatch (not USDT)", 409, { expected: expectedToken, got: gotToken });
    }

    // Validate amount:
    // decoded.args.amount is raw uint256 string (ex: "10000000" for 10 USDT w/ 6 decimals)
    // Your DB order.amount is human string "10.00"
    // For now: we only ensure it's >0 and receipt is SUCCESS.
    // (If you want strict match, we’ll also fetch USDT decimals and convert.)
    const rawAmount = String(decoded.args.amount || "0");
    if (!/^\d+$/.test(rawAmount) || BigInt(rawAmount) <= 0n) {
      return bad("Invalid amount in event", 409, { rawAmount });
    }

    const finalStatus = receiptOk ? "SUCCESS" : "FAILED";

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: finalStatus,
        txid: txInfo.id
      }
    });

    return ok({
      updated: true,
      status: finalStatus,
      txid: txInfo.id,
      receipt: receiptResult,
      event: {
        name: decoded.eventName,
        args: decoded.args
      }
    });
  } catch (e) {
    return bad(e?.message || "Server error", 500);
  }
}
