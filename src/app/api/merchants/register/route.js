import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ok, bad } from "@/lib/http";
import { toBytes32FromString } from "@/lib/bytes32";
import { registerMerchantOnChain } from "@/lib/tron";

export async function POST(req) {
  try {
    const body = await req.json();
    const { merchant_address, email, password, name } = body || {};

    if (!merchant_address || !email || !password || !name) {
      return bad("Missing required fields: merchant_address, email, password, name", 400);
    }

    if (String(password).length < 6) {
      return bad("Password must be at least 6 characters", 400);
    }

    const merchantName = String(name).trim();
    const merchantEmail = String(email).toLowerCase().trim();
    const merchantAddress = String(merchant_address).trim();

    // ✅ merchant_id is bytes32 derived from name
    const merchant_id = toBytes32FromString(null, merchantName);

    const passwordHash = await bcrypt.hash(String(password), 10);

    const merchant = await prisma.merchant.create({
      data: {
        address: merchantAddress,
        email: merchantEmail,
        name: merchantName,
        passwordHash,
        merchant_id, // ✅ bytes32
        active: true
      },
      select: {
        merchant_id: true,
        address: true,
        name: true,
        email: true,
        active: true,
        created_at: true
      }
    });

    try {
      const txid = await registerMerchantOnChain({
        merchantAddress: merchant.address,
        merchantIdBytes32: merchant.merchant_id,
        name: merchant.name
      });

      return ok({ merchant, chain: { registered: true, txid } }, 201);
    } catch (chainErr) {
      return ok(
        {
          merchant,
          chain: { registered: false, error: chainErr?.message || String(chainErr) }
        },
        201
      );
    }
  } catch (e) {
    console.error("REGISTER_ERROR:", e); // ✅ add this
    if (e?.code === "P2002") return bad("Merchant already exists (unique field conflict)", 409);
    return bad(e?.message || "Server error", 500);
  }
}
