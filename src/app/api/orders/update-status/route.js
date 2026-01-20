import { prisma } from "@/lib/db";
import { corsJson, corsResponse } from "@/lib/cors";

export const runtime = "nodejs";

export async function OPTIONS() {
  return corsResponse(null, { status: 204 });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { txid, status, order_id, invoice_id } = body || {};

    if (!txid) return corsJson({ ok: false, error: "txid is required" }, 400);
    if (!status || !["SUCCESS", "FAILED"].includes(status)) {
      return corsJson({ ok: false, error: "status must be SUCCESS or FAILED" }, 400);
    }
    if (!order_id) return corsJson({ ok: false, error: "order_id is required" }, 400);
    if (!invoice_id) return corsJson({ ok: false, error: "invoice_id is required" }, 400);

    // find order by (order_id + invoice_id) - both are bytes32 strings in your DB
    const order = await prisma.order.findFirst({
      where: {
        order_id,
        invoice_id,
      },
      select: {
        id: true,
        status: true,
        txid: true,
      },
    });

    if (!order) {
      return corsJson({ ok: false, error: "Order not found" }, 404);
    }

    // idempotent: if already success, don't overwrite
    if (order.status === "SUCCESS") {
      return corsJson({
        ok: true,
        data: {
          updated: false,
          order: { ...order, status: "SUCCESS" },
        },
      });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status,
        txid, // unique in schema
      },
      select: {
        order_id: true,
        invoice_id: true,
        status: true,
        txid: true,
        updated_at: true,
      },
    });

    return corsJson({ ok: true, data: { updated: true, order: updated } });
  } catch (e) {
    // unique constraint (txid already used)
    if (e?.code === "P2002") {
      return corsJson({ ok: false, error: "txid already used by another order" }, 409);
    }
    return corsJson({ ok: false, error: e?.message || "Server error" }, 500);
  }
}
