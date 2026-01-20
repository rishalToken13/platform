import crypto from "crypto";
import { prisma } from "@/lib/db";
import { ok, bad } from "@/lib/http";
import { getBearerToken, verifyAuthToken } from "@/lib/auth";
import { toBytes32FromString } from "@/lib/bytes32";

export const runtime = "nodejs";

function randomSeed(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

export async function POST(req) {
  try {
    const token = getBearerToken(req);
    if (!token) return bad("Missing Authorization: Bearer <token>", 401);

    const auth = await verifyAuthToken(token);
    const merchant_id = auth.sub;

    const body = await req.json();
    const { amount } = body || {};

    if (!amount) return bad("Missing required field: amount", 400);
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      return bad("Invalid amount", 400);
    }

    // 🔐 bytes32 IDs (random → keccak256)
    const order_id = toBytes32FromString(null, randomSeed());
    const invoice_id = toBytes32FromString(null, randomSeed());

    // Get merchant address
    const merchant = await prisma.merchant.findUnique({
      where: { merchant_id },
      select: { address: true }
    });

    if (!merchant) return bad("Merchant not found", 404);

    const order = await prisma.order.create({
      data: {
        merchant_id,
        merchant_address: merchant.address,
        order_id,
        invoice_id,
        amount: String(amount),
        status: "PENDING"
      },
      select: {
        order_id: true,
        invoice_id: true,
        amount: true,
        status: true,
        created_at: true
      }
    });

    return ok({
      merchant_id,
      merchant_address: merchant.address,
      ...order
    }, 201);
  } catch (e) {
    return bad(e?.message || "Server error", 500);
  }
}
