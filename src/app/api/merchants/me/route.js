import { prisma } from "@/lib/db";
import { ok, bad } from "@/lib/http";
import { getBearerToken, verifyAuthToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const token = getBearerToken(req);
    if (!token) return bad("Missing Authorization: Bearer <token>", 401);

    const auth = await verifyAuthToken(token);
    const merchantId = auth.sub;

    const merchant = await prisma.merchant.findUnique({
      where: { merchant_id: merchantId },
      select: {
        merchant_id: true,
        address: true,
        name: true,
        email: true,
        active: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!merchant) return bad("Merchant not found", 404);

    return ok({ merchant });
  } catch (e) {
    return bad(e?.message || "Server error", 500);
  }
}
