// src/lib/requireAuth.js
import { getToken } from "@/lib/apiClient";

export function requireAuth(router) {
  const token = getToken();
  if (!token) router.push("/login");
}
