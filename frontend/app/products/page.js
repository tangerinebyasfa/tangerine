"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Image from "next/image";
import Spinner from "../../components/ui/Spinner";
import { api } from "../../lib/api";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../lib/image";

const MAIN_CATEGORIES = [
  {
    key: "clothes",
    title: "Clothes",
    description: "Dresses, skirts, co-ords, and every clothing edit in one place.",
    href: "/products/clothes",
    image: "/Images/HomePage/1.png",
  },
  {
    key: "accessories",
    title: "Accessories",
    description: "Finishing pieces and styling extras to complete the look.",
    href: "/products/accessories",
    image: "/Images/HomePage/2.png",
  },
  {
    key: "footwear",
    title: "Footwear",
    description: "Step into the footwear edit with every size and style.",
    href: "/products/footwear",
    image: "/Images/HomePage/3.png",
  },
  {
    key: "outlet",
    title: "Outlet",
    description: "Outlet stories, location details, and special offers.",
    href: "/products/outlet",
    image: normalizeImageUrl("https://drive.google.com/file/d/1Vnq7R6KcCC83SSksmoJLgmQj_dK2M2n7/view?usp=sharing"),
  },
];

function CategoryHeroCard({ category }) {
  return (
    <Link
      href={category.href}
      className="group relative overflow-hidden border border-ink/10 bg-paper shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[4/5] bg-sand">
        <Image
          src={category.image}
          alt={category.title}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority={category.key === "clothes"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-paper/75">Browse Category</p>
          <h3 className="mt-2 font-display text-3xl leading-tight text-white">{category.title}</h3>
          <p className="mt-2 text-sm leading-6 text-paper/80">{category.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-ink/10 px-4 py-4">
        <span className="text-xs uppercase tracking-[0.18em] text-ink/60">Open category</span>
        <ArrowRight className="h-4 w-4 text-tangerine transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function SubcategoryCard({ item }) {
  const image = normalizeImageUrl(item.image) || "/placeholder-category.svg";

  return (
    <Link
      href={`/products/${item.slug}`}
      className="group relative block overflow-hidden border border-ink/10 bg-paper"
    >
      <div className="relative aspect-[3/4] bg-sand">
        <Image
          src={image}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized={isGoogleDriveImageUrl(image)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-paper/70">
            {String(item.parentType || "Category").replace(/^\w/, (char) => char.toUpperCase())}
          </p>
          <h3 className="mt-2 font-display text-2xl leading-tight text-white">{item.name}</h3>
        </div>
      </div>
    </Link>
  );
}

export default function ProductsPage() {
  const [subcategories, setSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSubcategories() {
      setLoadingSubcategories(true);
      try {
        const data = await api.getSubcategories();
        if (active) setSubcategories(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        if (active) setSubcategories([]);
      } finally {
        if (active) setLoadingSubcategories(false);
      }
    }

    loadSubcategories();

    return () => {
      active = false;
    };
  }, []);

  const groupedSubcategories = useMemo(() => {
    const groups = {
      clothes: [],
      accessories: [],
      footwear: [],
    };

    (Array.isArray(subcategories) ? subcategories : []).forEach((item) => {
      const key = String(item.parentType || "").toLowerCase();
      if (groups[key]) groups[key].push(item);
    });

    return groups;
  }, [subcategories]);

  const categoryCards = useMemo(
    () =>
      MAIN_CATEGORIES.map((category) => {
        const fallbackImage = category.image;
        const grouped = groupedSubcategories[category.key] || [];
        const dynamicImage =
          normalizeImageUrl(grouped[0]?.image) ||
          normalizeImageUrl(grouped[0]?.images?.[0]) ||
          fallbackImage;

        return {
          ...category,
          image: dynamicImage,
        };
      }),
    [groupedSubcategories]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Shop"
        title="Shop by Category"
        description="Choose a category to jump into the matching product page. Each category page will show only the products for that section."
      />

      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {categoryCards.map((category) => (
          <CategoryHeroCard key={category.key} category={category} />
        ))}
      </div>

      <section className="mt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-tangerine">Subcategories</p>
            <h2 className="font-display text-3xl mt-2">Explore the edit</h2>
          </div>
          <Link
            href="/products/all"
            className="text-[11px] uppercase tracking-[0.16em] text-ink/60 transition-colors hover:text-tangerine md:text-sm"
          >
            View all
          </Link>
        </div>

        {loadingSubcategories ? (
          <div className="border border-ink/10 bg-white p-8">
            <Spinner />
          </div>
        ) : subcategories.length === 0 ? (
          <div className="border border-dashed border-ink/10 bg-white p-8 text-sm text-ink/50">
            No subcategories found yet.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {subcategories.map((item) => (
              <SubcategoryCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
