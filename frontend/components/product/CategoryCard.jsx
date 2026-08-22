"use client";

import Link from "next/link";
import Image from "next/image";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../lib/image";

export default function CategoryCard({ category }) {
  const image = normalizeImageUrl(category.image) || "/placeholder-category.svg";

  return (
    <Link href={`/products/${category.slug}`} className="group relative block overflow-hidden">
      <div className="relative aspect-[4/5] bg-sand">
        <Image
          src={image}
          alt={category.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized={isGoogleDriveImageUrl(image)}
        />
        <div className="absolute inset-0 bg-ink/20 group-hover:bg-ink/35 transition-colors" />
      </div>
      <div className="absolute bottom-0 left-0 p-6">
        <h3 className="font-display text-2xl text-paper">{category.name}</h3>
        <span className="text-xs tracking-widest uppercase text-paper/80 mt-1 inline-block border-b border-paper/60 group-hover:border-paper">
          Shop now
        </span>
      </div>
    </Link>
  );
}

