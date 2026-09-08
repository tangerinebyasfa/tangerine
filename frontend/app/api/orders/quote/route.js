import { proxyOrderRequest } from "../../../../lib/orderProxy";
export const dynamic = "force-dynamic";
export async function POST(request, { params }) { return proxyOrderRequest(request, "/orders/quote"); }
