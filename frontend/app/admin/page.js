"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import Spinner from "../../components/ui/Spinner";
import { formatINR } from "../../lib/currency";
import { getProductNotifications } from "../../lib/notifications";

function toArray(value, keys = []) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key];
  }

  return [];
}

function getOrderTotal(order) {
  const amount = Number(order?.total ?? order?.grandTotal ?? order?.amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function shouldSubtractFromActualRevenue(order) {
  const status = String(order?.status || "").trim().toLowerCase();
  const paymentStatus = String(order?.paymentStatus || "").trim().toLowerCase();

  return (
    status === "cancelled" ||
    status === "cancel" ||
    status === "returned" ||
    status === "return" ||
    status.startsWith("return-") ||
    status.startsWith("returned-") ||
    paymentStatus === "refunded"
  );
}

function getActualRevenue(orders) {
  return Math.max(
    0,
    toArray(orders).reduce((sum, order) => {
      const amount = getOrderTotal(order);
      return shouldSubtractFromActualRevenue(order) ? sum - amount : sum + amount;
    }, 0)
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const [productsResult, categoriesResult, ordersResult, notificationsResult, blogsResult, galleryResult, usersResult, reviewsResult] =
        await Promise.allSettled([
          api.getProducts(),
          api.getCategories(),
          api.getAllOrders(),
          getProductNotifications(),
          api.getBlogs(),
          api.getGalleryItems(),
          api.getAllUsers(),
          api.getReviews({ authRequired: true }),
        ]);

      if (!active) return;

      const products = toArray(productsResult.status === "fulfilled" ? productsResult.value : [], ["products", "data", "results"]);
      const categories = toArray(categoriesResult.status === "fulfilled" ? categoriesResult.value : [], ["categories", "data", "results"]);
      const orders = toArray(ordersResult.status === "fulfilled" ? ordersResult.value : [], ["orders", "data", "results"]);
      const notifications = toArray(notificationsResult.status === "fulfilled" ? notificationsResult.value : [], ["notifications", "data", "results"]);
      const blogs = toArray(blogsResult.status === "fulfilled" ? blogsResult.value : [], ["blogs", "data", "results"]);
      const gallery = toArray(galleryResult.status === "fulfilled" ? galleryResult.value : [], ["gallery", "items", "data", "results"]);
      const users = toArray(usersResult.status === "fulfilled" ? usersResult.value : [], ["users", "data", "results"]);
      const reviews = toArray(reviewsResult.status === "fulfilled" ? reviewsResult.value : [], ["reviews", "data", "results"]);

      setStats({
        products: products.length,
        categories: categories.length,
        orders: orders.length,
        notifications: notifications.length,
        revenue: orders.reduce((sum, order) => sum + getOrderTotal(order), 0),
        actualRevenue: getActualRevenue(orders),
        blogs: blogs.length,
        gallery: gallery.length,
        users: users.length,
        reviews: reviews.length,
      });
    })();

    return () => {
      active = false;
    };
  }, []);

  if (!stats) return <Spinner />;

  const cards = [
    { label: "Products", value: stats.products },
    { label: "Categories", value: stats.categories },
    { label: "Orders", value: stats.orders },
    { label: "Notifications", value: stats.notifications || 0 },
    { label: "Revenue", value: formatINR(stats.revenue) },
    { label: "Actual Revenue", value: formatINR(stats.actualRevenue) },
    { label: "Blogs", value: stats.blogs },
    { label: "Gallery", value: stats.gallery },
    { label: "Users", value: stats.users },
    { label: "Reviews", value: stats.reviews },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="border border-ink/10 p-6">
            <p className="text-xs tracking-widest uppercase text-ink/40">{c.label}</p>
            <p className="font-display text-3xl mt-2">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
