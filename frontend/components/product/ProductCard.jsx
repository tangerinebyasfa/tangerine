"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { normalizeImageUrl } from "../../lib/image";
import { formatINR } from "../../lib/currency";
import { useCart } from "../../context/CartContext";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const primaryImage = normalizeImageUrl(product.images?.[0]) || "/placeholder-product.svg";
  const secondaryImage = normalizeImageUrl(product.images?.[1]);
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const href = `/product/${product.slug || slugify(product.name) || product.id}`;

  function handleQuickAdd(event) {
    event.preventDefault();
    event.stopPropagation();
    addItem(product, { quantity: 1 });
  }

  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-paper">
        <div className="absolute inset-0 flex w-[200%] transition-transform duration-700 ease-out motion-reduce:transition-none group-hover:-translate-x-1/2">
          <div className="relative h-full w-1/2 shrink-0">
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />
          </div>
          <div className="relative h-full w-1/2 shrink-0">
            <Image
              src={secondaryImage || primaryImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />
          </div>
        </div>
        {onSale && (
          <span className="absolute top-0 left-0 bg-tangerine text-paper text-[10px] tracking-widest uppercase px-3 py-1.5">
            Sale
          </span>
        )}
        <button
          type="button"
          aria-label="Quick add to bag"
          onClick={handleQuickAdd}
          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm transition-colors hover:bg-tangerine hover:text-paper"
        >
          <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] leading-5 uppercase tracking-[0.12em] text-ink group-hover:text-tangerine transition-colors truncate">
            {product.name}
          </h3>
          {product.categorySlug && (
            <p className="text-[11px] tracking-[0.08em] text-ink/55 mt-1 capitalize">
              {product.categorySlug}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[13px] tracking-[0.04em] text-ink leading-5">{formatINR(product.price)}</p>
          {onSale && (
            <p className="text-[11px] text-ink/40 line-through leading-4">
              {formatINR(product.compareAtPrice)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}


