// src/app/orders/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import QRCode from "qrcode";
import Image from "next/image";

const TRON_EXPLORER_TX = "https://nile.tronscan.org/#/transaction";
const CRYPTO_PAY_BASE = "http://localhost:5173/pay"; // your crypto-pay app

function txExplorerLink(txid) {
    return `${TRON_EXPLORER_TX}/${txid}`;
}

function buildPaymentLink(order) {
    const params = new URLSearchParams({
        merchant_name: order.merchant_name || "",
        merchant_id: order.merchant_id || "",
        merchant_address: order.merchant_address || "",
        order_id: order.order_id || "",
        invoice_id: order.invoice_id || "",
        amount: order.amount || "",
        token: (order.token || "USDT").toUpperCase(),
    });
    return `${CRYPTO_PAY_BASE}?${params.toString()}`;
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

function Badge({ status }) {
    const map = {
        SUCCESS: "bg-green-50 text-green-700 border-green-200",
        PENDING: "bg-yellow-50 text-yellow-800 border-yellow-200",
        IN_PROGRESS: "bg-yellow-50 text-yellow-800 border-yellow-200",
        FAILED: "bg-red-50 text-red-700 border-red-200",
    };
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[status] || "bg-gray-100 text-gray-700 border-gray-200"
                }`}
        >
            {status}
        </span>
    );
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

function Modal({ open, title, subtitle, children, onClose }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-2xl rounded-2xl border bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-lg font-semibold text-gray-900">{title}</div>
                        {subtitle ? (
                            <div className="mt-1 text-sm text-gray-600">{subtitle}</div>
                        ) : null}
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>

                <div className="mt-5">{children}</div>
            </div>
        </div>
    );
}

export default function OrdersPage() {
    const router = useRouter();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState("");
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [paymentUrl, setPaymentUrl] = useState("");
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("ALL");

    // Create order modal state
    const [createOpen, setCreateOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [creating, setCreating] = useState(false);

    // View order modal state
    const [viewOpen, setViewOpen] = useState(false);
    const [viewLoading, setViewLoading] = useState(false);
    const [viewErr, setViewErr] = useState("");
    const [selected, setSelected] = useState(null);

    // lightweight toast
    const [toast, setToast] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token13_token");
        if (!token) router.replace("/login");
    }, [router]);

    async function refreshOrders() {
        const data = await apiFetch("/api/orders/list");
        setOrders(data?.orders || []);
    }

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setMsg("");
                await refreshOrders();
            } catch (e) {
                setMsg(e?.message || "Failed to load orders");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = useMemo(() => {
        let list = orders;

        if (status !== "ALL") list = list.filter((o) => o.status === status);

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

        return [...list].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [orders, q, status]);

    async function createOrder() {
        const v = String(amount || "").trim();
        if (!v) {
            setToast("Please enter amount in USDT.");
            return;
        }
        if (Number(v) <= 0) {
            setToast("Amount must be greater than 0.");
            return;
        }

        try {
            setCreating(true);
            setToast("");

            const res = await apiFetch("/api/orders/create", {
                method: "POST",
                body: JSON.stringify({ amount: v }),
            });

            setToast("✅ Order created");
            setCreateOpen(false);
            setAmount("");

            await refreshOrders();

            // open details modal immediately
            if (res?.order_id) {
                await openOrderModal(res.order_id);
            }
        } catch (e) {
            setToast(e?.message || "Failed to create order");
        } finally {
            setCreating(false);
        }
    }

    async function openOrderModal(orderId) {
        try {
            setViewOpen(true);
            setViewLoading(true);
            setViewErr("");
            setSelected(null);
            setQrDataUrl("");
            setPaymentUrl("");

            const data = await apiFetch(`/api/orders/${encodeURIComponent(orderId)}`);
            const order = data.order;
            setSelected(order);

            const url = buildPaymentLink(order);
            setPaymentUrl(url);

            // Generate QR as image dataURL
            const dataUrl = await QRCode.toDataURL(url, {
                margin: 1,
                width: 260,
                errorCorrectionLevel: "M",
            });
            setQrDataUrl(dataUrl);
        } catch (e) {
            setViewErr(e?.message || "Failed to load order");
        } finally {
            setViewLoading(false);
        }
    }


    async function handleCopyPaymentLink() {
        if (!paymentUrl) return;
        const ok = await copyToClipboard(paymentUrl);
        setToast(ok ? "✅ Payment link copied" : "❌ Copy failed");
    }


    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
                    <p className="mt-1 text-sm text-gray-600">Track and manage all orders.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setToast("");
                            setCreateOpen(true);
                        }}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                        + Create Order
                    </button>

                    <Link
                        href="/dashboard"
                        className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
                    >
                        Back
                    </Link>
                </div>
            </div>

            {msg ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {msg}
                </div>
            ) : null}

            {toast ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                    {toast}
                </div>
            ) : null}

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

            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        {loading ? "Loading..." : `${filtered.length} orders`}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-[1020px] w-full text-sm">
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
                                    <td className="px-5 py-3 font-mono text-xs break-all">{o.order_id}</td>
                                    <td className="px-5 py-3 font-mono text-xs break-all">{o.invoice_id}</td>

                                    <td className="px-5 py-3 font-medium text-gray-900">
                                        {o.amount} {o.token || "USDT"}
                                    </td>

                                    <td className="px-5 py-3">
                                        <Badge status={o.status} />
                                    </td>

                                    <td className="px-5 py-3 whitespace-nowrap">
                                        <TxLink txid={o.txid} />
                                    </td>

                                    <td className="px-5 py-3 text-right">
                                        <button
                                            onClick={() => openOrderModal(o.order_id)}
                                            className="inline-flex items-center rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
                                        >
                                            View
                                        </button>
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

            {/* Create Order Modal */}
            <Modal
                open={createOpen}
                title="Create Order"
                subtitle="Enter the amount in USDT and create a payment request."
                onClose={() => {
                    if (!creating) {
                        setCreateOpen(false);
                        setToast("");
                    }
                }}
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-800">Amount (USDT)</label>
                        <input
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount in USDT"
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
                        />
                        <div className="mt-1 text-xs text-gray-500">Example: 15.00</div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={() => setCreateOpen(false)}
                            disabled={creating}
                            className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={createOrder}
                            disabled={creating}
                            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                        >
                            {creating ? "Creating..." : "Create"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* View Order Modal */}
            <Modal
                open={viewOpen}
                title="Order Details"
                subtitle="Payment link, status, and on-chain transaction details."
                onClose={() => setViewOpen(false)}
            >
                {viewLoading ? (
                    <div className="text-sm text-gray-600">Loading order...</div>
                ) : viewErr ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {viewErr}
                    </div>
                ) : selected ? (
                    <div className="space-y-5">
                        {/* Top cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Merchant */}
                            <div className="rounded-xl border bg-gray-50 p-4">
                                <div className="text-xs text-gray-500">Merchant</div>
                                <div className="mt-1 text-sm font-semibold text-gray-900">
                                    {selected.merchant_name || "-"}
                                </div>

                                <div className="mt-2 text-xs text-gray-600 break-all">
                                    <span className="text-gray-500">merchant_id:</span>{" "}
                                    <span className="font-mono">{selected.merchant_id}</span>
                                </div>

                                <div className="mt-1 text-xs text-gray-600 break-all">
                                    <span className="text-gray-500">address:</span>{" "}
                                    <span className="font-mono">{selected.merchant_address}</span>
                                </div>
                            </div>

                            {/* Amount + status */}
                            <div className="rounded-xl border bg-gray-50 p-4">
                                <div className="text-xs text-gray-500">Amount</div>
                                <div className="mt-1 text-2xl font-semibold text-gray-900">
                                    {selected.amount} {selected.token || "USDT"}
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <Badge status={selected.status} />
                                    {selected.txid ? <TxLink txid={selected.txid} /> : null}
                                </div>
                            </div>
                        </div>

                        {/* Identifiers */}
                        <div className="rounded-xl border p-4 space-y-2">
                            <div className="text-sm font-medium text-gray-900">Identifiers</div>

                            <div className="text-xs text-gray-600 break-all">
                                <span className="text-gray-500">order_id:</span>{" "}
                                <span className="font-mono">{selected.order_id}</span>
                            </div>

                            <div className="text-xs text-gray-600 break-all">
                                <span className="text-gray-500">invoice_id:</span>{" "}
                                <span className="font-mono">{selected.invoice_id}</span>
                            </div>

                            {selected.txid ? (
                                <div className="text-xs text-gray-600 break-all">
                                    <span className="text-gray-500">txid:</span>{" "}
                                    <span className="font-mono">{selected.txid}</span>
                                </div>
                            ) : null}
                        </div>

                        {/* Payment section (QR instead of showing raw link) */}
                        <div className="rounded-xl border p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-sm font-medium text-gray-900">Payment</div>
                                    <div className="text-xs text-gray-500">
                                        {selected.status === "SUCCESS"
                                            ? "Payment completed. QR disabled."
                                            : "Scan QR to open the crypto payment page."}
                                    </div>
                                </div>
                            </div>

                            {/* QR box */}
                            <div
                                className={`flex flex-col items-center justify-center rounded-xl border bg-gray-50 p-4 ${selected.status === "SUCCESS" ? "opacity-40 grayscale" : ""
                                    }`}
                            >
                                {qrDataUrl ? (
                                    <Image
                                        src={qrDataUrl}
                                        alt="Payment QR"
                                        width={260}
                                        height={260}
                                        className="rounded-lg border bg-white p-2"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="text-sm text-gray-600">Generating QR...</div>
                                )}

                                <div className="mt-3 text-xs text-gray-500 text-center">
                                    {selected.status === "SUCCESS"
                                        ? "Paid"
                                        : "Customer can scan this QR to pay via TronLink"}
                                </div>
                            </div>

                            {/* Actions */}
                            {selected.status !== "SUCCESS" ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={handleCopyPaymentLink}
                                        disabled={!paymentUrl}
                                        className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                                    >
                                        Copy Link
                                    </button>

                                    <a
                                        href={paymentUrl || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                                        onClick={(e) => {
                                            if (!paymentUrl) e.preventDefault();
                                        }}
                                    >
                                        Open Payment Page ↗
                                    </a>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                    {selected.txid ? (
                                        <a
                                            href={txExplorerLink(selected.txid)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                                        >
                                            View Transaction ↗
                                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-mono">{selected.txid.slice(0, 8)}…{selected.txid.slice(-6)}</span>
                                        </a>
                                    ) : (
                                        <div className="text-sm text-gray-600">
                                            SUCCESS but txid is missing.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-gray-600">No order selected.</div>
                )}

            </Modal>
        </div>
    );
}
