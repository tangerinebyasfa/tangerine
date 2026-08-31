"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Bell, Eye } from "lucide-react";
import Spinner from "../../../../components/ui/Spinner";
import { listenToProductNotifications } from "../../../../lib/notifications";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../../../lib/image";

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

export default function AdminNotificationDetailPage() {
  const { productId } = useParams();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenToProductNotifications(
      (items) => {
        const filtered = (Array.isArray(items) ? items : []).filter(
          (item) => String(item?.productId || "").trim() === String(productId || "").trim()
        );
        setNotifications(filtered);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setNotifications([]);
        setLoading(false);
      }
    );

    return () => unsubscribe?.();
  }, [productId]);

  const product = useMemo(() => {
    const first = notifications[0] || {};
    return {
      productId: String(first.productId || productId || "").trim(),
      productName: first.productName || "Product",
      productSlug: first.productSlug || "",
      productImage: first.productImage || "",
    };
  }, [notifications, productId]);

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  }, [notifications]);

  if (loading) return <Spinner className="min-h-[50vh]" />;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/notifications" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Back to notifications
          </Link>
          <p className="mt-3 text-xs uppercase tracking-[0.35em] text-tangerine">Admin Panel</p>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">{product.productName}</h1>
          <p className="mt-2 text-sm text-ink/55">{product.productId}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-ink/10 bg-white p-5 sm:col-span-2">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-16 overflow-hidden border border-ink/10 bg-sand">
              <Image
                src={normalizeImageUrl(product.productImage) || "/placeholder-product.svg"}
                alt={product.productName}
                fill
                className="object-cover"
                unoptimized={isGoogleDriveImageUrl(product.productImage)}
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-ink/40">Product</p>
              <p className="mt-2 font-display text-2xl text-ink">{product.productName}</p>
              {product.productSlug ? <p className="mt-1 text-sm text-ink/50">{product.productSlug}</p> : null}
            </div>
          </div>
        </div>
        <div className="border border-ink/10 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-ink/40">Clicks</p>
          <p className="mt-2 font-display text-3xl text-ink">{sortedNotifications.length}</p>
        </div>
      </div>

      {sortedNotifications.length === 0 ? (
        <div className="mt-8 border border-dashed border-ink/10 bg-white p-10 text-center">
          <Bell className="mx-auto h-10 w-10 text-ink/20" />
          <p className="mt-4 font-display text-2xl text-ink">No requests for this product yet</p>
          <p className="mt-2 text-sm leading-6 text-ink/55">
            When customers tap Notify Me, their name and user ID will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-widest text-ink/40">
                <th className="py-3 pl-4 pr-4">Customer</th>
                <th className="py-3 pr-4">User ID</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Requested At</th>
                <th className="py-3 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {sortedNotifications.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pl-4 pr-4">
                    <p className="font-medium text-ink">{item.userName || "Customer"}</p>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-ink/60">{item.userId}</td>
                  <td className="py-3 pr-4 text-ink/60">{item.userEmail || "-"}</td>
                  <td className="py-3 pr-4 text-ink/60">{formatDate(item.createdAt)}</td>
                  <td className="py-3 pr-4 text-right">
                    <span className="inline-flex items-center gap-2 border border-ink/10 bg-white px-4 py-2 text-sm text-ink/50">
                      <Eye className="h-4 w-4" />
                      Viewed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
