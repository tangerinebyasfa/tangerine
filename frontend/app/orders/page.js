"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import AuthGuard from "../../components/auth/AuthGuard";
import PageHeader from "../../components/ui/PageHeader";
import Spinner from "../../components/ui/Spinner";

const statusColors = {
  pending: "bg-sand text-ink",
  processing: "bg-sage/20 text-sage",
  shipped: "bg-burgundy/10 text-burgundy",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setOrders(await api.getMyOrders());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner className="min-h-[40vh]" />;

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <PageHeader eyebrow="Account" title="My Orders" />

      {orders.length === 0 ? (
        <p className="text-ink/50 text-sm">You haven't placed any orders yet.</p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="border border-ink/10 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <p className="text-xs text-ink/40">Order ID</p>
                  <p className="text-sm">{order.id}</p>
                </div>
                <span className={`text-xs uppercase tracking-widest px-3 py-1 ${statusColors[order.status] || "bg-sand"}`}>
                  {order.status}
                </span>
              </div>

              <div className="divide-y divide-ink/10">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-2">
                    <span>
                      {item.name} × {item.quantity}
                      {item.size ? ` (Size ${item.size})` : ""}
                    </span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-base font-medium mt-4 pt-4 border-t border-ink/10">
                <span>Total</span>
                <span>${Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AuthGuard>
      <OrdersList />
    </AuthGuard>
  );
}
