// src/lib/paymentLink.js

export const PAYMENT_APP_BASE_URL =
  process.env.NEXT_PUBLIC_PAYMENT_APP_URL || "http://localhost:5173";

export function buildPaymentLink({
  merchant_name,
  merchant_id,
  merchant_address,
  order_id,
  invoice_id,
  amount,
  token = "USDT"
}) {
  const params = new URLSearchParams({
    merchant_name,
    merchant_id,
    merchant_address,
    order_id,
    invoice_id,
    amount,
    token
  });

  return `${PAYMENT_APP_BASE_URL}/pay?${params.toString()}`;
}
