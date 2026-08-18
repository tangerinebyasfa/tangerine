"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { normalizeImageUrl } from "../../../lib/image";
import { formatINR } from "../../../lib/currency";
import { useCart } from "../../../context/CartContext";
import Button from "../../../components/ui/Button";
import Spinner from "../../../components/ui/Spinner";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [openSection, setOpenSection] = useState("details");

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getProduct(id);
        setProduct(data);
        if (data.sizes?.length) setSize(data.sizes[0]);
        if (data.colors?.length) setColor(data.colors[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
    },
    {
      id: "materials",
      title: "Materials & Wash Care",
      content: [product.materials, product.washCare]
        .filter(Boolean)
        .join("\n\n") ||
        "Fabric composition and care instructions can be added for each product. Until then, please follow the wash label on the garment and avoid harsh detergents, bleach, or high-heat drying.",
    },
    {
      id: "delivery",
      title: "Delivery & Returns",
      content:
        product.deliveryInfo ||
        "Orders are typically dispatched within 1-3 business days. Delivery timelines may vary by location. Returns can be requested within 7 days of delivery if the product is unused and in original condition.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
      {/* Gallery */}
      <div>
        <div className="relative aspect-[3/4] bg-sand mb-4">
          <Image
            src={displayImages[activeImage] || displayImages[0]}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>
        {displayImages.length > 1 && (
          <div className="flex gap-3">
            {displayImages.map((img, i) => (
              <button
                key={img + i}
                onClick={() => setActiveImage(i)}
                className={`relative w-20 h-24 bg-sand border ${
                  activeImage === i ? "border-burgundy" : "border-transparent"
                }`}
              >
                <Image src={img} alt="" fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div>
        {product.categorySlug && <p className="eyebrow mb-2 capitalize">{product.categorySlug}</p>}
        <h1 className="font-display text-4xl mb-4">{product.name}</h1>
        <p className="text-xl mb-6">
          {formatINR(product.price)}
          {product.compareAtPrice && (
            <span className="text-ink/40 line-through text-sm ml-3">
              {formatINR(product.compareAtPrice)}
            </span>
          )}
        </p>

        {product.description && (
          <p className="text-ink/60 leading-relaxed mb-8">{product.description}</p>
        )}

        {product.sizes?.length > 0 && (
          <div className="mb-6">
            <p className="text-xs tracking-widest uppercase text-ink/60 mb-3">Size</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-4 py-2 text-sm border ${
                    size === s ? "border-ink bg-ink text-paper" : "border-ink/20"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {product.colors?.length > 0 && (
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
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleAddToCart} disabled={product.stock === 0} className="w-full sm:w-auto">
            {product.stock === 0 ? "Out of Stock" : "Add to Bag"}
          </Button>
          <Button
            onClick={handleBuyNow}
            disabled={product.stock === 0}
            className="w-full sm:w-auto bg-tangerine text-white hover:bg-tangerine/90"
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
                    <p className="text-sm leading-7 text-ink/60 whitespace-pre-line">{item.content}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
