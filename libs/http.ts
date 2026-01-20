export function jsonResponse(
  data: unknown,
  init: number | ResponseInit = 200,
): Response {
  const responseInit: ResponseInit = typeof init === "number"
    ? { status: init }
    : init;
  const headers = new Headers(responseInit.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Response(JSON.stringify(data), { ...responseInit, headers });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}
