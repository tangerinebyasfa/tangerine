import { proxyOrderRequest } from "../../../../lib/orderProxy";
export const dynamic = 'force-dynamic';
export async function PUT(request, { params }) { return proxyOrderRequest(request, `/returns/${encodeURIComponent(params.id)}`); }
