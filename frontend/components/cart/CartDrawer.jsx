"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Trash2, Minus, Plus } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { api } from "../../lib/api";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../lib/image";
import { formatINR } from "../../lib/currency";

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildProductHref(product) {
  return `/product/${product.slug || product.id}`;
}

export default function CartDrawer() {
  const { items, isDrawerOpen, setDrawerOpen, updateQuantity, removeItem, subtotal } = useCart();
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!isDrawerOpen) return undefined;

    let active = true;

    api
      .getProducts({ featured: "true" })
      .then((products) => {
        if (!active) return;

        const currentProductIds = new Set(items.map((item) => item.productId));
        const nextSuggestions = (Array.isArray(products) ? products : [])
          .filter((product) => !currentProductIds.has(product.id))
          .slice(0, 4);

        setSuggestions(nextSuggestions);
      })
      .catch((error) => {
        console.error(error);
        if (active) setSuggestions([]);
      });

    return () => {
      active = false;
    };
  }, [isDrawerOpen, items]);

  return (
    <>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setDrawerOpen(false)} />
      )}

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full transform flex-col bg-paper shadow-2xl transition-transform duration-300 sm:w-[420px] ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-ink/10 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-ink/40">Cart</p>
            <h2 className="font-display text-2xl leading-none text-ink mt-1">
              Your Cart {items.length > 0 ? `(${items.length})` : ""}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="mt-1 text-ink/70 transition-colors hover:text-ink"
            aria-label="Close cart"
          >
            <X className="h-6 w-6" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4">
            {items.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-ink/55">Your cart is empty.</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ink/35">
                  Add a few considered pieces to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {items.map((item) => (
                  <div key={item.lineId} className="flex gap-4 border-b border-ink/10 pb-5">
                    <Link
                      href={`/product/${item.productId}`}
                      onClick={() => setDrawerOpen(false)}
                      className="relative h-28 w-[88px] shrink-0 overflow-hidden bg-sand"
                    >
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="88px"
                          className="object-cover"
                          unoptimized={isGoogleDriveImageUrl(item.image)}
                        />
                      ) : null}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] uppercase tracking-[0.08em] text-ink">
                            {item.name}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-ink">
                            {formatINR(item.price)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.lineId)}
                          className="text-ink/45 transition-colors hover:text-burgundy"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                        </button>
                      </div>

                      <div className="mt-2 space-y-1">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-ink/45">
                          {item.size ? `Size: ${item.size}` : "Size: One size"}
                          {item.color ? `  Ã‚Â·  ${item.color}` : ""}
                        </p>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-ink/45">
                          Quantity: {item.quantity}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center border border-ink/15 text-ink transition-colors hover:bg-sand"
                          onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" strokeWidth={2} />
                        </button>
                        <span className="min-w-8 text-center text-sm text-ink/80">{item.quantity}</span>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center border border-ink/15 text-ink transition-colors hover:bg-sand"
                          onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <section className="border-t border-ink/10 px-5 py-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[12px] uppercase tracking-[0.18em] text-ink">You may also like</h3>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-ink" />
                  <span className="h-2 w-2 rounded-full bg-ink/30" />
                  <span className="h-2 w-2 rounded-full bg-ink/30" />
                  <span className="h-2 w-2 rounded-full bg-ink/30" />
                </div>
              </div>

              <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <div className="flex gap-3">
                  {suggestions.map((product) => {
                    const image = normalizeImageUrl(product.images?.[0]) || "/placeholder-product.svg";

                    return (
                      <Link
                        key={product.id}
                        href={buildProductHref(product)}
                        onClick={() => setDrawerOpen(false)}
                        className="group w-40 shrink-0"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden bg-sand">
                          <Image
                            src={image}
                            alt={product.name}
                            fill
                            sizes="160px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            unoptimized={isGoogleDriveImageUrl(image)}
                          />
                          {/*  */}
                        </div>
                        <p className="mt-2 truncate text-[12px] uppercase tracking-[0.08em] text-ink">
                          {stripHtml(product.name)}
                        </p>
                        <p className="text-[12px] text-ink/70">{formatINR(product.price)}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-ink/10 px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="uppercase tracking-[0.14em] text-ink/55">Subtotal</span>
              <span className="font-semibold text-ink">{formatINR(subtotal)}</span>
            </div>
            <p className="mt-2 text-xs text-ink/45">Shipping and taxes calculated at checkout.</p>
            <Link
              href="/checkout"
              onClick={() => setDrawerOpen(false)}
              className="mt-4 flex h-14 w-full items-center justify-center bg-ink text-sm uppercase tracking-[0.22em] text-paper transition-colors hover:bg-burgundy"
            >
              Checkout
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
