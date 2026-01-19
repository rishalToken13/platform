import { prisma } from "@/lib/db";
import { ok, bad } from "@/lib/http";
import { getTronWebPublic } from "@/lib/tron";
import { decodePaymentEvent, toBytes32, normHex } from "@/lib/tronEvents";
import { USDT } from "@/config";
import { toTokenUnits } from "@/lib/amount";

/**
 * POST /api/orders/webhook/tron
 *
 * Headers:
 *   x-webhook-secret: <WEBHOOK_SECRET>
 *
 * Body:
 *  {
 *    txid: "...."
 *  }
 *
 * Behavior:
 *  - Fetch tx info
 *  - Decode PaymentDetected
 *  - Find matching order across DB
 *  - Validate token + amount
 *  - Update status + store txid
 */
export async function POST(req) {
  try {
    const secret = req.headers.get("x-webhook-secret") || "";
    if (!process.env.WEBHOOK_SECRET) return bad("WEBHOOK_SECRET not configured", 500);
    if (secret !== process.env.WEBHOOK_SECRET) return bad("Unauthorized webhook", 401);

    const body = await req.json();
    const { txid } = body || {};
    if (!txid) return bad("Missing required field: txid", 400);

    const tronWeb = getTronWebPublic();
    const txInfo = await tronWeb.trx.getTransactionInfo(String(txid));

    if (!txInfo || !txInfo.id) {
      return bad("Transaction not found yet. Try again after confirmation.", 404);
    }

    const receiptResult = String(txInfo?.receipt?.result || "").toUpperCase();
    const receiptOk = receiptResult === "SUCCESS";

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

    // Find candidate orders (try to reduce DB scan)
    // If you have lots of orders, we’ll add indexes + store bytes32 ids in DB.
    const candidates = await prisma.order.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] }
      },
      select: {
        id: true,
        merchant_id: true,
        order_id: true,
        invoice_id: true,
        amount: true,
        txid: true,
        status: true
      }
    });

    let matched = null;

    for (const o of candidates) {
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
      return bad("No matching order found in DB for this txid", 404, {
        evMerchantId,
        evOrderId,
        evInvoiceId
      });
    }

    // Idempotency
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

    // Validate token
    const expectedToken = String(USDT.address);
    const gotToken = String(decoded.args.paymentToken || "");
    if (expectedToken && gotToken && expectedToken !== gotToken) {
      return bad("paymentToken mismatch (not USDT)", 409, {
        expected: expectedToken,
        got: gotToken
      });
    }

    // STRICT amount
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

    const updated = await prisma.order.update({
      where: { id: matched.id },
      data: {
        status: finalStatus,
        txid: txInfo.id
      },
      select: {
        id: true,
        merchant_id: true,
        order_id: true,
        invoice_id: true,
        amount: true,
        token: true,
        status: true,
        txid: true,
        updated_at: true
      }
    });

    return ok({
      updated: true,
      receipt: receiptResult,
      order: updated,
      strictCheck: { decimals, expectedRaw, gotRaw },
      event: { name: decoded.eventName, args: decoded.args }
    });
  } catch (e) {
    return bad(e?.message || "Server error", 500);
  }
}
