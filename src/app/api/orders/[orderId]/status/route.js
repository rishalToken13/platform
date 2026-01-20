import { prisma } from "@/lib/db";
import { ok, bad } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  try {
    const { orderId } = await params;
    if (!orderId) return bad("Missing orderId", 400);

    const order = await prisma.order.findFirst({
      where: { order_id: String(orderId) },
      select: {
        order_id: true,
        invoice_id: true,
        amount: true,
        token: true,
        status: true,
        txid: true,
        updated_at: true,
      },
    });

    if (!order) return bad("Order not found", 404);

    return ok({ order });
  } catch (e) {
    return bad(e?.message || "Server error", 500);
  }
}
