"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "../lib/api";
import ProductCard from "../components/product/ProductCard";
import CategoryCard from "../components/product/CategoryCard";
import Spinner from "../components/ui/Spinner";

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cats, products] = await Promise.all([
          api.getCategories(),
          api.getProducts({ featured: "true" }),
        ]);
        setCategories(cats.slice(0, 3));
        setFeatured(products.slice(0, 8));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative border-b border-ink/10">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="eyebrow mb-4">Autumn / Winter Edit</p>
            <h1 className="font-display text-5xl md:text-7xl leading-[1.05] text-ink">
              Clothing that
              <br />
              <span className="italic">moves</span> with you.
            </h1>
            <p className="mt-6 text-ink/60 max-w-md">
              A small collection of considered essentials — cut from natural fibres,
              built to outlast the season they were made for.
            </p>
            <div className="mt-8 flex gap-4">
              <Link href="/products/all" className="btn-primary">Shop the Edit</Link>
              <Link href="/brand" className="btn-outline">Our Story</Link>
            </div>
          </div>
          <div className="relative aspect-[4/5] bg-sand">
            <Image
              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1000&q=80"
              alt="Model wearing a Tangerine outfit"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="eyebrow mb-2">Shop by Category</p>
            <h2 className="section-heading">Find your next piece</h2>
          </div>
          <Link href="/products/all" className="text-xs tracking-widest uppercase hidden md:block">
            View all →
          </Link>
        </div>

        {loading ? (
          <Spinner />
        ) : categories.length === 0 ? (
          <p className="text-ink/50 text-sm">
            No categories yet — add some from the admin panel to see them here.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        )}
      </section>

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-ink/10">
        <div className="mb-8">
          <p className="eyebrow mb-2">New Arrivals</p>
          <h2 className="section-heading">Fresh off the rail</h2>
        </div>

        {loading ? (
          <Spinner />
        ) : featured.length === 0 ? (
          <p className="text-ink/50 text-sm">
            No featured products yet — mark products as featured in the admin panel.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
