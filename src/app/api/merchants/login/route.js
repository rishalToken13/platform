import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ok, bad } from "@/lib/http";
import { signAuthToken } from "@/lib/auth";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return bad("Missing required fields: email, password", 400);
    }

    const merchant = await prisma.merchant.findUnique({
      where: { email: String(email).toLowerCase() },
    });

    if (!merchant) return bad("Invalid credentials", 401);
    if (!merchant.active) return bad("Merchant is inactive", 403);

    const valid = await bcrypt.compare(String(password), merchant.passwordHash);
    if (!valid) return bad("Invalid credentials", 401);

    const token = await signAuthToken({
      sub: merchant.merchant_id,
      address: merchant.address,
      email: merchant.email,
      name: merchant.name,
    });

    return ok({
      token,
      merchant: {
        merchant_id: merchant.merchant_id,
        address: merchant.address,
        name: merchant.name,
        email: merchant.email,
        active: merchant.active,
      },
    });
  } catch (e) {
    return bad(e?.message || "Server error", 500);
  }
}
