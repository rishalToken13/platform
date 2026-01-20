"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";

function Badge({ status }) {
  const map = {
    SUCCESS: "bg-green-50 text-green-700 border-green-200",
    PENDING: "bg-yellow-50 text-yellow-800 border-yellow-200",
    IN_PROGRESS: "bg-yellow-50 text-yellow-800 border-yellow-200",
    FAILED: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${map[status] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {status}
    </span>
  );
}

function shortHash(v) {
  if (!v) return "-";
  if (v.length <= 18) return v;
  return `${v.slice(0, 10)}…${v.slice(-6)}`;
}

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");

  useEffect(() => {
    const token = localStorage.getItem("token13_token");
    if (!token) router.replace("/login");
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setMsg("");
        const data = await apiFetch("/api/orders/list");
        setOrders(data.orders || []);
      } catch (e) {
        setMsg(e?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = orders;

    if (status !== "ALL") {
      list = list.filter((o) => o.status === status);
    }

    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((o) => {
        return (
          (o.order_id || "").toLowerCase().includes(s) ||
          (o.invoice_id || "").toLowerCase().includes(s) ||
          (o.txid || "").toLowerCase().includes(s)
        );
      });
    }

    // newest first (if created_at exists)
    return [...list].sort((a, b) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });
  }, [orders, q, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track payments, share payment links, and review transaction status.
          </p>
        </div>

        <a
          href="/dashboard"
          className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Back to Dashboard
        </a>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex-1">
            <label className="text-xs text-gray-600">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by order_id / invoice_id / txid"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>

          <div className="w-full md:w-56">
            <label className="text-xs text-gray-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-gray-900/10"
            >
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {msg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {msg}
        </div>
      ) : null}

      {/* Table */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {loading ? "Loading..." : `${filtered.length} orders`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-medium px-5 py-3">Order</th>
                <th className="text-left font-medium px-5 py-3">Invoice</th>
                <th className="text-left font-medium px-5 py-3">Amount</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="text-left font-medium px-5 py-3">Tx</th>
                <th className="text-right font-medium px-5 py-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {filtered.map((o) => (
                <tr key={o.order_id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs break-all">
                    {shortHash(o.order_id)}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs break-all">
                    {shortHash(o.invoice_id)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{o.amount} {o.token || "USDT"}</div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge status={o.status} />
                  </td>
                  <td className="px-5 py-3 font-mono text-xs break-all">
                    {o.txid ? shortHash(o.txid) : "-"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <a
                      href={`/orders/${encodeURIComponent(o.order_id)}`}
                      className="inline-flex items-center rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    No orders found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
