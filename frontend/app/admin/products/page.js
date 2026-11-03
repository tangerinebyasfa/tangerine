"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import Spinner from "../../../components/ui/Spinner";
import Button from "../../../components/ui/Button";
import { formatINR } from "../../../lib/currency";

const PRODUCTS_PER_PAGE = 20;

function ProductCardMobile({ product, stockValue, saving, onStockChange, onStockShift, onStockSave, onDelete }) {
  return (
    <article className="border border-ink/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{product.name}</h3>
          <p className="mt-1 font-mono text-xs text-ink/60">{product.internalCode || "—"}</p>
        </div>
        <p className="shrink-0 text-sm text-ink">{formatINR(product.price)}</p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="uppercase tracking-widest text-ink/40">Type</dt>
          <dd className="mt-0.5 capitalize text-ink/70">
            {product.productType || product.categoryParentType || "—"}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-widest text-ink/40">Category</dt>
          <dd className="mt-0.5 capitalize text-ink/70">{product.categorySlug || "—"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-widest text-ink/40">Featured</dt>
          <dd className="mt-0.5 text-ink/70">{product.featured ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-widest text-ink/40">Stock</dt>
          <dd className="mt-0.5 text-ink/70">{stockValue}</dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-ink/10 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onStockShift(-1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-ink/10 bg-white text-lg leading-none text-ink transition-colors hover:bg-sand"
            aria-label={`Decrease stock for ${product.name}`}
          >
            -
          </button>
          <input
            type="number"
            min="0"
            step="1"
            value={stockValue}
            onChange={(event) => onStockChange(event.target.value)}
            className="w-20 border border-ink/10 bg-white px-2 py-1 text-sm text-ink outline-none transition-colors focus:border-tangerine"
            aria-label={`Stock for ${product.name}`}
          />
          <button
            type="button"
            onClick={() => onStockShift(1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-ink/10 bg-white text-lg leading-none text-ink transition-colors hover:bg-sand"
            aria-label={`Increase stock for ${product.name}`}
          >
            +
          </button>
          <button
            type="button"
            onClick={onStockSave}
            disabled={saving}
            className="ml-1 rounded border border-ink bg-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-burgundy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving" : "Update"}
          </button>
          {Number(stockValue) === 0 ? (
            <p className="inline-flex rounded-full border border-burgundy/15 bg-burgundy/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-burgundy">
              Sold out
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-4 border-t border-ink/10 pt-4 text-sm">
        <Link href={`/admin/products/${product.id}/edit`} className="text-burgundy">
          Edit
        </Link>
        <button onClick={onDelete} className="text-ink/50 hover:text-burgundy">
          Delete
        </button>
      </div>
    </article>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockDrafts, setStockDrafts] = useState({});
  const [savingStockIds, setSavingStockIds] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) =>
      [product.name, product.internalCode, product.productType || product.categoryParentType, product.categorySlug]
        .some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [products, search]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

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

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="font-display text-3xl">Products</h1>
        <Link href="/admin/products/new">
          <Button>Add Product</Button>
        </Link>
      </div>

      <div className="mb-6">
        <label htmlFor="product-search" className="sr-only">Search products</label>
        <input
          id="product-search"
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by name, code, type, or category"
          className="w-full max-w-md border border-ink/20 bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink/40 focus:border-burgundy"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <p className="text-ink/50 text-sm">No products yet. Add your first one.</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-ink/50 text-sm">No products match your search.</p>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {paginatedProducts.map((p) => (
              <ProductCardMobile
                key={p.id}
                product={p}
                stockValue={stockDrafts[p.id] ?? p.stock ?? 0}
                saving={savingStockIds.has(p.id)}
                onStockChange={(value) => updateDraftStock(p.id, value)}
                onStockShift={(delta) => shiftDraftStock(p.id, delta)}
                onStockSave={() => saveStock(p.id)}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
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
                {paginatedProducts.map((p) => (
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

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
            <p className="text-sm text-ink/60">
              Showing {(currentPage - 1) * PRODUCTS_PER_PAGE + 1}–{Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} products
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="border border-ink/20 px-4 py-2 text-sm transition-colors hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-ink/60">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="border border-ink/20 px-4 py-2 text-sm transition-colors hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
