"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import Spinner from "../../components/ui/Spinner";
import { formatINR } from "../../lib/currency";
import { getProductNotifications } from "../../lib/notifications";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [products, categories, orders, notifications] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
          api.getAllOrders(),
          getProductNotifications().catch(() => []),
        ]);
        const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        setStats({
          products: products.length,
          categories: categories.length,
          orders: orders.length,
          notifications: Array.isArray(notifications) ? notifications.length : 0,
          revenue,
        });
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  if (!stats) return <Spinner />;

  const cards = [
    { label: "Products", value: stats.products },
    { label: "Categories", value: stats.categories },
    { label: "Orders", value: stats.orders },
    { label: "Notifications", value: stats.notifications || 0 },
    { label: "Revenue", value: formatINR(stats.revenue) },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
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
