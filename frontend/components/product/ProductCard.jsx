"use client";

import Link from "next/link";
import Image from "next/image";

export default function ProductCard({ product }) {
  const image = product.images?.[0] || "/placeholder-product.svg";
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;

  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-sand">
        <Image
          src={image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {onSale && (
          <span className="absolute top-3 left-3 bg-burgundy text-paper text-[10px] tracking-widest uppercase px-2 py-1">
            Sale
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm text-ink group-hover:text-burgundy transition-colors">
            {product.name}
          </h3>
          {product.categorySlug && (
            <p className="text-xs text-ink/50 mt-1 capitalize">{product.categorySlug}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm text-ink">${Number(product.price).toFixed(2)}</p>
          {onSale && (
            <p className="text-xs text-ink/40 line-through">
              ${Number(product.compareAtPrice).toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
