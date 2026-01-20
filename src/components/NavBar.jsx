// src/components/NavBar.jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/apiClient";

export default function NavBar() {
  const router = useRouter();

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="w-full border-b bg-white">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-semibold">
          token13 Merchant
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm hover:underline">
            Dashboard
          </Link>
          <Link href="/register" className="text-sm hover:underline">
            Register
          </Link>
          <Link href="/login" className="text-sm hover:underline">
            Login
          </Link>
          <button
            onClick={logout}
            className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
