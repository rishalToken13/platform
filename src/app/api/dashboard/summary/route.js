import { prisma } from "../../../../lib/db";
import { ok, bad } from "../../../../lib/http";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

function getTokenFromReq(req) {
  const h = req.headers.get("authorization") || "";
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

function requireAuth(req) {
  const token = getTokenFromReq(req);
  if (!token) throw new Error("Missing token");

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");

  return jwt.verify(token, secret); // returns payload
}

export async function GET(req) {
  try {
    const auth = requireAuth(req);
    const merchant_id = auth.sub;

    // Merchant details
    const merchant = await prisma.merchant.findFirst({
      where: { merchant_id },
      select: {
        merchant_id: true,
        name: true,
        email: true,
        address: true,
        active: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!merchant) return bad("Merchant not found", 404);

    // Counts by status
    const [total, success, pending, failed] = await Promise.all([
      prisma.order.count({ where: { merchant_id } }),
      prisma.order.count({ where: { merchant_id, status: "SUCCESS" } }),
      prisma.order.count({
        where: { merchant_id, status: { in: ["PENDING", "IN_PROGRESS"] } },
      }),
      prisma.order.count({ where: { merchant_id, status: "FAILED" } }),
    ]);

    // Sales SUM of SUCCESS amounts (amount is String => cast)
    const sumRows = await prisma.$queryRaw`
      SELECT COALESCE(SUM(amount::numeric), 0) AS total
      FROM "Order"
      WHERE merchant_id = ${merchant_id}
      AND status = 'SUCCESS'
    `;

    const sales = Number(sumRows?.[0]?.total || 0);

    // Recent orders (optional but useful)
    const recentOrders = await prisma.order.findMany({
      where: { merchant_id },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        order_id: true,
        invoice_id: true,
        amount: true,
        token: true,
        status: true,
        txid: true,
        created_at: true,
        updated_at: true,
      },
    });

    return ok({
      merchant,
      kpi: {
        total,
        success,
        pending,
        failed,
        sales,
        currency: "USDT",
      },
      recentOrders,
    });
  } catch (e) {
    return bad(e?.message || "Server error", 500);
  }
}
