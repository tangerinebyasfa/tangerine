"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Filter, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { api } from "../../../lib/api";
import { formatINR } from "../../../lib/currency";
import { formatOrderDate, getOrderDisplayId, getOrderItemCount, normalizeOrderStatus } from "../../../lib/order";

const STATUS_OPTIONS = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];

function StatusBadge({ status }) {
  const value = normalizeOrderStatus(status);
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

  return <span className={`inline-flex border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${tone}`}>{value}</span>;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await api.getAllOrders();
        if (active) setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) {
          setError(err?.message || "Unable to load orders");
          setOrders([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const term = query.trim().toLowerCase();

    return orders.filter((order) => {
      const status = normalizeOrderStatus(order?.status);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!term) return true;

      const haystack = [
        getOrderDisplayId(order),
        order?.id,
        order?.customerName,
        order?.customerEmail,
        order?.customerPhone,
        order?.shippingAddressSummary,
        status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [orders, query, statusFilter]);

  async function handleDeleteOrder(order) {
    const confirmed = window.confirm(`Delete order ${getOrderDisplayId(order)}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(order.id);
    try {
      await api.deleteOrder(order.id);
      setOrders((prev) => prev.filter((item) => item.id !== order.id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId("");
    }
  }

  const totals = useMemo(
    () => ({
      all: orders.length,
      pending: orders.filter((order) => normalizeOrderStatus(order?.status) === "pending").length,
      active: orders.filter((order) => ["processing", "shipped"].includes(normalizeOrderStatus(order?.status))).length,
      delivered: orders.filter((order) => normalizeOrderStatus(order?.status) === "delivered").length,
    }),
    [orders]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-tangerine">Admin Panel</p>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">Orders</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">Search, filter, and inspect every customer order from a single place.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["All", totals.all],
            ["Pending", totals.pending],
            ["Active", totals.active],
            ["Delivered", totals.delivered],
          ].map(([label, value]) => (
            <div key={label} className="border border-ink/10 bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-ink/40">{label}</p>
              <p className="mt-1 font-display text-2xl text-ink">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-ink/10 bg-white p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
          <label className="flex items-center gap-3 border border-ink/10 px-4 py-3">
            <Search className="h-4 w-4 text-ink/40" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order ID, customer, email, or address"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
            />
          </label>

          <label className="flex items-center gap-3 border border-ink/10 px-4 py-3">
            <Filter className="h-4 w-4 text-ink/40" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full bg-transparent text-sm text-ink outline-none"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "All statuses" : status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-tangerine" />
        </div>
      ) : error ? (
        <div className="border border-rose-200 bg-rose-50 p-6 text-rose-700">
          <p className="font-medium">Could not load orders.</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="border border-dashed border-ink/10 bg-white p-8 text-center">
          <p className="font-display text-2xl text-ink">No matching orders</p>
          <p className="mt-2 text-sm leading-6 text-ink/55">Try a different search or remove the active filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const firstItem = items[0];
            return (
              <article key={order.id} className="border border-ink/10 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-display text-2xl text-ink">{getOrderDisplayId(order)}</h2>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink/55">
                      {order.customerName || "Customer"} · {order.customerEmail || "-"} · {formatOrderDate(order.createdAt)}
                    </p>
                    <p className="mt-2 text-sm text-ink/70">
                      {getOrderItemCount(order)} {getOrderItemCount(order) === 1 ? "item" : "items"} · {formatINR(Number(order.total || 0))}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {items.slice(0, 4).map((item, index) => (
                        <span key={`${order.id}-${item.productId || item.name || index}`} className="border border-ink/10 bg-[#fffaf6] px-2 py-1 text-xs text-ink/70">
                          {item.name || "Product"} x {item.quantity || 1}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="text-left sm:text-right">
                      <p className="text-xs uppercase tracking-[0.24em] text-ink/40">Shipping</p>
                      <p className="mt-1 max-w-sm text-sm leading-6 text-ink/65">{order.shippingAddressSummary || order.shippingAddress?.line1 || "—"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order)}
                      disabled={deletingId === order.id}
                      aria-label="Delete order"
                      title="Delete order"
                      className="inline-flex h-11 w-11 items-center justify-center border border-rose-200 bg-white text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <Link
                      href={`/admin/orders/${encodeURIComponent(order.id)}`}
                      aria-label="View order details"
                      title="View order details"
                      className="inline-flex h-11 w-11 items-center justify-center border border-tangerine/30 bg-white text-tangerine transition-colors hover:bg-tangerine hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
