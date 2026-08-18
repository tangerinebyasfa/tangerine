"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import Spinner from "../../../components/ui/Spinner";
import Button from "../../../components/ui/Button";
import { formatINR } from "../../../lib/currency";

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setProducts(await api.getProducts());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    try {
      await api.deleteProduct(id);
      toast.success("Product deleted");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Products</h1>
        <Link href="/admin/products/new">
          <Button>Add Product</Button>
        </Link>
      </div>

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <p className="text-ink/50 text-sm">No products yet. Add your first one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-ink/10 text-xs uppercase tracking-widest text-ink/40">
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Price</th>
                <th className="py-3 pr-4">Stock</th>
                <th className="py-3 pr-4">Featured</th>
                <th className="py-3 pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 pr-4">{p.name}</td>
                  <td className="py-3 pr-4 capitalize text-ink/60">{p.productType || p.categoryParentType || "—"}</td>
                  <td className="py-3 pr-4 capitalize">{p.categorySlug || "—"}</td>
                  <td className="py-3 pr-4">{formatINR(p.price)}</td>
                  <td className="py-3 pr-4">{p.stock}</td>
                  <td className="py-3 pr-4">{p.featured ? "Yes" : "No"}</td>
                  <td className="py-3 pr-4 text-right space-x-4 whitespace-nowrap">
                    <Link href={`/admin/products/${p.id}/edit`} className="text-burgundy">
                      Edit
                    </Link>
                    <button onClick={() => handleDelete(p.id)} className="text-ink/50 hover:text-burgundy">
                      Delete
                    </button>
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
