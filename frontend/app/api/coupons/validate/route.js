import { proxyToBackend } from "../../../../lib/serverApi";
export const dynamic = "force-dynamic";
export async function POST(request, { params }) {
  try { return await proxyToBackend(request, `/coupons/validate`); }
  catch { return Response.json({ error: "Coupon service unavailable. Please retry." }, { status: 503 }); }
}
