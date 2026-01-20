// src/lib/cors.js

const DEFAULT_ALLOWED_ORIGIN = process.env.PAYMENT_APP_ORIGIN || "http://localhost:5173";

export function applyCorsHeaders(headers) {
  headers.set("Access-Control-Allow-Origin", DEFAULT_ALLOWED_ORIGIN);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "content-type, authorization");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

export function corsResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  applyCorsHeaders(headers);

  return new Response(body, {
    ...init,
    headers,
  });
}

export function corsJson(data, status = 200) {
  return corsResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
