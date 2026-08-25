function resolveConfiguredBackendBase() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

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
  });

  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
    },
  });
}
