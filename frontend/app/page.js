"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "../lib/api";
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

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="w-full">
      <div className="flex flex-col">
        <HomepageImage
          desktop={homeImages[0].desktop}
          mobile={homeImages[0].mobile}
          alt={homeImages[0].alt}
          priority
        />

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

        {homeImages.slice(1).map((image) => (
          <HomepageImage
            key={image.desktop}
            desktop={image.desktop}
            mobile={image.mobile}
            alt={image.alt}
          />
        ))}
      </div>
    </div>
  );
}
