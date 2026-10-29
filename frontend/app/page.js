"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { api } from "../lib/api";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../lib/image";
import ProductCard from "../components/product/ProductCard";

const HOMEPAGE_CATEGORY_SLUGS = ["indian", "casual", "western", "corporate"];

const SWIPER_MOBILE_IMAGE = "/Images/HomePage/indian-dress-mob-new.jpeg";

const recentHomeImages = [
  {
    src: "/Images/HomePage/Banner/banner-1-new.png",
    mobile: "/Images/HomePage/Banner/mob-banner-1-new.png",
    alt: "Elegant trio in festive pink",
  },
  {
    src: "/Images/HomePage/Banner/banner-2-new.png",
    mobile: "/Images/HomePage/Banner/mob-banner-2.png",
    alt: "Dreamy red bridal portrait",
  },
  {
    src: "/Images/HomePage/Banner/banner-3-new.png",
    mobile:  "/Images/HomePage/Banner/mob-banner-3.png",
    alt: "Elegant Indian bridal portrait",
  },
  {
    src: "/Images/HomePage/Banner/banner-4-new.png",
    mobile: "/Images/HomePage/Banner/mob-banner-4.png",
    alt: "Festive collection",
  },
];

const homeImages = [
  {
    desktop: "/Images/HomePage/corporate-dress-new.jpeg",
    mobile: "/Images/HomePage/corporate-dress-mob-new.jpeg",
    alt: "Homepage image 1",
  },
  {
    desktop: "/Images/HomePage/indian-dress-new.jpeg",
    mobile: "/Images/HomePage/indian-dress-mob-new.jpeg",
    alt: "Homepage image 2",
  },
  {
    desktop: "/Images/HomePage/3.png",
    mobile: "/Images/HomePage/3mobile.png",
    alt: "Homepage image 3",
  },
  {
    desktop: "/Images/HomePage/western-dress-new.jpeg",
    mobile: "/Images/HomePage/western-dress-mob-new.jpeg",
    alt: "New Arrivals",
  },
];

function HomepageImage({ desktop, mobile, alt, priority = false }) {
  return (
    <div className="w-full max-w-[100vw] overflow-hidden">
      <div className="hidden xl:block">
        <Image
          src={desktop}
          alt={alt}
          width={1777}
          height={885}
          sizes="100vw"
          className="block h-auto w-full max-w-full object-contain"
          priority={priority}
        />
      </div>
      <div className="block xl:hidden">
        <Image
          src={mobile}
          alt={alt}
          width={941}
          height={1672}
          sizes="100vw"
          className="block h-auto w-full max-w-full object-contain"
          priority={priority}
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const featuredScrollRef = useRef(null);

  const homepageCategories = categories
    .filter((category) => HOMEPAGE_CATEGORY_SLUGS.includes(String(category.slug || "").trim().toLowerCase()))
    .sort(
      (a, b) =>
        HOMEPAGE_CATEGORY_SLUGS.indexOf(String(a.slug || "").trim().toLowerCase()) -
        HOMEPAGE_CATEGORY_SLUGS.indexOf(String(b.slug || "").trim().toLowerCase())
    );

  function scrollFeatured(direction) {
    const node = featuredScrollRef.current;
    if (!node) return;

    const amount = Math.max(320, Math.round(node.clientWidth * 0.72));
    node.scrollBy({ left: amount * direction, behavior: "smooth" });
  }

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
        console.log("Fetched categories:", items);
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
        <section className="relative w-full max-w-[100vw] overflow-hidden  mb-5 md:mb-10">
          <Swiper
            modules={[Pagination]}
            pagination={{ clickable: true }}
            grabCursor
            simulateTouch
            loop
            className="home-hero-swiper w-full"
          >
            {recentHomeImages.map((image, index) => (
              <SwiperSlide key={image.src}>
                <Link href="/products/indian" className="block max-w-full">
                  <Image
                    src={image.mobile}
                    alt={image.alt}
                    width={1024}
                    height={1536}
                    sizes="100vw"
                    draggable={false}
                    className="block h-[70vh] w-full select-none object-cover object-center md:hidden"
                    priority={index === 0}
                  />
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={1672}
                    height={940}
                    sizes="100vw"
                    draggable={false}
                    className="hidden h-full w-full select-none object-cover object-top md:block md:h-[calc(100vh-5rem)] xl:h-[calc(100vh-6rem)]"
                    priority={index === 0}
                  />
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>

          <style jsx global>{`
            .home-hero-swiper .swiper-pagination {
              bottom: 16px;
            }
            .home-hero-swiper .swiper-pagination-bullet {
              width: 8px;
              height: 8px;
              background: #ffffff;
              opacity: 0.55;
              transition: all 0.3s ease;
            }
            .home-hero-swiper .swiper-pagination-bullet-active {
              width: 24px;
              border-radius: 9999px;
              background: #ff6a00;
              opacity: 1;
            }
          `}</style>
        </section>

        {/* <Link href="/product/red-embroidered-anarkali-set" className="block max-w-full">
          <HomepageImage
            desktop={homeImages[1].desktop}
            mobile={homeImages[1].mobile}
            alt={homeImages[1].alt}
            priority
          />
        </Link> */}

        {featuredProducts.length > 0 && (
          <section className="mx-auto w-[96%] py-14 md:w-5/5">
            <div className="mb-4 flex items-center justify-end gap-4">
              <Link
                href="/products/all"
                className="ml-auto inline-flex items-center text-[11px] uppercase tracking-[0.16em] text-ink transition-colors hover:text-tangerine md:text-sm"
              >
                View All
              </Link>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => scrollFeatured(-1)}
                aria-label="Scroll featured products left"
                className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ink/10 bg-white text-ink shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-colors hover:border-tangerine hover:text-tangerine md:flex"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => scrollFeatured(1)}
                aria-label="Scroll featured products right"
                className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ink/10 bg-white text-ink shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-colors hover:border-tangerine hover:text-tangerine md:flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <div
                ref={featuredScrollRef}
                className="-mx-[5vw] overflow-x-auto px-[5vw] pb-2 md:mx-0 md:px-0 md:pb-4 no-scrollbar"
              >
                <div className="flex snap-x snap-mandatory gap-4 md:gap-6 lg:gap-8">
                  {featuredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="w-[78vw] shrink-0 snap-start sm:w-[58vw] md:w-[34vw] lg:w-[26vw] xl:w-[17.7vw]"
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <Link href="/products/western" className="block max-w-full">
          <HomepageImage
            desktop={homeImages[3].desktop}
            mobile={homeImages[3].mobile}
            alt={homeImages[3].alt}
          />
        </Link>



        <Link href="/products/corporate" className="block max-w-full mt-14">
          <HomepageImage
            desktop={homeImages[0].desktop}
            mobile={homeImages[0].mobile}
            alt={homeImages[0].alt}
          />
        </Link>


        {homepageCategories.length > 0 && (
          <section className="w-full py-14 pb-0">
            <div className="mx-auto w-full max-w-[1920px] px-0">
              <div className="mb-5 flex items-end justify-between gap-4 px-5 md:px-0 md:mx-auto md:w-[95%] md:max-w-8xl md:w-4/5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-tangerine">Shop by category</p>
                  <h2 className="font-display text-3xl mt-2">Explore Our Collections</h2>
                </div>
                <Link
                  href="/products/all"
                  className="text-[11px] uppercase tracking-[0.16em] text-ink/60 transition-colors hover:text-tangerine md:text-sm"
                >
                  View all
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-0 md:grid-cols-4">
                {homepageCategories.map((category) => {
                  const image = normalizeImageUrl(category.image) || "/placeholder-category.svg";

                  return (
                    <Link
                      key={category.id}
                      href={`/products/${category.slug}`}
                      className="group relative block overflow-hidden bg-sand aspect-[3/4] md:aspect-[4/5]"
                    >

                      <Image
                        src={image === '/api/image?url=https%3A%2F%2Fdrive.google.com%2Fuc%3Fexport%3Dview%26id%3D1izE6gH_1lWdyFkZYvdGz7ayqj7tDBFnT' ? '/api/image?url=https%3A%2F%2Fdrive.google.com%2Fuc%3Fexport%3Dview%26id%3D1SOoL5-j6NkBwnOPA4QHjOGOGe3-GaZnO' : image}
                        alt={category.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        unoptimized={isGoogleDriveImageUrl(image)}
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

        {/* <Link href="/product/crimson-cascade-high-low-skirt" className="block max-w-full">
          <HomepageImage
            desktop={homeImages[2].desktop}
            mobile={homeImages[2].mobile}
            alt={homeImages[2].alt}
          />
        </Link> */}
      </div>
    </div>
  );
}







