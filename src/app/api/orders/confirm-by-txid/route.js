import { prisma } from "@/lib/db";
import { ok, bad } from "@/lib/http";
import { getBearerToken, verifyAuthToken } from "@/lib/auth";
import { getTronWebPublic } from "@/lib/tron";
import { decodePaymentEvent, toBytes32, normHex } from "@/lib/tronEvents";
import { USDT } from "@/config";
import { toTokenUnits } from "@/lib/amount";

export async function POST(req) {
  try {
    // Auth
    const bearer = getBearerToken(req);
    if (!bearer) return bad("Missing Authorization: Bearer <token>", 401);
    const auth = await verifyAuthToken(bearer);

    // Body
    const body = await req.json();
    const { txid } = body || {};
    if (!txid) return bad("Missing required field: txid", 400);

    // Fetch tx info
    const tronWeb = getTronWebPublic();
    const txInfo = await tronWeb.trx.getTransactionInfo(String(txid));

    if (!txInfo || !txInfo.id) {
      return bad("Transaction not found yet. Try again after confirmation.", 404);
    }

    const receiptResult = String(txInfo?.receipt?.result || "").toUpperCase();
    const receiptOk = receiptResult === "SUCCESS";

    // Decode event
    const decoded = decodePaymentEvent(tronWeb, txInfo);
    if (!decoded) {
      return bad("No payment event decoded from logs (ensure Payment ABI includes events)", 409, {
        receipt: receiptResult,
        txid: txInfo.id
      });
    }

    if (decoded.eventName !== "PaymentDetected") {
      return bad(`Unexpected event decoded: ${decoded.eventName}`, 409);
    }

    const evMerchantId = normHex(decoded.args.merchantId);
    const evOrderId = normHex(decoded.args.orderId);
    const evInvoiceId = normHex(decoded.args.invoiceId);

    if (!evOrderId && !evInvoiceId) {
      return bad("Event missing orderId/invoiceId", 409, { args: decoded.args });
    }

    // Find merchant orders and match by bytes32 conversion
    // We only search within this merchant's orders (safe).
    const candidateOrders = await prisma.order.findMany({
      where: { merchant_id: auth.sub },
      select: {
        id: true,
        merchant_id: true,
        order_id: true,
        invoice_id: true,
        amount: true,
        status: true,
        txid: true
      }
    });

    let matched = null;

    for (const o of candidateOrders) {
      const dbMerchantB32 = normHex(toBytes32(tronWeb, o.merchant_id));
      const dbOrderB32 = normHex(toBytes32(tronWeb, o.order_id));
      const dbInvoiceB32 = normHex(toBytes32(tronWeb, o.invoice_id));

      const merchantOk = !evMerchantId || evMerchantId === dbMerchantB32;
      const orderOk = !evOrderId || evOrderId === dbOrderB32;
      const invoiceOk = !evInvoiceId || evInvoiceId === dbInvoiceB32;

      if (merchantOk && orderOk && invoiceOk) {
        matched = o;
        break;
      }
    }

    if (!matched) {
      return bad("No matching order found for this txid in your account", 404, {
        evMerchantId,
        evOrderId,
        evInvoiceId
      });
    }

    // Idempotency: already confirmed
    if (matched.txid) {
      if (matched.txid === String(txid)) {
        return ok({
          updated: false,
          status: matched.status,
          txid: matched.txid,
          reason: "Already confirmed with same txid"
        });
      }
      return bad("Order already confirmed with a different txid", 409, {
        existingTxid: matched.txid,
        newTxid: String(txid)
      });
    }

    // Validate token address
    const expectedToken = String(USDT.address);
    const gotToken = String(decoded.args.paymentToken || "");
    if (expectedToken && gotToken && expectedToken !== gotToken) {
      return bad("paymentToken mismatch (not USDT)", 409, {
        expected: expectedToken,
        got: gotToken
      });
    }

    // STRICT amount check
    const usdt = await tronWeb.contract(USDT.abi, USDT.address);
    const decimals = Number(await usdt.decimals().call());

    const expectedRaw = toTokenUnits(matched.amount, decimals);
    const gotRaw = String(decoded.args.amount || "0");

    if (!/^\d+$/.test(gotRaw)) return bad("Invalid amount in event", 409, { gotRaw });
    if (BigInt(expectedRaw) !== BigInt(gotRaw)) {
      return bad("amount mismatch", 409, {
        expectedRaw,
        gotRaw,
        decimals,
        orderAmount: matched.amount
      });
    }

    const finalStatus = receiptOk ? "SUCCESS" : "FAILED";

    await prisma.order.update({
      where: { id: matched.id },
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
      matchedOrder: {
        id: matched.id,
        order_id: matched.order_id,
        invoice_id: matched.invoice_id
      },
      strictCheck: { decimals, expectedRaw, gotRaw },
      event: { name: decoded.eventName, args: decoded.args }
    });
  } catch (e) {
    return bad(e?.message || "Server error", 500);
  }
}
