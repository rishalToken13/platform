"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-bold text-gray-900">
          token13 Merchant
        </h1>

        <p className="mt-4 text-gray-600 text-lg">
          Accept crypto payments seamlessly.
          <br />
          Built for modern Web3 merchants.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/login"
            className="px-6 py-3 rounded-md bg-gray-900 text-white hover:bg-gray-800 transition"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="px-6 py-3 rounded-md border border-gray-300 hover:border-gray-400 transition"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
