"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, Eye } from "lucide-react";
import Spinner from "../../../components/ui/Spinner";
import { listenToProductNotifications } from "../../../lib/notifications";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../../lib/image";

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenToProductNotifications(
      (items) => {
        setNotifications(Array.isArray(items) ? items : []);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setNotifications([]);
        setLoading(false);
      }
    );

    return () => unsubscribe?.();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();

    for (const item of notifications) {
      const productId = String(item?.productId || item?.id || "").trim();
      if (!productId) continue;

      const current = map.get(productId) || {
        productId,
        productName: item.productName || "Product",
        productSlug: item.productSlug || "",
        productImage: item.productImage || "",
        count: 0,
        latestAt: null,
        users: [],
      };

      current.count += 1;
      current.users.push(item);

      if (!current.latestAt || toMillis(item.createdAt) > toMillis(current.latestAt)) {
        current.latestAt = item.createdAt;
      }

      map.set(productId, current);
    }

    return [...map.values()].sort((a, b) => toMillis(b.latestAt) - toMillis(a.latestAt));
  }, [notifications]);

  const totals = useMemo(() => {
    return {
      products: grouped.length,
      clicks: notifications.length,
      customers: new Set(notifications.map((item) => item.userId).filter(Boolean)).size,
    };
  }, [grouped.length, notifications]);

  if (loading) return <Spinner className="min-h-[50vh]" />;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-tangerine">Admin Panel</p>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
            Products that are sold out now collect Notify Me requests here, with each customer and click count visible.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-ink/10 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-ink/40">Products</p>
          <p className="mt-2 font-display text-3xl text-ink">{totals.products}</p>
        </div>
        <div className="border border-ink/10 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-ink/40">Clicks</p>
          <p className="mt-2 font-display text-3xl text-ink">{totals.clicks}</p>
        </div>
        <div className="border border-ink/10 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-ink/40">Customers</p>
          <p className="mt-2 font-display text-3xl text-ink">{totals.customers}</p>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="mt-8 border border-dashed border-ink/10 bg-white p-10 text-center">
          <Bell className="mx-auto h-10 w-10 text-ink/20" />
          <p className="mt-4 font-display text-2xl text-ink">No notifications yet</p>
          <p className="mt-2 text-sm leading-6 text-ink/55">
            Once a sold-out product gets a Notify Me click, it will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-widest text-ink/40">
                <th className="py-3 pl-4 pr-4">Product</th>
                <th className="py-3 pr-4">Clicks</th>
                <th className="py-3 pr-4">Latest Request</th>
                <th className="py-3 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {grouped.map((item) => {
                const thumb = normalizeImageUrl(item.productImage) || "/placeholder-product.svg";

                return (
                  <tr key={item.productId}>
                    <td className="py-3 pl-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-10 overflow-hidden border border-ink/10 bg-sand">
                          <Image
                            src={thumb}
                            alt={item.productName}
                            fill
                            className="object-cover"
                            unoptimized={isGoogleDriveImageUrl(item.productImage)}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-ink">{item.productName}</p>
                          <p className="mt-1 text-xs text-ink/45">{item.productId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-medium text-ink">{item.count}</td>
                    <td className="py-3 pr-4 text-ink/60">{formatDate(item.latestAt)}</td>
                    <td className="py-3 pr-4 text-right">
                      <Link
                        href={`/admin/notifications/${encodeURIComponent(item.productId)}`}
                        className="inline-flex items-center gap-2 border border-ink/10 bg-white px-4 py-2 text-sm text-ink transition-colors hover:bg-sand"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
