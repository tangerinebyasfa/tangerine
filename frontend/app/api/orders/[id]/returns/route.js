import { proxyOrderRequest } from "../../../../../lib/orderProxy";
export const dynamic = 'force-dynamic';
export async function GET(request, { params }) { return proxyOrderRequest(request, `/orders/${encodeURIComponent(params.id)}/returns`); }
export async function POST(request, { params }) { return proxyOrderRequest(request, `/orders/${encodeURIComponent(params.id)}/returns`); }
