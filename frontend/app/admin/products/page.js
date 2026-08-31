"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import Spinner from "../../../components/ui/Spinner";
import Button from "../../../components/ui/Button";
import { formatINR } from "../../../lib/currency";

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockDrafts, setStockDrafts] = useState({});
  const [savingStockIds, setSavingStockIds] = useState(() => new Set());

  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  async function load() {
    setLoading(true);
    try {
      const items = await api.getProducts();
      setProducts(items);
      setStockDrafts(
        Object.fromEntries(items.map((product) => [product.id, String(Number(product.stock ?? 0))]))
      );
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

  function getDraftStock(productId) {
    const draft = stockDrafts[productId];
    if (draft === undefined || draft === null || draft === "") {
      return Number(productsById.get(productId)?.stock ?? 0);
    }

    const parsed = Number(draft);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function updateDraftStock(productId, nextValue) {
    setStockDrafts((current) => ({
      ...current,
      [productId]: String(Math.max(0, Number(nextValue) || 0)),
    }));
  }

  function shiftDraftStock(productId, delta) {
    const current = getDraftStock(productId);
    updateDraftStock(productId, current + delta);
  }

  async function saveStock(productId) {
    const nextStock = getDraftStock(productId);
    if (Number.isNaN(nextStock) || nextStock < 0) {
      toast.error("Please enter a valid stock amount.");
      return;
    }

    setSavingStockIds((current) => new Set(current).add(productId));
    try {
      const updated = await api.updateProduct(productId, { stock: nextStock });
      setProducts((current) => current.map((product) => (product.id === productId ? updated : product)));
      setStockDrafts((current) => ({ ...current, [productId]: String(Number(updated.stock ?? nextStock)) }));
      toast.success("Stock updated");
    } catch (err) {
      toast.error(err.message || "Failed to update stock");
    } finally {
      setSavingStockIds((current) => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
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
                <th className="py-3 pr-4">Code</th>
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
                  <td className="py-3 pr-4 font-mono text-xs text-ink/60">{p.internalCode || "—"}</td>
                  <td className="py-3 pr-4 capitalize text-ink/60">{p.productType || p.categoryParentType || "—"}</td>
                  <td className="py-3 pr-4 capitalize">{p.categorySlug || "—"}</td>
                  <td className="py-3 pr-4">{formatINR(p.price)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => shiftDraftStock(p.id, -1)}
                        className="flex h-8 w-8 items-center justify-center border border-ink/10 bg-white text-lg leading-none text-ink transition-colors hover:bg-sand"
                        aria-label={`Decrease stock for ${p.name}`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={stockDrafts[p.id] ?? p.stock ?? 0}
                        onChange={(event) => updateDraftStock(p.id, event.target.value)}
                        className="w-20 border border-ink/10 bg-white px-2 py-1 text-sm text-ink outline-none transition-colors focus:border-tangerine"
                        aria-label={`Stock for ${p.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => shiftDraftStock(p.id, 1)}
                        className="flex h-8 w-8 items-center justify-center border border-ink/10 bg-white text-lg leading-none text-ink transition-colors hover:bg-sand"
                        aria-label={`Increase stock for ${p.name}`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => saveStock(p.id)}
                        disabled={savingStockIds.has(p.id)}
                        className="ml-1 rounded border border-ink bg-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-burgundy disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingStockIds.has(p.id) ? "Saving" : "Update"}
                      </button>
                    </div>
                    {Number(stockDrafts[p.id] ?? p.stock ?? 0) === 0 ? (
                      <p className="mt-2 inline-flex rounded-full border border-burgundy/15 bg-burgundy/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-burgundy">
                        Sold out
                      </p>
                    ) : null}
                  </td>
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
