"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { requireAuth } from "@/lib/requireAuth";
import { buildPaymentLink } from "@/lib/paymentLink";

export default function OrderViewPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId;

  const [order, setOrder] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    requireAuth(router);
    if (!orderId) return;

    (async () => {
      try {
        setMsg("");
        const data = await apiFetch(`/api/orders/${orderId}`);
        setOrder(data.order);
      } catch (e) {
        setMsg(`❌ ${e.message}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const paymentUrl = useMemo(() => {
    if (!order) return "";

    return buildPaymentLink({
      merchant_name: order.merchant_name || "",
      merchant_id: order.merchant_id || "",
      merchant_address: order.merchant_address || "",
      order_id: order.order_id || "",
      invoice_id: order.invoice_id || "",
      amount: order.amount || "",
      token: order.token || "USDT",
    });
  }, [order]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setMsg("✅ Payment link copied");
      setTimeout(() => setMsg(""), 1200);
    } catch {
      setMsg("⚠️ Unable to copy. Please copy manually.");
    }
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <h1 className="text-xl font-semibold mb-4">Order</h1>

      {order ? (
        <div className="text-sm space-y-2">
          <div>
            <span className="font-medium">Merchant:</span>{" "}
            {order.merchant_name}
          </div>

          <div className="break-all">
            <span className="font-medium">merchant_id:</span> {order.merchant_id}
          </div>

          <div className="break-all">
            <span className="font-medium">merchant_address:</span>{" "}
            {order.merchant_address}
          </div>

          <div className="break-all">
            <span className="font-medium">order_id:</span> {order.order_id}
          </div>

          <div className="break-all">
            <span className="font-medium">invoice_id:</span> {order.invoice_id}
          </div>

          <div>
            <span className="font-medium">amount:</span> {order.amount}{" "}
            {order.token}
          </div>

          <div>
            <span className="font-medium">status:</span> {order.status}
          </div>

          <div className="break-all">
            <span className="font-medium">txid:</span> {order.txid || "-"}
          </div>

          {/* Payment Link */}
          {paymentUrl && order.status === "PENDING" && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-medium mb-2">Customer Payment Link</h3>

              <div className="flex gap-2 items-center">
                <input
                  readOnly
                  value={paymentUrl}
                  className="flex-1 border rounded px-3 py-2 text-xs"
                />

                <button
                  onClick={copyLink}
                  className="px-3 py-2 rounded border bg-white hover:bg-gray-50 text-sm"
                >
                  Copy
                </button>

                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded bg-black text-white text-sm"
                >
                  Open
                </a>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Share this link with the customer to complete payment.
              </p>
            </div>
          )}

          {msg ? <p className="mt-4 text-sm">{msg}</p> : null}
        </div>
      ) : (
        <p className="text-sm text-gray-600">{msg || "Loading..."}</p>
      )}
    </div>
  );
}
