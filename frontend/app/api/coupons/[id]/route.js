import { proxyToBackend } from "../../../../lib/serverApi";
export const dynamic = "force-dynamic";
export async function PUT(request, { params }) {
  try { return await proxyToBackend(request, `/coupons/${encodeURIComponent(params.id)}`); }
  catch { return Response.json({ error: "Coupon service unavailable. Please retry." }, { status: 503 }); }
}
export async function DELETE(request, { params }) {
  try { return await proxyToBackend(request, `/coupons/${encodeURIComponent(params.id)}`); }
  catch { return Response.json({ error: "Coupon service unavailable. Please retry." }, { status: 503 }); }
}
