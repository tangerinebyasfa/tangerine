"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import OrderDetailsView from "../../../../components/order/OrderDetailsView";
import { api } from "../../../../lib/api";
import { ORDER_STATUSES, normalizeOrderStatus } from "../../../../lib/order";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-tangerine">Admin Order</p>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">Order Detail</h1>
        </div>
        <Link href="/admin/orders" className="inline-flex items-center gap-2 border border-ink/10 bg-white px-4 py-2 text-sm text-ink transition-colors hover:bg-sand">
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Link>
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
