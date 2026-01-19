import { prisma } from "@/lib/db";
import { ok, bad } from "@/lib/http";
import { getBearerToken, verifyAuthToken } from "@/lib/auth";

export async function GET(req) {
  try {
    const bearer = getBearerToken(req);
    if (!bearer) return bad("Missing Authorization: Bearer <token>", 401);

    const auth = await verifyAuthToken(bearer);

    const orders = await prisma.order.findMany({
      where: { merchant_id: auth.sub },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        merchant_id: true,
        merchant_address: true,
        order_id: true,
        invoice_id: true,
        amount: true,
        token: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    return ok({ orders });
  } catch (e) {
    return bad(e?.message || "Server error", 500);
  }
}
