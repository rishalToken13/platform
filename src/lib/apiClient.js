// src/lib/apiClient.js
const TOKEN_KEY = "token13_token";

export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

export async function apiFetch(path, opts = {}) {
  const {
    method = "GET",
    body,
    auth = true,
    headers = {},
  } = opts;

  const finalHeaders = { ...headers };

  // ✅ attach auth token
  if (auth) {
    const token = getToken();
    if (token) finalHeaders.authorization = `Bearer ${token}`;
  }

  // ✅ JSON encode plain objects
  let finalBody = body;
  const isPlainObject =
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer);

  if (isPlainObject) {
    finalHeaders["content-type"] = finalHeaders["content-type"] || "application/json";
    finalBody = JSON.stringify(body);
  }

  const res = await fetch(path, {
    method,
    headers: finalHeaders,
    body: finalBody,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `Request failed (${res.status})`);
  }

  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }

  // your API returns { ok:true, data:{...} }
  return json.data ?? json;
}
