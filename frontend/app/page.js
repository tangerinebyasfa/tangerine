"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "../lib/api";
import { normalizeImageUrl } from "../lib/image";
import ProductCard from "../components/product/ProductCard";

const homeImages = [
  {
    desktop: "/Images/HomePage/1.png",
    mobile: "/Images/HomePage/1mobile.png",
    alt: "Homepage image 1",
  },
  {
    desktop: "/Images/HomePage/2.png",
    mobile: "/Images/HomePage/2mobile.png",
    alt: "Homepage image 2",
  },
  {
    desktop: "/Images/HomePage/3.png",
    mobile: "/Images/HomePage/3mobile.png",
    alt: "Homepage image 3",
  },
];

function HomepageImage({ desktop, mobile, alt, priority = false }) {
  return (
    <div className="w-full">
      <div className="hidden md:block">
        <Image
          src={desktop}
          alt={alt}
          width={1920}
          height={1080}
          className="block h-auto w-full object-cover"
          priority={priority}
        />
      </div>
      <div className="block md:hidden">
        <Image
          src={mobile}
          alt={alt}
          width={1200}
          height={1600}
          className="block h-auto w-full object-cover"
          priority={priority}
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let active = true;

    api
      .getProducts({ featured: "true" })
      .then((products) => {
        if (active) setFeaturedProducts(Array.isArray(products) ? products : []);
      })
      .catch((error) => {
        console.error(error);
        if (active) setFeaturedProducts([]);
      });

    api
      .getSubcategories()
      .then((items) => {
        if (active) setCategories(Array.isArray(items) ? items : []);
      })
      .catch((error) => {
        console.error(error);
        if (active) setCategories([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="w-full">
      <div className="flex flex-col">
        <Link href="/product/royal-blue-lace-co-ord-set" className="block">
          <HomepageImage
            desktop={homeImages[0].desktop}
            mobile={homeImages[0].mobile}
            alt={homeImages[0].alt}
            priority
          />
        </Link>

        {featuredProducts.length > 0 && (
          <section className="mx-auto w-[90%] py-14 md:w-4/5">
            <div className="mb-4 flex items-center justify-end">
              <Link
                href="/products/all"
                className="inline-flex items-center text-[11px] uppercase tracking-[0.16em] text-ink transition-colors hover:text-tangerine md:text-sm"
              >
                Show Now
              </Link>
            </div>

            <div className="md:hidden -mx-[5vw] overflow-x-auto px-[5vw] pb-2">
              <div className="flex snap-x snap-mandatory gap-4">
                {featuredProducts.map((product) => (
                  <div key={product.id} className="w-[72vw] shrink-0 snap-start">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden md:grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        <Link href="/product/bloomscape-high-low-maxi-dress" className="block">
          <HomepageImage
            desktop={homeImages[1].desktop}
            mobile={homeImages[1].mobile}
            alt={homeImages[1].alt}
          />
        </Link>

        {categories.length > 0 && (
          <section className="w-full py-14">
            <div className="mx-auto w-full max-w-[1920px] px-0">
              <div className="mb-5 flex items-end justify-between gap-4 px-5 md:px-0 md:mx-auto md:w-[90%] md:max-w-7xl md:w-4/5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-tangerine">Shop by category</p>
                  <h2 className="font-display text-3xl mt-2">Explore the edit</h2>
                </div>
                <Link
                  href="/products/all"
                  className="text-[11px] uppercase tracking-[0.16em] text-ink/60 transition-colors hover:text-tangerine md:text-sm"
                >
                  View all
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-0 md:grid-cols-4">
                {categories.slice(0, 4).map((category) => {
                  const image = normalizeImageUrl(category.image) || "/placeholder-category.svg";

                  return (
                    <Link
                      key={category.id}
                      href={`/products/${category.slug}`}
                      className="group relative block overflow-hidden bg-sand aspect-[3/4] md:aspect-[4/5]"
                    >
                      <Image
                        src={image}
                        alt={category.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                      <div className="absolute left-4 bottom-4 md:left-6 md:bottom-6">
                        <p className="font-display text-2xl md:text-3xl tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
                          {category.name}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <Link href="/product/crimson-cascade-high-low-skirt" className="block">
          <HomepageImage
            desktop={homeImages[2].desktop}
            mobile={homeImages[2].mobile}
            alt={homeImages[2].alt}
          />
        </Link>
      </div>
    </div>
  );
}






