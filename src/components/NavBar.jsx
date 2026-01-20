"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const hideNav = pathname === "/login" || pathname === "/register";

  function logout() {
    localStorage.removeItem("token13_token"); // make sure key matches yours
    router.replace("/login");
  }

  if (hideNav) return null;

  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          token13 Merchant
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="hover:text-gray-700 transition">
            Dashboard
          </Link>

          <Link href="/orders" className="hover:text-gray-700 transition">
            Orders
          </Link>

          <button
            onClick={logout}
            className="px-4 py-2 border rounded-md hover:bg-gray-100 transition"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
