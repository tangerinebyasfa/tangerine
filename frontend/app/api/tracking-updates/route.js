import { NextResponse } from "next/server";
import { resolveBackendUrl } from "../../../lib/serverApi";

export const dynamic = "force-dynamic";

// Shiprocket sends tracking webhooks here (Auth Token Type: x-api-key). The
// public path stays free of Shiprocket's banned keywords. Forward the request
// body and the x-api-key header to the Express backend's webhook route.
export async function POST(request) {
  const backend = resolveBackendUrl("/webhooks/tracking-updates");
  if (!backend) {
    return NextResponse.json({ error: "Backend API URL is not configured." }, { status: 503 });
  }

  const headers = {};
  const contentType = request.headers.get("content-type");
  const apiKey = request.headers.get("x-api-key");
  if (contentType) headers["Content-Type"] = contentType;
  if (apiKey) headers["x-api-key"] = apiKey;

  const body = await request.text();

  try {
    const response = await fetch(backend, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Tracking webhook processing failed" }, { status: 500 });
  }
}