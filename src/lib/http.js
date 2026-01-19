export function ok(data, status = 200) {
  return Response.json({ ok: true, data }, { status });
}

export function bad(message, status = 400, details) {
  return Response.json({ ok: false, error: message, details }, { status });
}
