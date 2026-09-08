"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, PackageCheck } from "lucide-react";
import AuthGuard from "../../../components/auth/AuthGuard";
import OrderReturns from "../../../components/order/OrderReturns";
import OrderDetailsView from "../../../components/order/OrderDetailsView";
import { api } from "../../../lib/api";

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.id ? String(params.id) : "";
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  async function cancelOrder() {
    if (cancelling || !window.confirm("Cancel this order? You will not need to pay.")) return;
    setCancelling(true);
    try { setOrder(await api.cancelOrder(order.id)); toast.success("Order cancelled. No payment is due."); }
    catch (err) { toast.error(err.message); }
    finally { setCancelling(false); }
  }

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

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-tangerine" />
          </div>
        ) : error ? (
          <div className="border border-rose-200 bg-rose-50 p-6 text-rose-700">
            <p className="font-medium">Could not load this order.</p>
            <p className="mt-1 text-sm">{error}</p>
            <div className="mt-4">
              <Link href="/profile#orders" className="inline-flex items-center gap-2 border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700">
                <ArrowLeft className="h-4 w-4" />
                Back to orders
              </Link>
            </div>
          </div>
        ) : order ? (
          <OrderDetailsView
            order={order}
            title="Order Details"
            subtitle="This is the full receipt for your purchase, including shipping and item breakdown."
            actions={[
              ["pending", "processing"].includes(order.status) ? <button key="cancel" type="button" disabled={cancelling} onClick={cancelOrder} className="border border-rose-200 px-4 py-2 text-sm text-rose-700 disabled:opacity-50">{cancelling ? "Cancelling?" : "Cancel order"}</button> : null,
              <Link key="back" href="/profile#orders" className="inline-flex items-center gap-2 border border-ink/10 bg-white px-4 py-2 text-sm text-ink transition-colors hover:bg-sand">
                <ArrowLeft className="h-4 w-4" />
                Back to profile
              </Link>,
            ]}
            footer={<>
              <OrderReturns orderId={order.id} onChange={() => api.getOrder(order.id).then(setOrder).catch(() => {})} />
              <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="flex items-start gap-3">
                  <PackageCheck className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-medium">Need help with this order?</p>
                    <p className="mt-1 text-emerald-700">
                      Reach out to support if you need an invoice, delivery update, or order change assistance.
                    </p>
                  </div>
                </div>
              </div>
            </>}
          />
        ) : null}
      </div>
    </AuthGuard>
  );
}
