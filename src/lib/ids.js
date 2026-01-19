import crypto from "crypto";

/**
 * Random human-readable seed (never sent to chain)
 */
function randomSeed(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * merchantId = keccak256(name)
 */
export function createMerchantId(tronWeb, name) {
  return toBytes32FromString(tronWeb, name);
}

/**
 * orderId = keccak256(random)
 */
export function createOrderId(tronWeb) {
  return toBytes32FromString(tronWeb, randomSeed());
}

/**
 * invoiceId = keccak256(random)
 */
export function createInvoiceId(tronWeb) {
  return toBytes32FromString(tronWeb, randomSeed());
}
