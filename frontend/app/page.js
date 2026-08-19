"use client";

import { useEffect, useState } from "react";
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
          <section className="mx-auto py-14 w-90% md:w-80%">
            {/* <div className="flex items-end justify-between gap-4 mb-8"> */}
              <div>
                {/* <p className="eyebrow mb-2">Featured</p> */}
                {/* <h2 className="font-display text-3xl md:text-4xl">Featured Products</h2> */}
              </div>
              {/* <p className="text-sm text-ink/50">Selected from the current edit.</p> */}
            {/* </div> */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
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
