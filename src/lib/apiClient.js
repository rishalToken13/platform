// src/lib/apiClient.js

const TOKEN_KEY = "token13_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = new Headers(options.headers || {});
  headers.set("accept", "application/json");

  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  // ✅ attach bearer token for all api calls if present
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore non-json
  }

  if (!res.ok) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }

  if (json && json.ok === false) {
    throw new Error(json.error || "Request failed");
  }

  // your API shape: { ok:true, data:{...} }
  return json?.data ?? json;
}
