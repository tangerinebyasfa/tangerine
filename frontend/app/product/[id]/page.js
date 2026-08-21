"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { api } from "../../../lib/api";
import { useCart } from "../../../context/CartContext";
import { formatINR } from "../../../lib/currency";
import { normalizeImageUrl } from "../../../lib/image";

function pickImage(images) {
  return normalizeImageUrl(images?.[0]) || "/placeholder-product.svg";
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setLoading(true);
    api
      .getProduct(id)
      .then((data) => {
        if (active) setProduct(data);
      })
      .catch((error) => {
        console.error(error);
        if (active) setProduct(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-[90%] items-center justify-center py-16 md:w-4/5">
        <p className="text-sm tracking-[0.12em] uppercase text-ink/50">Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto w-[90%] py-16 md:w-4/5">
        <p className="text-sm tracking-[0.12em] uppercase text-ink/50">Product not found.</p>
        <Link href="/products/all" className="mt-4 inline-flex text-sm uppercase tracking-[0.12em] text-tangerine">
          Back to shop
        </Link>
      </div>
    );
  }

  const image = pickImage(product.images);
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;

  return (
    <div className="mx-auto w-[90%] py-10 md:w-4/5 md:py-14">
      <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-start">
        <div className="relative aspect-[4/5] overflow-hidden bg-paper">
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          {onSale && (
            <span className="absolute left-0 top-0 bg-tangerine px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-paper">
              Sale
            </span>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45">
              {product.categorySlug || product.category || "Product"}
            </p>
            <h1 className="mt-3 font-display text-3xl leading-tight text-ink md:text-5xl">
              {product.name}
            </h1>
          </div>

          <div className="flex items-end gap-3">
            <p className="text-2xl font-medium tracking-[0.04em] text-ink">
              {formatINR(product.price)}
            </p>
            {onSale && (
              <p className="pb-1 text-sm text-ink/40 line-through">
                {formatINR(product.compareAtPrice)}
              </p>
            )}
          </div>

          {product.description && (
            <p className="max-w-xl text-sm leading-7 text-ink/70">
              {product.description}
            </p>
          )}

          {Array.isArray(product.availableAt) && product.availableAt.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45">Available At</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.availableAt.map((outlet) => (
                  <span
                    key={outlet}
                    className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-xs uppercase tracking-[0.12em] text-ink/70"
                  >
                    {outlet}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => addItem(product, { quantity: 1 })}
              className="inline-flex items-center gap-2 bg-ink px-5 py-3 text-xs uppercase tracking-[0.16em] text-paper transition-colors hover:bg-tangerine"
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={2} />
              Add to Cart
            </button>
            <Link
              href="/products/all"
              className="inline-flex items-center px-5 py-3 text-xs uppercase tracking-[0.16em] text-ink/70 transition-colors hover:text-tangerine"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

