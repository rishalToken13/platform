import { prisma } from "@/lib/db";
import { ok, bad } from "@/lib/http";
import { getBearerToken, verifyAuthToken } from "@/lib/auth";
import { getTronWebPublic } from "@/lib/tron";
import { decodeMerchantRegistryEvent, toBytes32, normHex } from "@/lib/tronEvents";

/**
 * POST /api/merchants/confirm
 * Body:
 *  {
 *    txid: "...."
 *  }
 *
 * Auth: Bearer JWT
 *
 * Behavior:
 *  - Fetch tx info from chain
 *  - Decode MerchantOnboarded event from logs
 *  - Validate it matches the logged-in merchant
 *  - Update merchant.active based on event.active
 */
export async function POST(req) {
  try {
    // 1) Auth
    const bearer = getBearerToken(req);
    if (!bearer) return bad("Missing Authorization: Bearer <token>", 401);

    const auth = await verifyAuthToken(bearer);

    // 2) Body
    const body = await req.json();
    const { txid } = body || {};
    if (!txid) return bad("Missing required field: txid", 400);

    // 3) Load merchant (by merchant_id from JWT)
    const merchant = await prisma.merchant.findUnique({
      where: { merchant_id: auth.sub }
    });

    if (!merchant) return bad("Merchant not found", 404);

    // 4) Fetch tx info
    const tronWeb = getTronWebPublic();
    const txInfo = await tronWeb.trx.getTransactionInfo(String(txid));

    if (!txInfo || !txInfo.id) {
      return bad("Transaction not found yet. Try again after confirmation.", 404);
    }

    const receiptResult = String(txInfo?.receipt?.result || "").toUpperCase();
    const receiptOk = receiptResult === "SUCCESS";

    // 5) Decode merchant registry event from logs
    const decoded = decodeMerchantRegistryEvent(tronWeb, txInfo);

    if (!decoded) {
      // No event decoded — don't change merchant, but report.
      return ok({
        updated: false,
        reason: "No merchant event decoded from logs (ensure MerchantRegistry ABI includes events)",
        receipt: receiptResult,
        txid: txInfo.id
      });
    }

    if (decoded.eventName !== "MerchantOnboarded") {
      return bad(`Unexpected event decoded: ${decoded.eventName}`, 409);
    }

    // 6) Validate merchantId matches this merchant_id
    // Contract emits bytes32 merchantId (indexed)
    const evMerchantId = normHex(decoded.args.merchantId);
    const dbMerchantB32 = normHex(toBytes32(tronWeb, merchant.merchant_id));

    if (evMerchantId && evMerchantId !== dbMerchantB32) {
      return bad("merchantId in tx event does not match this merchant", 409, {
        expected: dbMerchantB32,
        got: evMerchantId
      });
    }

    // 7) Update merchant.active based on event.active (and receipt)
    // If receipt failed, consider merchant inactive regardless.
    const eventActive = !!decoded.args.active;
    const finalActive = receiptOk ? eventActive : false;

    const updated = await prisma.merchant.update({
      where: { merchant_id: merchant.merchant_id },
      data: { active: finalActive },
      select: {
        merchant_id: true,
        address: true,
        name: true,
        email: true,
        active: true,
        updated_at: true
      }
    });

    return ok({
      updated: true,
      txid: txInfo.id,
      receipt: receiptResult,
      merchant: updated,
      event: { name: decoded.eventName, args: decoded.args }
    });
  } catch (e) {
    return bad(e?.message || "Server error", 500);
  }
}
