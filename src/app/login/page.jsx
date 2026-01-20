"use client";

import { useState } from "react";
import { apiFetch, setToken } from "@/lib/apiClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  function onChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/merchants/login", {
        method: "POST",
        auth: false,
        body: form,
      });

      setToken(data.token);
      router.push("/dashboard");
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <h1 className="text-xl font-semibold mb-4">Merchant Login</h1>

      <form onSubmit={submit} className="space-y-3">
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
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={onChange}
        />

        <button
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>

      {msg ? <p className="mt-4 text-sm">{msg}</p> : null}
    </div>
  );
}
