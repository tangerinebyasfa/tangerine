"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../lib/image";
import { formatINR } from "../../lib/currency";
import { useCart } from "../../context/CartContext";
import WishlistButton from "../wishlist/WishlistButton";

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
  const secondaryImage = normalizeImageUrl(product.images?.[1]) || primaryImage;
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const href = `/product/${product.slug || slugify(product.name) || product.id}`;

  function handleQuickAdd(event) {
    event.preventDefault();
    event.stopPropagation();
    addItem(product, { quantity: 1 });
  }

  return (
    <article className="group block">
      <div className="relative">
        <Link href={href} className="block">
          <div className="relative aspect-[4/5] overflow-hidden bg-paper">
            <div className="absolute inset-0 flex w-[200%] transition-transform duration-700 ease-out motion-reduce:transition-none group-hover:-translate-x-1/2">
              <div className="relative h-full w-1/2 shrink-0">
                <Image
                  src={primaryImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                  unoptimized={isGoogleDriveImageUrl(primaryImage)}
                />
              </div>
              <div className="relative h-full w-1/2 shrink-0">
                <Image
                  src={secondaryImage || primaryImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                  unoptimized={isGoogleDriveImageUrl(secondaryImage || primaryImage)}
                />
              </div>
            </div>
            {onSale && (
              <span className="absolute left-0 top-0 bg-tangerine px-3 py-1.5 text-[10px] tracking-widest uppercase text-paper">
                Sale
              </span>
            )}
          </div>
        </Link>

        <div className="absolute right-3 top-3 z-10">
          <WishlistButton product={product} className="h-11 w-11 bg-white shadow-[0_10px_22px_rgba(0,0,0,0.08)]" />
        </div>

        <button
          type="button"
          aria-label="Quick add to bag"
          onClick={handleQuickAdd}
          className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white shadow-[0_10px_22px_rgba(0,0,0,0.08)] transition-colors hover:border-tangerine hover:text-tangerine"
        >
          <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      <Link href={href} className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] leading-5 uppercase tracking-[0.12em] text-ink transition-colors group-hover:text-tangerine">
            {product.name}
          </h3>
          {product.categorySlug && (
            <p className="mt-1 text-[11px] capitalize tracking-[0.08em] text-ink/55">
              {product.categorySlug}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[13px] leading-5 tracking-[0.04em] text-ink">{formatINR(product.price)}</p>
          {onSale && (
            <p className="text-[11px] leading-4 text-ink/40 line-through">
              {formatINR(product.compareAtPrice)}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
