import { prisma } from "@/lib/db";
import { ok, bad } from "@/lib/http";
import { getBearerToken, verifyAuthToken } from "@/lib/auth";
import { newOrderId, newInvoiceId } from "@/lib/ids";

export async function POST(req) {
  try {
    const bearer = getBearerToken(req);
    if (!bearer) return bad("Missing Authorization: Bearer <token>", 401);

    const auth = await verifyAuthToken(bearer);

    const body = await req.json();
    const { amount, token = "USDT" } = body || {};

    if (!amount) return bad("Missing required field: amount", 400);

    // Store amount as string to avoid float issues
    const amountStr = String(amount);
    if (!/^\d+(\.\d+)?$/.test(amountStr)) {
      return bad("amount must be a numeric string like '10.00'", 400);
    }

    const created = await prisma.order.create({
      data: {
        merchant_id: auth.sub,
        merchant_address: auth.address,
        order_id: newOrderId(),
        invoice_id: newInvoiceId(),
        amount: amountStr,
        token: String(token || "USDT"),
        status: "PENDING",
      },
      select: {
        merchant_id: true,
        invoice_id: true,
        order_id: true,
        amount: true,
        merchant_address: true,
      },
    });

    return ok(created, 201);
  } catch (e) {
    if (e?.code === "P2002") return bad("Duplicate order_id/invoice_id", 409);
    return bad(e?.message || "Server error", 500);
  }
}
