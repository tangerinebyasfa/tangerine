"use client";

import Link from "next/link";
import Image from "next/image";
import { formatINR } from "../../lib/currency";
import {
  formatOrderDateTime,
  formatOrderItemLabel,
  getOrderDisplayId,
  getOrderItemCount,
  summarizeShippingAddress,
} from "../../lib/order";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../lib/image";

function StatusBadge({ status }) {
  const value = String(status || "pending").toLowerCase();
  const tone =
    value === "delivered"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "shipped"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : value === "processing"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : value === "cancelled"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-ink/10 bg-sand text-ink/70";

  return (
    <span className={`inline-flex border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] ${tone}`}>
      {value}
    </span>
  );
}

export default function OrderDetailsView({
  order,
  title,
  subtitle,
  actions,
  showCustomer = false,
  showStatusHistory = true,
  extraSummary = null,
  footer = null,
}) {
  const displayOrderId = getOrderDisplayId(order);
  const shippingAddress = order?.shippingAddress || {};
  const items = Array.isArray(order?.items) ? order.items : [];
  const itemCount = getOrderItemCount(order);
  const statusHistory = Array.isArray(order?.statusHistory) ? order.statusHistory : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs tracking-[0.35em] text-tangerine uppercase">{title}</p>
          <h1 className="font-display text-4xl text-ink sm:text-5xl">{displayOrderId || "Order"}</h1>
          {subtitle ? <p className="max-w-2xl text-sm leading-6 text-ink/60 sm:text-base">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="border border-ink/10 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-ink/40">Order Date</p>
          <p className="mt-2 font-medium text-ink">{formatOrderDateTime(order?.createdAt)}</p>
        </div>
        <div className="border border-ink/10 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-ink/40">Items</p>
          <p className="mt-2 font-medium text-ink">{itemCount} item{itemCount === 1 ? "" : "s"}</p>
        </div>
        <div className="border border-ink/10 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-ink/40">Payment</p>
          <p className="mt-2 font-medium text-ink">{String(order?.paymentMethod || "cod").toUpperCase()}</p>
          <p className="mt-1 text-sm text-ink/55">{String(order?.paymentStatus || "pending")}</p>
        </div>
        <div className="border border-ink/10 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-ink/40">Status</p>
          <div className="mt-2">
            <StatusBadge status={order?.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="border border-ink/10 bg-white p-4 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-2xl text-ink">Shipping Address</p>
              <p className="mt-1 text-sm text-ink/55">Where the order will be delivered</p>
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-ink/40">Address</span>
          </div>
          <p className="text-sm leading-7 text-ink/75">{summarizeShippingAddress(shippingAddress) || "No address available."}</p>
          {shippingAddress?.phone ? <p className="mt-3 text-sm text-ink/60">Phone: {shippingAddress.phone}</p> : null}
          {showCustomer ? (
            <div className="mt-5 grid gap-3 border-t border-ink/10 pt-5 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Customer</p>
                <p className="mt-1 font-medium text-ink">{order?.customerName || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Email</p>
                <p className="mt-1 break-words font-medium text-ink">{order?.customerEmail || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Phone</p>
                <p className="mt-1 font-medium text-ink">{order?.customerPhone || "-"}</p>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="space-y-6">
          <section className="border border-ink/10 bg-white p-4 sm:p-6">
            <div className="mb-4">
              <p className="font-display text-2xl text-ink">Payment & Totals</p>
              <p className="mt-1 text-sm text-ink/55">Order value breakdown</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-ink/70">
                <span>Subtotal</span>
                <span>{formatINR(Number(order?.subtotal || 0))}</span>
              </div>
              <div className="flex justify-between text-ink/70">
                <span>Shipping</span>
                <span>{formatINR(Number(order?.shipping || 0))}</span>
              </div>
              {order?.couponCode || order?.discountCode ? (
                <>
                  <div className="flex justify-between text-emerald-700">
                    <span>Coupon Code</span>
                    <span>{order.couponCode || order.discountCode}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Coupon Discount</span>
                    <span>- {formatINR(Number(order.couponDiscountAmount ?? order.discount ?? 0))}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-ink/70">
                  <span>Discount</span>
                  <span>- {formatINR(Number(order?.discount || 0))}</span>
                </div>
              )}
              <div className="border-t border-ink/10 pt-3">
                <div className="flex justify-between text-base font-medium text-ink">
                  <span>Final Total</span>
                  <span>{formatINR(Number(order?.total || 0))}</span>
                </div>
              </div>
            </div>
            {extraSummary}
          </section>

          {showStatusHistory && statusHistory.length ? (
            <section className="border border-ink/10 bg-white p-4 sm:p-6">
              <p className="font-display text-2xl text-ink">Status History</p>
              <div className="mt-4 space-y-3">
                {statusHistory.map((entry, index) => (
                  <div key={`${entry.status || "status"}-${index}`} className="border-l border-ink/10 pl-4">
                    <p className="font-medium text-ink">{String(entry.status || "").toUpperCase()}</p>
                    <p className="mt-1 text-sm text-ink/55">{formatOrderDateTime(entry.at)}</p>
                    {entry.note ? <p className="mt-1 text-sm text-ink/65">{entry.note}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      <section className="border border-ink/10 bg-white p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-2xl text-ink">Order Items</p>
            <p className="mt-1 text-sm text-ink/55">Product breakdown, quantities, and line totals</p>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Total {itemCount} item{itemCount === 1 ? "" : "s"}</p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[1.8fr_0.7fr_0.5fr_0.7fr] gap-4 border-b border-ink/10 pb-3 text-xs uppercase tracking-[0.2em] text-ink/40">
              <div>Product</div>
              <div>Size / Color</div>
              <div>Qty</div>
              <div className="text-right">Price</div>
            </div>
            <div className="divide-y divide-ink/10">
              {items.map((item, index) => {
                const image = normalizeImageUrl(item.productImage || item.image || "") || "/placeholder-product.svg";
                return (
                  <div key={`${item.productId || index}-${index}`} className="grid grid-cols-[1.8fr_0.7fr_0.5fr_0.7fr] gap-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 overflow-hidden border border-ink/10 bg-[#fff7f0]">
                        <Image
                          src={image}
                          alt={item.productName || item.name || "Product"}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                          unoptimized={isGoogleDriveImageUrl(image)}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-ink">{item.productName || item.name || "Product"}</p>
                        <p className="mt-1 text-sm text-ink/55">{item.productSlug ? <Link href={`/product/${item.productSlug}`} className="text-tangerine">View product</Link> : formatOrderItemLabel(item)}</p>
                      </div>
                    </div>
                    <div className="text-sm text-ink/70">{item.size || "-" }{item.color ? ` / ${item.color}` : ""}</div>
                    <div className="text-sm text-ink/70">{item.quantity}</div>
                    <div className="text-right text-sm font-medium text-ink">{formatINR(Number(item.lineTotal || (item.unitPrice || 0) * Number(item.quantity || 0)))}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {footer}
    </div>
  );
}
