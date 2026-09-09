import { proxyToBackend } from "../../../../lib/serverApi";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
  try { return await proxyToBackend(request, `/coupons/valid${new URL(request.url).search}`); }
  catch { return Response.json({ error: "Coupon service unavailable. Please retry." }, { status: 503 }); }
}
