import { proxyOrderRequest } from "../../../lib/orderProxy";
export const dynamic = 'force-dynamic';
export async function GET(request, { params }) { return proxyOrderRequest(request, "/returns"); }
