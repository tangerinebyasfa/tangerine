"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";

function buildReturnUrl(pathname, searchParams) {
  const query = searchParams?.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function WishlistButton({ product, mode = "icon", className = "" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { loading, isWishlisted, isPending, toggleWishlist } = useWishlist();

  const productId = String(product?.id || "").trim();
  const active = productId ? isWishlisted(productId) : false;
  const pending = productId ? isPending(productId) : false;

  async function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      toast.error("Please sign in to save wishlist items.");
      router.push(`/signin?next=${encodeURIComponent(buildReturnUrl(pathname, searchParams))}`);
      return;
    }

    if (!productId || pending) return;

    try {
      await toggleWishlist(product);
      toast.success(active ? "Removed from wishlist" : "Added to wishlist");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update wishlist");
    }
  }

  if (!productId) return null;

  if (mode === "text") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || pending}
        aria-pressed={active}
        className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          active
            ? "border-burgundy bg-burgundy text-white"
            : "border-ink/15 bg-white text-ink hover:border-burgundy hover:text-burgundy"
        } ${className}`}
      >
        <Heart className="h-4 w-4" fill={active ? "currentColor" : "none"} strokeWidth={1.8} />
        {active ? "Remove from Wishlist" : "Add to Wishlist"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || pending}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white shadow-[0_10px_22px_rgba(0,0,0,0.08)] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        active ? "border-burgundy text-burgundy" : "border-black/10 text-ink/70 hover:border-burgundy hover:text-burgundy"
      } ${className}`}
    >
      <Heart className="h-4 w-4" fill={active ? "currentColor" : "none"} strokeWidth={1.8} />
    </button>
  );
}
