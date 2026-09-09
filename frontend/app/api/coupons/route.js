import { proxyToBackend } from "../../../lib/serverApi";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
  try { return await proxyToBackend(request, `/coupons`); }
  catch { return Response.json({ error: "Coupon service unavailable. Please retry." }, { status: 503 }); }
}
export async function POST(request, { params }) {
  try { return await proxyToBackend(request, `/coupons`); }
  catch { return Response.json({ error: "Coupon service unavailable. Please retry." }, { status: 503 }); }
}
