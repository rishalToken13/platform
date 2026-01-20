import { prisma } from "@/lib/db";
import { ok, bad } from "@/lib/http";
import { getBearerToken, verifyAuthToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req, context) {
  try {
    const token = getBearerToken(req);
    if (!token) return bad("Missing Authorization", 401);

    const auth = await verifyAuthToken(token);
    const merchant_id = auth.sub;

    // ✅ Next 16: params is a Promise
    const { orderId } = await context.params;
    if (!orderId) return bad("Missing orderId", 400);

    const row = await prisma.order.findFirst({
      where: {
        merchant_id,      // scope to logged-in merchant
        order_id: orderId
      },
      select: {
        order_id: true,
        invoice_id: true,
        merchant_id: true,
        merchant_address: true,
        amount: true,
        token: true,
        status: true,
        txid: true,
        created_at: true,
        updated_at: true,
        merchant: {
          select: {
            name: true,
            merchant_id: true,
            address: true
          }
        }
      }
    });

    if (!row) return bad("Order not found", 404);

    // Flatten merchant info for frontend convenience
    const order = {
      order_id: row.order_id,
      invoice_id: row.invoice_id,
      amount: row.amount,
      token: row.token,
      status: row.status,
      txid: row.txid,
      created_at: row.created_at,
      updated_at: row.updated_at,

      merchant_id: row.merchant?.merchant_id || row.merchant_id,
      merchant_name: row.merchant?.name || null,
      merchant_address: row.merchant?.address || row.merchant_address
    };

    return ok({ order });
  } catch (e) {
    return bad(e?.message || "Server error", 500);
  }
}
