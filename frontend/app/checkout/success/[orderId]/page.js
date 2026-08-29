"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Gift,
  Loader2,
  MapPin,
  Package2,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Wallet,
} from "lucide-react";
import AuthGuard from "../../../../components/auth/AuthGuard";
import { api } from "../../../../lib/api";
import { formatINR } from "../../../../lib/currency";
import { formatOrderDateTime, getOrderDisplayId, summarizeShippingAddress } from "../../../../lib/order";

function InfoCard({ icon: Icon, title, children, accent = false }) {
  return (
    <div
      className={[
        "flex items-start gap-3 px-3 py-4 sm:px-4",
        accent ? "bg-[#fffaf6]" : "",
      ].join(" ")}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center text-tangerine">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        <div className="mt-1 text-sm leading-6 text-ink/65">{children}</div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  const params = useParams();
  const orderId = params?.orderId ? String(params.orderId) : "";
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      if (!orderId) return;

      setLoading(true);
      setError("");
      try {
        const data = await api.getOrder(orderId);
        if (active) setOrder(data);
      } catch (err) {
        if (active) {
          setError(err?.message || "Unable to load your order");
          setOrder(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [orderId]);

  const displayOrderId = getOrderDisplayId(order);
  const shippingAddress = order?.shippingAddress || {};
  const shippingSummary = summarizeShippingAddress(shippingAddress) || "Your shipping address";
  const orderDate = formatOrderDateTime(order?.createdAt);
  const itemCount = Array.isArray(order?.items) ? order.items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0) : 0;
  const subtotal = Number(order?.subtotal || 0);
  const shipping = Number(order?.shipping || 0);
  const discount = Number(order?.discount || 0);
  const total = Number(order?.total || 0);
  const paymentMethod = String(order?.paymentMethod || "cod").toLowerCase() === "cod" ? "Cash on Delivery" : "Online Payment";
  const paymentDetails = order?.paymentProvider ? `${paymentMethod} (${order.paymentProvider})` : paymentMethod;
  const shippingMethod = shipping > 0 ? "Standard Delivery" : "Free Shipping";
  const shippingEta = shipping > 0 ? "3 - 5 business days" : "Free";

  return (
    <AuthGuard>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-tangerine" />
          </div>
        ) : error ? (
          <div className="border border-rose-200 bg-rose-50 p-6 text-rose-700">
            <p className="font-medium">Your order was placed, but we could not load the receipt right now.</p>
            <p className="mt-1 text-sm">{error}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/profile#orders"
                className="inline-flex items-center gap-2 border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700"
              >
                <ShoppingBag className="h-4 w-4" />
                View My Orders
              </Link>
              <Link
                href="/products/all"
                className="inline-flex items-center gap-2 border border-ink/10 bg-white px-4 py-2 text-sm font-medium text-ink"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : order ? (
          <div className="border border-ink/10 bg-white/90 shadow-[0_18px_60px_rgba(17,17,17,0.05)]">
            <div className="border-b border-ink/10 px-4 py-6 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-3xl space-y-4">
                  <p className="text-xs uppercase tracking-[0.34em] text-tangerine">Order Confirmed</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div>
                      <h1 className="font-display text-4xl text-ink sm:text-5xl">Thank You!</h1>
                      <p className="mt-1 text-2xl font-display text-emerald-700 sm:text-[2.15rem]">
                        Your order has been placed successfully.
                      </p>
                    </div>
                  </div>
                  <p className="max-w-2xl text-sm leading-7 text-ink/70 sm:text-base">
                    We have received your order and it is now being processed. You will receive an email confirmation shortly.
                  </p>
                </div>

                <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <Gift className="mt-0.5 h-5 w-5 text-emerald-700" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">Order ID</p>
                    <p className="truncate font-display text-xl text-emerald-700">{displayOrderId || order.orderId || order.id}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-6 sm:px-6 lg:px-8">
              <div className="grid gap-0 border border-ink/10 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard icon={Package2} title="Order Date">
                  {orderDate}
                </InfoCard>
                <div className="border-t border-ink/10 md:border-t-0 md:border-l">
                  <InfoCard icon={MapPin} title="Shipping Address">
                    {shippingSummary}
                  </InfoCard>
                </div>
                <div className="border-t border-ink/10 xl:border-t-0 xl:border-l">
                  <InfoCard icon={Truck} title="Delivery Method">
                    <span className="block">{shippingMethod}</span>
                    <span className="block text-emerald-700">{shippingEta === "Free" ? "FREE" : shippingEta}</span>
                  </InfoCard>
                </div>
                <div className="border-t border-ink/10 xl:border-t-0 xl:border-l">
                  <InfoCard icon={Wallet} title="Payment Method">
                    {paymentDetails}
                  </InfoCard>
                </div>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
                <div className="border border-ink/10 bg-[#fffaf6] p-4 sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-ink/40">Order Summary</p>
                      <h2 className="mt-1 font-display text-2xl text-ink">What you ordered</h2>
                    </div>
                    <p className="text-sm text-ink/55">
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>

                  <div className="mt-5 space-y-3">
                    {(order.items || []).map((item, index) => (
                      <div key={`${item.productId || item.name || "item"}-${index}`} className="flex items-start gap-3 border border-ink/10 bg-white p-3">
                        <div className="grid h-14 w-14 shrink-0 place-items-center bg-sand text-[10px] uppercase tracking-[0.2em] text-ink/40">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-ink">{item.productName || item.name || "Product"}</p>
                          <p className="mt-1 text-sm text-ink/55">
                            {item.size ? `Size: ${item.size}` : "One size"}
                            {item.color ? ` | ${item.color}` : ""}
                          </p>
                          <p className="mt-1 text-sm text-ink/55">Qty: {item.quantity}</p>
                        </div>
                        <p className="shrink-0 font-medium text-ink">{formatINR(Number(item.lineTotal || 0))}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 border-t border-ink/10 pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between text-ink/70">
                        <span>Subtotal</span>
                        <span>{formatINR(subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-ink/70">
                        <span>Shipping</span>
                        <span>{shipping > 0 ? formatINR(shipping) : "FREE"}</span>
                      </div>
                      <div className="flex items-center justify-between text-ink/70">
                        <span>Discount</span>
                        <span>- {formatINR(discount)}</span>
                      </div>
                      <div className="border-t border-ink/10 pt-3">
                        <div className="flex items-center justify-between text-base font-medium text-ink">
                          <span>Total Paid</span>
                          <span>{formatINR(total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border border-ink/10 bg-white p-4 sm:p-6">
                    <p className="text-center text-lg text-ink">What would you like to do next?</p>
                    <div className="mt-6 space-y-3">
                      <Link
                        href="/profile#orders"
                        className="inline-flex w-full items-center justify-center gap-2 border border-tangerine/30 bg-white px-4 py-3 text-sm font-medium text-tangerine transition-colors hover:bg-tangerine hover:text-white"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        View My Orders
                      </Link>
                      <Link
                        href="/products/all"
                        className="inline-flex w-full items-center justify-center gap-2 bg-tangerine px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-tangerine-dark"
                      >
                        <Gift className="h-4 w-4" />
                        Continue Shopping
                      </Link>
                    </div>
                  </div>

                  <div className="border border-ink/10 bg-[#fffaf6] p-4 sm:p-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-tangerine" />
                        <div>
                          <p className="font-medium text-ink">Secure Payments</p>
                          <p className="mt-1 text-sm leading-6 text-ink/60">100% safe & encrypted</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Package2 className="mt-0.5 h-5 w-5 text-tangerine" />
                        <div>
                          <p className="font-medium text-ink">Easy Returns</p>
                          <p className="mt-1 text-sm leading-6 text-ink/60">7 days return policy</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Truck className="mt-0.5 h-5 w-5 text-tangerine" />
                        <div>
                          <p className="font-medium text-ink">Free Shipping</p>
                          <p className="mt-1 text-sm leading-6 text-ink/60">On selected orders</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
