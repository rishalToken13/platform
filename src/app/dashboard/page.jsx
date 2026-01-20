"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";

function money(n) {
  const v = Number(n || 0);
  return v.toFixed(2);
}

function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    green: "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-800 border-yellow-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

const TRON_EXPLORER_TX = "https://nile.tronscan.org/#/transaction";

function txExplorerLink(txid) {
  return `${TRON_EXPLORER_TX}/${txid}`;
}

function TxLink({ txid }) {
  if (!txid) return <span className="text-gray-400">-</span>;

  const short = `${txid.slice(0, 8)}…${txid.slice(-6)}`;
  return (
    <a
      href={txExplorerLink(txid)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-gray-900 hover:bg-gray-50"
      title="Open in TronScan (Nile)"
    >
      <span className="font-mono">{short}</span>
      <span className="text-gray-400">↗</span>
    </a>
  );
}

function StatCard({ title, value, sub }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

function statusTone(s) {
  if (s === "SUCCESS") return "green";
  if (s === "FAILED") return "red";
  if (s === "PENDING" || s === "IN_PROGRESS") return "yellow";
  return "gray";
}

export default function DashboardPage() {
  const router = useRouter();

  const [merchant, setMerchant] = useState(null);
  const [kpi, setKpi] = useState(null);
  const [recent, setRecent] = useState([]);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token13_token");
    if (!token) router.replace("/login");
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setMsg("");

        const data = await apiFetch("/api/dashboard/summary");
        setMerchant(data.merchant);
        setKpi(data.kpi);
        setRecent((data.recentOrders || []).slice(0, 5));
      } catch (e) {
        setMsg(e?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeLabel = useMemo(() => {
    if (!merchant) return "-";
    return merchant.active ? "Active" : "Inactive";
  }, [merchant]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        </div>

        <Link
          href="/orders"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          View Orders
        </Link>
      </div>

      {msg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {msg}
        </div>
      ) : null}

      {/* Merchant card */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-gray-600">Merchant</div>
            <div className="mt-1 text-xl font-semibold text-gray-900">
              {merchant?.name || (loading ? "Loading..." : "-")}
            </div>

            <div className="mt-3 space-y-1 text-sm text-gray-700">
              <div className="break-all">
                <span className="text-gray-500">merchant_id:</span>{" "}
                <span className="font-mono">{merchant?.merchant_id || "-"}</span>
              </div>
              <div className="break-all">
                <span className="text-gray-500">address:</span>{" "}
                <span className="font-mono">{merchant?.address || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500">email:</span> {merchant?.email || "-"}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <Badge tone={merchant?.active ? "green" : "red"}>{activeLabel}</Badge>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Successful Orders" value={kpi?.success ?? (loading ? "…" : 0)} sub="Completed payments" />
        <StatCard title="Pending Orders" value={kpi?.pending ?? (loading ? "…" : 0)} sub="Awaiting payment" />
        <StatCard title={`Sales (${kpi?.currency || "USDT"})`} value={money(kpi?.sales)} sub="Sum of SUCCESS amounts" />
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">Recent Orders</div>
          <div className="text-xs text-gray-500">
            {kpi ? `Total orders: ${kpi.total}` : ""}
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
              </tr>
            </thead>

            <tbody className="divide-y">
              {(recent || []).map((o) => (
                <tr key={o.order_id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs break-all">{o.order_id}</td>
                  <td className="px-5 py-3 font-mono text-xs break-all">{o.invoice_id}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {o.amount} {o.token || "USDT"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <TxLink txid={o.txid} />
                  </td>
                </tr>
              ))}

              {!loading && (!recent || recent.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    No orders yet.
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
