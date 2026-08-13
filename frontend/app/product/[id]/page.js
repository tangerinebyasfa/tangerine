"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { useCart } from "../../../context/CartContext";
import Button from "../../../components/ui/Button";
import Spinner from "../../../components/ui/Spinner";

export default function ProductDetailPage() {
  const { id } = useParams();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);

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

  const images = product.images?.length ? product.images : ["/placeholder-product.svg"];

  function handleAddToCart() {
    addItem(product, { size, color, quantity: 1 });
    toast.success("Added to bag");
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
      {/* Gallery */}
      <div>
        <div className="relative aspect-[3/4] bg-sand mb-4">
          <Image src={images[activeImage]} alt={product.name} fill className="object-cover" />
        </div>
        {images.length > 1 && (
          <div className="flex gap-3">
            {images.map((img, i) => (
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
          ${Number(product.price).toFixed(2)}
          {product.compareAtPrice && (
            <span className="text-ink/40 line-through text-sm ml-3">
              ${Number(product.compareAtPrice).toFixed(2)}
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

        <Button onClick={handleAddToCart} disabled={product.stock === 0} className="w-full md:w-auto">
          {product.stock === 0 ? "Out of Stock" : "Add to Bag"}
        </Button>

        {typeof product.stock === "number" && product.stock > 0 && product.stock <= 5 && (
          <p className="text-xs text-burgundy mt-3">Only {product.stock} left in stock.</p>
        )}
      </div>
    </div>
  );
}
