"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    merchant_address: "",
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  function onChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/merchants/register", {
        method: "POST",
        auth: false,
        body: form,
      });

      setMsg(
        data?.chain?.registered
          ? `✅ Registered on-chain. txid: ${data.chain.txid}`
          : `⚠️ Registered in DB. On-chain failed: ${data?.chain?.error || "unknown"}`
      );

      // send to login
      setTimeout(() => router.push("/login"), 700);
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <h1 className="text-xl font-semibold mb-4">Merchant Register</h1>

      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full border rounded px-3 py-2"
          name="merchant_address"
          placeholder="Merchant address (T...)"
          value={form.merchant_address}
          onChange={onChange}
        />
        <input
          className="w-full border rounded px-3 py-2"
          name="name"
          placeholder="Merchant name"
          value={form.name}
          onChange={onChange}
        />
        <input
          className="w-full border rounded px-3 py-2"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={onChange}
        />
        <input
          className="w-full border rounded px-3 py-2"
          name="password"
          placeholder="Password (min 6)"
          type="password"
          value={form.password}
          onChange={onChange}
        />

        <button
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create Merchant"}
        </button>
      </form>

      {msg ? <p className="mt-4 text-sm">{msg}</p> : null}
    </div>
  );
}
