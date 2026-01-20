import { PAYMENT } from "@/config";
import { getTronWebPublic } from "@/lib/tronPublic";

const PAYMENT_DETECTED_ABI_ITEM = PAYMENT.abi.find(
  (x) => x.type === "event" && x.name === "PaymentDetected"
);

if (!PAYMENT_DETECTED_ABI_ITEM) {
  // fail fast at build-time
  throw new Error("PaymentDetected event not found in PAYMENT ABI");
}

export async function decodePaymentDetectedFromTx(txid) {
  const tronWeb = getTronWebPublic();

  // Fetch tx + receipt info
  const txInfo = await tronWeb.trx.getTransactionInfo(txid);
  if (!txInfo) throw new Error("Transaction not found on chain yet");

  // SUCCESS on TRON: receipt.result === "SUCCESS"
  const receiptResult = txInfo?.receipt?.result;
  if (receiptResult && receiptResult !== "SUCCESS") {
    return { status: "FAILED", reason: `receipt.result=${receiptResult}`, txInfo };
  }

  const logs = txInfo.log || txInfo.logs || [];
  if (!logs.length) throw new Error("No logs found in transaction (not a contract event?)");

  // PaymentCore contract address in txInfo is hex, logs also in hex.
  const paymentHex = tronWeb.address.toHex(PAYMENT.address).replace(/^0x/, "");

  // Find logs emitted by PAYMENT contract
  const fromPaymentLogs = logs.filter((l) => {
    const addr = (l.address || "").toLowerCase();
    return addr === paymentHex.toLowerCase();
  });

  if (!fromPaymentLogs.length) {
    throw new Error("No logs found from PAYMENT contract in this tx");
  }

  // Decode candidate logs and find PaymentDetected
  for (const l of fromPaymentLogs) {
    // tronweb expects "topics" and "data"
    const topics = l.topics || [];
    const data = l.data;

    try {
      const decoded = tronWeb.utils.abi.decodeLog(
        PAYMENT_DETECTED_ABI_ITEM.inputs,
        data,
        topics.slice(1) // remove signature topic
      );

      // decoded has keys by input name
      return {
        status: "SUCCESS",
        event: {
          merchantId: decoded.merchantId,
          orderId: decoded.orderId,
          invoiceId: decoded.invoiceId,
          paymentToken: decoded.paymentToken,
          amount: decoded.amount?.toString?.() ?? String(decoded.amount),
          timestamp: decoded.timestamp?.toString?.() ?? String(decoded.timestamp),
        },
        txInfo,
      };
    } catch (e) {
      // not this event
      continue;
    }
  }

  throw new Error("PaymentDetected event not found in tx logs");
}
