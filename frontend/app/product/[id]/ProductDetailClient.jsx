"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../../lib/image";
import { formatINR } from "../../../lib/currency";
import { useCart } from "../../../context/CartContext";
import Button from "../../../components/ui/Button";
import Spinner from "../../../components/ui/Spinner";
import ProductCard from "../../../components/product/ProductCard";

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

export default function ProductDetailClient({ initialProduct = null, relatedProducts = [] }) {
  const { id } = useParams();
  const router = useRouter();
  const { addItem } = useCart();

  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [activeImage, setActiveImage] = useState(0);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState({});
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [openSection, setOpenSection] = useState("");

  useEffect(() => {
    setProduct(initialProduct);
    setLoading(!initialProduct);
    setActiveImage(0);
    setMainImageLoaded(false);
    setThumbLoaded({});
    setSize(null);
    setColor(null);
    setOpenSection("");
  }, [initialProduct]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getProduct(id);
        setProduct(data);
        const availableSizes = getAvailableSizeLabels(data);
        if (availableSizes.length) setSize(availableSizes[0]);
        if (data.colors?.length) setColor(data.colors[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!product?.images?.length || product.images.length < 2) return undefined;

    const interval = setInterval(() => {
      setActiveImage((current) => (current + 1) % product.images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [product?.images?.length]);

  useEffect(() => {
    setMainImageLoaded(false);
  }, [activeImage]);

  useEffect(() => {
    setThumbLoaded({});
  }, [product?.images]);

  if (loading) return <Spinner className="min-h-[60vh]" />;
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center text-ink/50">
        Product not found.
      </div>
    );
  }

  const images = product.images?.length
    ? product.images.map((image) => normalizeImageUrl(image)).filter(Boolean)
    : ["/placeholder-product.svg"];
  const displayImages = images.length ? images : ["/placeholder-product.svg"];
  const sizeOptions = getSizeOptions(product);
  const hasCompareAtPrice =
    typeof product.compareAtPrice === "number" && product.compareAtPrice > product.price;
  const discountPercent = hasCompareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  function getSizeOptions(productData) {
    const selectedSizes = new Set(
      Array.isArray(productData?.sizes) ? productData.sizes.map((size) => String(size).trim()) : []
    );

    const structuredSizes = Array.isArray(productData?.sizeOptions) ? productData.sizeOptions : [];

    return DEFAULT_SIZES.map((size) => {
      const structured = structuredSizes.find((item) => item?.label === size);
      if (structured) {
        return {
          label: size,
          available: !!structured.available,
        };
      }

      return {
        label: size,
        available: selectedSizes.has(size),
      };
    });
  }

  function getAvailableSizeLabels(productData) {
    return getSizeOptions(productData)
      .filter((item) => item.available)
      .map((item) => item.label);
  }

  function handleAddToCart() {
    addItem(product, { size, color, quantity: 1 });
    toast.success("Added to bag");
  }

  function handleBuyNow() {
    addItem(product, { size, color, quantity: 1 });
    router.push("/checkout");
  }

  const accordionItems = [
    {
      id: "details",
      title: "Details",
      content:
        product.description ||
        "A considered piece designed to move with you through the day. Crafted for comfort, styling ease, and everyday wear.",
      kind: "text",
    },
    {
      id: "size-guide",
      title: "Size Guide",
      content:
        product.sizeGuide ||
        "Size guide information can be added for each product in the admin product form.",
      kind: "text",
    },
    {
      id: "additional-info",
      title: "Additional Information",
      content: product.additionalInfo || [],
      kind: "table",
    },
    {
      id: "materials",
      title: "Materials & Wash Care",
      content: [product.materials, product.washCare]
        .filter(Boolean)
        .join("\n\n") ||
        "Fabric composition and care instructions can be added for each product. Until then, please follow the wash label on the garment and avoid harsh detergents, bleach, or high-heat drying.",
      kind: "text",
    },
    {
      id: "delivery",
      title: "Delivery & Returns",
      content:
        product.deliveryInfo ||
        "Orders are typically dispatched within 1-3 business days. Delivery timelines may vary by location. Returns can be requested within 7 days of delivery if the product is unused and in original condition.",
      kind: "text",
    },
  ];

  function renderAccordionContent(item) {
    if (item.kind === "table") {
      const rows = Array.isArray(item.content) ? item.content.filter((row) => row?.label || row?.value) : [];

      if (rows.length === 0) {
        return (
          <p className="text-sm leading-7 text-ink/60">
            Additional information can be added for each product in the admin product form.
          </p>
        );
      }

      return (
        <div className="overflow-hidden border border-ink/10 bg-paper">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.label}-${index}`} className="border-b border-ink/10 last:border-b-0">
                  <th className="w-1/2 border-r border-ink/10 bg-sand/30 px-4 py-3 text-left font-medium text-ink">
                    {row.label}
                  </th>
                  <td className="px-4 py-3 text-ink/70">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return <p className="text-sm leading-7 text-ink/60 whitespace-pre-line">{item.content}</p>;
  }

  function goToPreviousImage() {
    setActiveImage((current) => (current - 1 + displayImages.length) % displayImages.length);
  }

  function goToNextImage() {
    setActiveImage((current) => (current + 1) % displayImages.length);
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start">
        {/* Gallery */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-5">
          {displayImages.length > 1 && (
            <div className="order-2 md:order-1 flex md:flex-col gap-3 md:w-20 overflow-x-auto no-scrollbar md:overflow-visible pb-1 md:pb-0">
              {displayImages.map((img, i) => (
                <button
                  key={img + i}
                  onClick={() => setActiveImage(i)}
                  className={`relative shrink-0 w-16 h-20 md:w-20 md:h-24 bg-sand border overflow-hidden ${
                    activeImage === i ? "border-burgundy" : "border-ink/10"
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br from-ink/5 via-paper to-sand animate-pulse transition-opacity duration-300 ${
                      thumbLoaded[img] ? "opacity-0" : "opacity-100"
                    }`}
                  />
                  <Image
                    src={img}
                    alt=""
                    fill
                    className={`object-cover transition-opacity duration-300 ${
                      thumbLoaded[img] ? "opacity-100" : "opacity-0"
                    }`}
                    unoptimized={isGoogleDriveImageUrl(img)}
                    onLoadingComplete={() =>
                      setThumbLoaded((current) => ({
                        ...current,
                        [img]: true,
                      }))
                    }
                  />
                </button>
              ))}
            </div>
          )}

          <div className="order-1 md:order-2 relative flex-1">
            <div className="relative aspect-[3/4] bg-sand overflow-hidden">
              <div
                className={`absolute inset-0 bg-gradient-to-br from-ink/5 via-paper to-sand animate-pulse transition-opacity duration-300 ${
                  mainImageLoaded ? "opacity-0" : "opacity-100"
                }`}
              />
              <Image
                src={displayImages[activeImage] || displayImages[0]}
                alt={product.name}
                fill
                className={`object-cover transition-opacity duration-300 ${
                  mainImageLoaded ? "opacity-100" : "opacity-0"
                }`}
                priority
                unoptimized={isGoogleDriveImageUrl(displayImages[activeImage] || displayImages[0])}
                onLoadingComplete={() => setMainImageLoaded(true)}
              />

              {displayImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goToPreviousImage}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm transition-colors hover:bg-paper"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={goToNextImage}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm transition-colors hover:bg-paper"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div>
          {product.categorySlug && <p className="eyebrow mb-2 capitalize">{product.categorySlug}</p>}
          <h1 className="font-display text-4xl mb-4">{product.name}</h1>
          <div className="mb-6">
            <p className="text-2xl font-semibold leading-none">{formatINR(product.price)}</p>
            {hasCompareAtPrice && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-sm text-ink/45 line-through">
                  MRP {formatINR(product.compareAtPrice)}
                </p>
                <p className="text-sm text-burgundy">{discountPercent}% OFF</p>
              </div>
            )}
            {/* <p className="mt-1 text-sm font-medium text-ink/70">GST Discount Applied</p> */}
            <p className="text-sm font-medium text-ink/70">Inclusive Of All Taxes</p>
          </div>

          {sizeOptions.length > 0 && (
            <div className="mb-6">
              <p className="text-xs tracking-widest uppercase text-ink/60 mb-3">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => item.available && setSize(item.label)}
                    disabled={!item.available}
                    className={`px-4 py-2 text-sm border ${
                      size === item.label
                        ? "border-ink bg-ink text-paper"
                        : item.available
                          ? "border-ink/20"
                          : "border-ink/10 text-ink/35"
                    }`}
                  >
                    <span className={item.available ? "" : "line-through decoration-ink/45"}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

            {/* {product.colors?.length > 0 && (
            <div className="mb-8">
              <p className="text-xs tracking-widest uppercase text-ink/60 mb-3">Color</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`px-4 py-2 text-sm border ${
                      color === c ? "border-ink bg-ink text-paper" : "border-ink/20"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )} */}
      

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleAddToCart} disabled={product.stock === 0} className="w-full">
              {product.stock === 0 ? "Out of Stock" : "Add to Bag"}
            </Button>
            <Button
              onClick={handleBuyNow}
              disabled={product.stock === 0}
              className="w-full bg-tangerine text-white hover:bg-tangerine/90"
            >
              Buy Now
            </Button>
          </div>

          {typeof product.stock === "number" && product.stock > 0 && product.stock <= 5 && (
            <p className="text-xs text-burgundy mt-3">Only {product.stock} left in stock.</p>
          )}

          <div className="mt-10 border-t border-ink/10">
            {accordionItems.map((item) => {
              const isOpen = openSection === item.id;

              return (
                <div key={item.id} className="border-b border-ink/10">
                  <button
                    type="button"
                    onClick={() => setOpenSection((current) => (current === item.id ? "" : item.id))}
                    className="w-full flex items-center justify-between py-4 text-left"
                  >
                    <span className="text-sm tracking-wide uppercase text-ink">{item.title}</span>
                    <span
                      className={`text-ink/60 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4 fill-none stroke-current stroke-[1.8]"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="pb-4 pr-2">
                      {renderAccordionContent(item)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">You may also like</p>
              <h2 className="font-display text-3xl mt-2">More from Tangerine</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {relatedProducts.map((related) => (
              <ProductCard key={related.id || related.slug || related.name} product={related} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}






