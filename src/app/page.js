// src/app/page.jsx
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token13_token"); // use your actual key
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">token13 Merchant</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create orders and share payment links for customers to pay via TronLink.
        </p>

        <div className="mt-8 flex gap-3">
          <Link
            href="/register"
            className="px-4 py-2 rounded bg-black text-white text-sm"
          >
            Register
          </Link>

          <Link
            href="/login"
            className="px-4 py-2 rounded border bg-white text-sm"
          >
            Login
          </Link>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Already registered? Login to access your dashboard.
        </div>
      </div>
    </div>
  );
}
