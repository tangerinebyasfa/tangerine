"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import Spinner from "../../../components/ui/Spinner";

const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setOrders(await api.getAllOrders());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStatusChange(id, status) {
    try {
      await api.updateOrderStatus(id, status);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      toast.success("Order status updated");
    } catch (err) {
      toast.error(err.message || "Failed to update order");
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Orders</h1>

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <p className="text-ink/50 text-sm">No orders yet.</p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="border border-ink/10 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-ink/40">Order ID</p>
                  <p className="text-sm">{order.id}</p>
                  <p className="text-xs text-ink/40 mt-2">Customer</p>
                  <p className="text-sm">{order.userEmail}</p>
                </div>
                <label className="text-sm">
                  <span className="block text-xs tracking-widest uppercase text-ink/40 mb-2">
                    Status
                  </span>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className="input-field w-40"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
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
