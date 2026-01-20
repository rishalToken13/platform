import { prisma } from "@/lib/db";
import { corsJson, corsResponse } from "@/lib/cors";
import { decodePaymentDetectedFromTx } from "@/lib/tronEvents";

export const runtime = "nodejs";

export async function OPTIONS() {
  return corsResponse(null, { status: 204 });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { txid } = body || {};
    if (!txid) return corsJson({ ok: false, error: "txid is required" }, 400);

    const decoded = await decodePaymentDetectedFromTx(txid);

    if (decoded.status === "FAILED") {
      // If tx exists but failed, optionally mark FAILED
      return corsJson({
        ok: true,
        data: { status: "FAILED", reason: decoded.reason, txid }
      });
    }

    const { event } = decoded;

    // Find order by invoice_id (bytes32) + merchant_id (bytes32)
    const order = await prisma.order.findFirst({
      where: {
        merchant_id: event.merchantId,
        invoice_id: event.invoiceId,
      },
      select: {
        id: true,
        status: true,
        txid: true,
        order_id: true,
        invoice_id: true,
        merchant_id: true,
        amount: true,
        token: true,
      },
    });

    if (!order) {
      return corsJson(
        {
          ok: false,
          error: "Order not found for this PaymentDetected event (merchant_id + invoice_id)",
          details: { merchantId: event.merchantId, invoiceId: event.invoiceId },
        },
        404
      );
    }

    // If already confirmed with same tx, idempotent success
    if (order.status === "SUCCESS" && order.txid === txid) {
      return corsJson({
        ok: true,
        data: { updated: false, status: "SUCCESS", order, txid },
      });
    }

    // Optional validation: ensure order_id matches
    if (order.order_id !== event.orderId) {
      return corsJson(
        {
          ok: false,
          error: "Order mismatch: event.orderId does not match DB order_id",
          details: { db: order.order_id, chain: event.orderId },
        },
        409
      );
    }

    // Update DB to SUCCESS, store txid (unique)
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "SUCCESS",
        txid,
        // optionally keep token/amount in DB but you already store these
      },
      select: {
        order_id: true,
        invoice_id: true,
        merchant_id: true,
        amount: true,
        token: true,
        status: true,
        txid: true,
        updated_at: true,
      },
    });

    return corsJson({
      ok: true,
      data: {
        updated: true,
        status: "SUCCESS",
        order: updated,
        chain: event,
      },
    });
  } catch (e) {
    return corsJson({ ok: false, error: e?.message || "Server error" }, 500);
  }
}
