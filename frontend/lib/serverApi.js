function resolveConfiguredBackendBase() {
  const configured = (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL)?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      if (process.env.NODE_ENV === 'production' && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) return null;
      return configured.replace(/\/$/, '');
    } catch { return null; }
  }

  return process.env.NODE_ENV === "production" ? null : "http://localhost:5000/api";
}

export function resolveBackendUrl(path) {
  const base = resolveConfiguredBackendBase();
  if (!base) return null;
  return `${base}${path}`;
}

export async function proxyToBackend(request, path) {
  const url = resolveBackendUrl(path);
  if (!url) {
    throw new Error("Backend API URL is not configured.");
  }
  if (new URL(url).origin === new URL(request.url).origin) {
    throw new Error("Backend API URL must point to the Express service, not the frontend.");
  }

  const headers = {};
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");

  if (contentType) headers["Content-Type"] = contentType;
  if (authorization) headers.Authorization = authorization;

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

  const response = await fetch(url, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
    },
  });
}
