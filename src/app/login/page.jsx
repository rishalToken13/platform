"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const emailV = String(email || "").trim().toLowerCase();
    const passwordV = String(password || "");

    if (!emailV || !passwordV) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setBusy(true);

      const res = await fetch("/api/merchants/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ email: emailV, password: passwordV }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `Login failed (${res.status})`);
      }

      // your backend returns { ok:true, data:{ token, merchant } }
      const token = json?.data?.token;
      if (!token) throw new Error("Login failed: token missing");

      localStorage.setItem("token13_token", token);
      router.replace("/dashboard");
    } catch (e2) {
      setError(e2?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-600">
              Login to manage orders and generate payment links.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-800">Email</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@merchant.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-800">Password</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {busy ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            New merchant?{" "}
            <Link className="text-gray-900 underline" href="/register">
              Create an account
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          token13 Merchant • Secure crypto checkout
        </div>
      </div>
    </div>
  );
}
