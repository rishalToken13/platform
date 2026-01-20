"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import { requireAuth } from "@/lib/requireAuth";

export default function DashboardPage() {
  const router = useRouter();

  const [merchant, setMerchant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    setMsg("");
    const me = await apiFetch("/api/merchants/me");
    setMerchant(me.merchant);

    const list = await apiFetch("/api/orders/list");
    setOrders(list.orders);
  }

  useEffect(() => {
    requireAuth(router);
    loadAll().catch((e) => setMsg(`❌ ${e.message}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createOrder() {
    setLoading(true);
    setMsg("");
    try {
      const created = await apiFetch("/api/orders/create", {
        method: "POST",
        body: { amount },
      });
      setMsg(`✅ Order created: ${created.order_id}`);
      await loadAll();
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>

        {merchant ? (
          <div className="mt-3 text-sm space-y-1">
            <div><span className="font-medium">Name:</span> {merchant.name}</div>
            <div><span className="font-medium">Email:</span> {merchant.email}</div>
            <div className="break-all">
              <span className="font-medium">Merchant ID (bytes32):</span> {merchant.merchant_id}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-600">Loading merchant...</p>
        )}
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-3">Create Order</h2>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="USDT"
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <button
            onClick={createOrder}
            disabled={loading}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Creates bytes32 order_id + invoice_id.</p>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-3">Orders</h2>

        {orders.length === 0 ? (
          <p className="text-sm text-gray-600">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.order_id} className="border rounded p-3 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <div className="break-all">
                      <span className="font-medium">order_id:</span> {o.order_id}
                    </div>
                    <div className="text-xs text-gray-600">
                      {o.amount} {o.token} • {o.status}
                    </div>
                  </div>
                  <Link
                    href={`/orders/${o.order_id}`}
                    className="text-sm px-3 py-1 rounded border bg-white hover:bg-gray-50"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {msg ? <p className="mt-4 text-sm">{msg}</p> : null}
      </div>
    </div>
  );
}
