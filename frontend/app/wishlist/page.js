"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import AuthGuard from "../../components/auth/AuthGuard";
import PageHeader from "../../components/ui/PageHeader";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { api } from "../../lib/api";
import { formatINR } from "../../lib/currency";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../lib/image";

function WishlistItemCard({ product, onRemove, onAddToCart }) {
  const primaryImage = normalizeImageUrl(product?.images?.[0]) || "/placeholder-product.svg";
  const secondaryImage = normalizeImageUrl(product?.images?.[1]) || primaryImage;
  const href = `/product/${product.slug || product.id}`;
  const onSale = typeof product?.compareAtPrice === "number" && product.compareAtPrice > product.price;

  function handleRemove(event) {
    event.preventDefault();
    event.stopPropagation();
    onRemove(product.id);
  }

  function handleQuickAdd(event) {
    event.preventDefault();
    event.stopPropagation();
    onAddToCart(product);
  }

  return (
    <article className="group block">
      <div className="relative">
        <Link href={href} className="block">
          <div className="relative aspect-[4/5] overflow-hidden bg-paper">
            <div className="absolute inset-0 flex w-[200%] transition-transform duration-700 ease-out motion-reduce:transition-none group-hover:-translate-x-1/2">
              <div className="relative h-full w-1/2 shrink-0">
                <Image
                  src={primaryImage}
                  alt={product?.name || "Wishlist product"}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  className="object-cover"
                  unoptimized={isGoogleDriveImageUrl(primaryImage)}
                />
              </div>
              <div className="relative h-full w-1/2 shrink-0">
                <Image
                  src={secondaryImage}
                  alt={product?.name || "Wishlist product"}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  className="object-cover"
                  unoptimized={isGoogleDriveImageUrl(secondaryImage)}
                />
              </div>
            </div>

            {onSale ? (
              <span className="absolute left-0 top-0 bg-tangerine px-3 py-1.5 text-[10px] tracking-widest uppercase text-paper">
                Sale
              </span>
            ) : null}
          </div>
        </Link>

        <button
          type="button"
          aria-label="Remove from wishlist"
          onClick={handleRemove}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white shadow-[0_10px_22px_rgba(0,0,0,0.08)] transition-colors hover:border-burgundy hover:text-burgundy"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
        </button>

        <button
          type="button"
          aria-label="Add to bag"
          onClick={handleQuickAdd}
          className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white shadow-[0_10px_22px_rgba(0,0,0,0.08)] transition-colors hover:border-tangerine hover:text-tangerine"
        >
          <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      <Link href={href} className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] leading-5 uppercase tracking-[0.12em] text-ink transition-colors group-hover:text-tangerine">
            {product?.name || "Untitled product"}
          </h2>
          {product?.categorySlug ? (
            <p className="mt-1 text-[11px] capitalize tracking-[0.08em] text-ink/55">
              {product.categorySlug}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[13px] leading-5 tracking-[0.04em] text-ink">{formatINR(product?.price || 0)}</p>
          {onSale ? (
            <p className="text-[11px] leading-4 text-ink/40 line-through">
              {formatINR(product.compareAtPrice)}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

function WishlistPageContent() {
  const router = useRouter();
  const { addItem } = useCart();
  const { wishlistItems, loading, removeFromWishlist } = useWishlist();
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [buyAllLoading, setBuyAllLoading] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const result = await api.getProducts();
        if (active) setProducts(Array.isArray(result) ? result : []);
      } catch (error) {
        if (active) {
          setProductsError(error instanceof Error ? error.message : "Failed to load products.");
        }
      } finally {
        if (active) setProductsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const productMap = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products]);

  const wishlistProducts = useMemo(
    () => wishlistItems.map((entry) => productMap.get(String(entry.id))).filter(Boolean),
    [wishlistItems, productMap]
  );

  useEffect(() => {
    if (productsLoading || loading || productsError) return;

    const missingIds = wishlistItems
      .map((entry) => String(entry.id))
      .filter((id) => !productMap.has(id));

    if (!missingIds.length) return;

    missingIds.forEach((id) => {
      removeFromWishlist(id).catch(() => {});
    });
  }, [loading, productsLoading, productMap, removeFromWishlist, wishlistItems, productsError]);

  function handleRemove(productId) {
    removeFromWishlist(productId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Unable to remove from wishlist");
    });
  }

  function handleAddToCart(product) {
    addItem(product, { quantity: 1 });
    toast.success("Added to bag");
  }

  async function handleBuyAllWishlist() {
    if (!wishlistProducts.length || buyAllLoading) return;

    setBuyAllLoading(true);

    try {
      wishlistProducts.forEach((product) => {
        addItem(product, { quantity: 1 });
      });

      toast.success("Wishlist items added to bag");
      router.push("/checkout");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start checkout");
    } finally {
      setBuyAllLoading(false);
    }
  }

  if (loading || productsLoading) {
    return <Spinner className="min-h-[60vh]" />;
  }

  return (
    <main className="min-h-screen bg-[#fffdfb] pb-20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Wishlist"
          title="Your saved pieces"
          description="Everything you loved stays in sync with your account and updates with the latest product data."
        />

        {productsError ? (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {productsError}
          </div>
        ) : null}

        {!productsError && !wishlistProducts.length ? (
          <div className="rounded-3xl border border-dashed border-[#ded4ca] bg-white px-6 py-16 text-center text-[#6f645c]">
            <Heart className="mx-auto mb-3 h-6 w-6 text-[#c45a2a]" fill="currentColor" strokeWidth={1.6} />
            <p className="text-lg font-semibold text-[#171412]">Your wishlist is empty</p>
            <p className="mt-2">Save products you love and they will appear here.</p>
          </div>
        ) : null}

        {!productsError && wishlistProducts.length > 0 ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm uppercase tracking-[0.2em] text-ink/50">
                {wishlistProducts.length} item{wishlistProducts.length === 1 ? "" : "s"}
              </p>
              <Button
                type="button"
                onClick={handleBuyAllWishlist}
                loading={buyAllLoading}
                className="bg-ink text-paper hover:bg-burgundy"
              >
                Buy All Wishlist Items
              </Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {wishlistProducts.map((product) => (
                <WishlistItemCard
                  key={product.id}
                  product={product}
                  onRemove={handleRemove}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

export default function WishlistPage() {
  return (
    <AuthGuard>
      <WishlistPageContent />
    </AuthGuard>
  );
}
