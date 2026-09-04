"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import OrderDetailsView from "../../../../components/order/OrderDetailsView";
import { api } from "../../../../lib/api";
import { formatOrderDateTime, getOrderDisplayId, ORDER_STATUSES, normalizeOrderStatus, summarizeShippingAddress } from "../../../../lib/order";
import { formatINR } from "../../../../lib/currency";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id ? String(params.id) : "";
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      if (!orderId) return;

      setLoading(true);
      setError("");
      try {
        const data = await api.getOrder(orderId);
        if (!active) return;
        setOrder(data);
        setStatus(normalizeOrderStatus(data?.status));
      } catch (err) {
        if (active) {
          setError(err?.message || "Unable to load order");
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

  const dirty = useMemo(() => normalizeOrderStatus(order?.status) !== normalizeOrderStatus(status), [order?.status, status]);

  async function handleSaveStatus() {
    if (!order?.id || !dirty) return;

    setSaving(true);
    try {
      const updated = await api.updateOrderStatus(order.id, status);
      setOrder(updated);
      setStatus(normalizeOrderStatus(updated?.status));
      toast.success("Order status updated");
    } catch (err) {
      toast.error(err?.message || "Unable to update status");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOrder() {
    const confirmed = window.confirm(
      `Delete order ${order?.orderId || order?.id}? This cannot be undone.`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await api.deleteOrder(order.id);
      toast.success("Order deleted");
      router.push("/admin/orders");
    } catch (err) {
      toast.error(err?.message || "Unable to delete order");
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadInvoice() {
    if (!order) return;

    const invoiceWindow = window.open("", "_blank", "width=900,height=700");
    if (!invoiceWindow) {
      toast.error("Please allow pop-ups to download the invoice");
      return;
    }

    const displayOrderId = getOrderDisplayId(order) || "Order";
    const shippingAddress = order.shippingAddress || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const itemRows = items.map((item) => `
      <tr>
        <td>${escapeHtml(item.productName || item.name || "Product")}</td>
        <td>${escapeHtml([item.size, item.color].filter(Boolean).join(" / ") || "-")}</td>
        <td>${escapeHtml(item.quantity || 0)}</td>
        <td class="amount">${escapeHtml(formatINR(Number(item.lineTotal || (item.unitPrice || 0) * Number(item.quantity || 0))))}</td>
      </tr>
    `).join("");

    invoiceWindow.document.write(`<!doctype html>
      <html><head><title>Invoice ${escapeHtml(displayOrderId)}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 40px; color: #111; font: 14px Arial, sans-serif; }
        .invoice { max-width: 820px; margin: 0 auto; }
        header { display: flex; justify-content: space-between; border-bottom: 2px solid #ff6a00; padding-bottom: 24px; }
        h1 { margin: 0 0 8px; font: 38px Georgia, serif; }
        h2 { margin: 0 0 10px; font: 22px Georgia, serif; }
        .muted { color: #666; line-height: 1.6; }
        .orange { color: #ff6a00; text-transform: uppercase; letter-spacing: 3px; font-size: 11px; }
        .logo { display: block; width: 170px; height: auto; margin-bottom: 14px; }
        .meta { text-align: right; }
        .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin: 32px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { color: #666; font-size: 11px; letter-spacing: 1px; text-align: left; text-transform: uppercase; }
        th, td { border-bottom: 1px solid #ddd; padding: 13px 8px; }
        .amount { text-align: right; }
        .totals { margin: 22px 0 0 auto; max-width: 300px; }
        .total { border-top: 2px solid #111; font-size: 17px; font-weight: bold; }
        .totals div { display: flex; justify-content: space-between; padding: 7px 0; }
        footer { border-top: 1px solid #ddd; margin-top: 50px; padding-top: 18px; text-align: center; color: #777; }
        @media print { body { padding: 0; } }
      </style></head><body><main class="invoice">
        <header><div><img class="logo" src="/Images/logo.png" alt="Tangerine" /><h1>Invoice</h1><div class="muted">Thank you for your order.</div></div>
          <div class="meta"><strong>${escapeHtml(displayOrderId)}</strong><div class="muted">${escapeHtml(formatOrderDateTime(order.createdAt))}</div></div></header>
        <div class="columns"><section><div class="orange">Bill To</div><h2>${escapeHtml(order.customerName || shippingAddress.fullName || "Customer")}</h2><div class="muted">${escapeHtml(order.customerEmail || "")}</div><div class="muted">${escapeHtml(order.customerPhone || shippingAddress.phone || "")}</div></section>
          <section><div class="orange">Ship To</div><div class="muted">${escapeHtml(summarizeShippingAddress(shippingAddress) || "No address available.")}</div></section></div>
        <table><thead><tr><th>Product</th><th>Size / Color</th><th>Qty</th><th class="amount">Price</th></tr></thead><tbody>${itemRows}</tbody></table>
        <div class="totals"><div><span>Subtotal</span><span>${escapeHtml(formatINR(Number(order.subtotal || 0)))}</span></div>${order.couponCode || order.discountCode ? `<div><span>Coupon Code</span><span>${escapeHtml(order.couponCode || order.discountCode)}</span></div><div><span>Coupon Discount</span><span>- ${escapeHtml(formatINR(Number(order.couponDiscountAmount ?? order.discount ?? 0)))}</span></div>` : `<div><span>Discount</span><span>- ${escapeHtml(formatINR(Number(order.discount || 0)))}</span></div>`}<div><span>Shipping</span><span>${escapeHtml(formatINR(Number(order.shipping || 0)))}</span></div><div class="total"><span>Final Total</span><span>${escapeHtml(formatINR(Number(order.total || 0)))}</span></div></div>
        <footer>Payment method: ${escapeHtml(String(order.paymentMethod || "COD").toUpperCase())} | Payment status: ${escapeHtml(order.paymentStatus || "pending")}</footer>
      </main><script>window.onload = function () { window.print(); };</script></body></html>`);
    invoiceWindow.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-tangerine">Admin Order</p>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">Order Detail</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {order ? (
            <button type="button" onClick={handleDownloadInvoice} className="inline-flex items-center gap-2 border border-tangerine bg-tangerine px-4 py-2 text-sm text-white transition-colors hover:bg-tangerine-dark">
              <Download className="h-4 w-4" />
              Download Invoice
            </button>
          ) : null}
          <Link href="/admin/orders" className="inline-flex items-center gap-2 border border-ink/10 bg-white px-4 py-2 text-sm text-ink transition-colors hover:bg-sand">
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-tangerine" />
        </div>
      ) : error ? (
        <div className="border border-rose-200 bg-rose-50 p-6 text-rose-700">
          <p className="font-medium">Could not load this order.</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : order ? (
        <div className="space-y-6">
          <div className="border border-ink/10 bg-white p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-ink/40">Safe update</p>
                <p className="text-sm text-ink/60">Change the order status only after reviewing the full order details below.</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-ink/40">Status</span>
                  <select
                    value={status}
                    onChange={(event) => setStatus(normalizeOrderStatus(event.target.value))}
                    className="min-w-[220px] border border-ink/15 bg-white px-4 py-3 text-sm text-ink outline-none"
                  >
                    {ORDER_STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={handleSaveStatus}
                  disabled={saving || !dirty}
                  className="inline-flex items-center justify-center gap-2 bg-tangerine px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-tangerine-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Status
                </button>

                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  disabled={saving}
                  aria-label="Delete order"
                  title="Delete order"
                  className="inline-flex h-11 w-11 items-center justify-center border border-rose-200 bg-white text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <OrderDetailsView order={order} title="Full Order" subtitle="Complete customer, delivery, payment, and product information." showCustomer />

          <div className="border border-ink/10 bg-white p-4 sm:p-6">
            <p className="font-display text-2xl text-ink">Admin Notes</p>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              Use the status selector above to keep Firestore and the storefront aligned. All status changes are written through the secure update endpoint.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
