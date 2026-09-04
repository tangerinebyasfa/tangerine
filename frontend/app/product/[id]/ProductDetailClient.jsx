"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../../lib/image";
import { formatINR } from "../../../lib/currency";
import { useCart } from "../../../context/CartContext";
import { useAuth } from "../../../context/AuthContext";
import Button from "../../../components/ui/Button";
import Spinner from "../../../components/ui/Spinner";
import ProductCard from "../../../components/product/ProductCard";
import WishlistButton from "../../../components/wishlist/WishlistButton";
import { Bell, Star } from "lucide-react";
import { addProductNotification } from "../../../lib/notifications";

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

function getReviewDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RatingStars({ rating = 0 }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const active = index < Number(rating || 0);
        return (
          <Star
            key={index}
            className={`h-4 w-4 ${active ? "fill-tangerine text-tangerine" : "text-ink/20"}`}
          />
        );
      })}
    </div>
  );
}

function CouponOffers({ coupons = [] }) {
  if (!coupons.length) return null;

  return (
    <div className="mb-6 border border-tangerine/20 bg-[#fff8f1] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tangerine">Available offers</p>
      <div className="mt-3 space-y-3">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="border-b border-tangerine/10 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold tracking-widest text-ink">{coupon.code}</span>
              <span className="text-sm font-medium text-tangerine">
                {coupon.discountType === "percentage" ? `${coupon.discountValue}% off` : `${formatINR(coupon.discountValue)} off`}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-ink/60">
              {coupon.minimumOrderValue ? `On orders above ${formatINR(coupon.minimumOrderValue)}. ` : "Store offer. "}
              Expires {new Date(coupon.expiresAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductDetailClient({ initialProduct = null, relatedProducts = [] }) {
  const { id } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [activeImage, setActiveImage] = useState(0);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState({});
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [openSection, setOpenSection] = useState("");
  const [productReviews, setProductReviews] = useState([]);
  const [productReviewsLoading, setProductReviewsLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifySent, setNotifySent] = useState(false);
  const [validCoupons, setValidCoupons] = useState([]);

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
    let active = true;

    async function refreshProduct() {
      try {
        const data = await api.getProduct(id);
        if (!active) return;
        setProduct(data);
        const availableSizes = getAvailableSizeLabels(data);
        if (availableSizes.length) setSize(availableSizes[0]);
        if (data.colors?.length) setColor(data.colors[0]);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    refreshProduct();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;

    let active = true;

    async function refreshProduct() {
      try {
        const data = await api.getProduct(id);
        if (!active) return;
        setProduct(data);
      } catch (err) {
        console.error(err);
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshProduct();
      }
    };

    const handleFocus = () => {
      refreshProduct();
    };

    const interval = setInterval(refreshProduct, 15000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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

  useEffect(() => {
    if (!product?.id) return undefined;

    setProductReviewsLoading(true);
    setNotifySent(false);
    setNotifySubmitting(false);
    let active = true;

    api
      .getReviews({ productId: product.id })
      .then((items) => {
        if (!active) return;
        setProductReviews(Array.isArray(items) ? items : []);
      })
      .catch((error) => {
        console.error(error);
        if (active) setProductReviews([]);
      })
      .finally(() => {
        if (active) setProductReviewsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [product?.id]);

  useEffect(() => {
    setReviewForm({ rating: 5, comment: "" });
    setNotifySubmitting(false);
    setNotifySent(false);
  }, [product?.id]);

  useEffect(() => {
    if (!product?.id) return undefined;
    let active = true;
    api
      .getValidCoupons(product.id, product.categorySlug)
      .then((coupons) => {
        if (active) setValidCoupons(Array.isArray(coupons) ? coupons : []);
      })
      .catch(() => {
        if (active) setValidCoupons([]);
      });
    return () => { active = false; };
  }, [product?.id, product?.categorySlug]);

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
  const isSoldOut = Number(product.stock) === 0;
  const discountPercent = hasCompareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;
  const reviewCount = productReviews.length;
  const averageRating =
    reviewCount > 0
      ? (productReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewCount).toFixed(1)
      : null;
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
    if (isSoldOut) {
      toast.error("This product is sold out.");
      return;
    }

    addItem(product, { size, color, quantity: 1 });
    toast.success("Added to bag");
  }

  function handleBuyNow() {
    if (isSoldOut) {
      toast.error("This product is sold out.");
      return;
    }

    addItem(product, { size, color, quantity: 1 });
    router.push("/checkout");
  }

  async function handleNotifyMe() {
    if (notifySubmitting || notifySent) return;

    if (!user) {
      const next = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
      toast.error("Please sign in to get restock updates.");
      router.push(`/signin?next=${encodeURIComponent(next)}`);
      return;
    }

    setNotifySubmitting(true);
    try {
      await addProductNotification(product);
      setNotifySent(true);
      toast.success("We'll notify you when it's back in stock.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save notification");
    } finally {
      setNotifySubmitting(false);
    }
  }

  async function handleSubmitReview(event) {
    event.preventDefault();

    if (!user) {
      toast.error("Please sign in to add a review");
      return;
    }

    const comment = String(reviewForm.comment || "").trim();
    const rating = Number(reviewForm.rating);

    if (!rating || rating < 1 || rating > 5) {
      toast.error("Choose a rating between 1 and 5");
      return;
    }

    if (comment.length < 3) {
      toast.error("Please write a short review comment");
      return;
    }

    setReviewSubmitting(true);
    try {
      const createdReview = await api.createReview({
        productId: product.id,
        rating,
        comment,
      });
      setProductReviews((current) => [createdReview, ...current.filter((review) => review.id !== createdReview.id)]);
      setReviewForm({ rating: 5, comment: "" });
      toast.success("Review posted");
    } catch (error) {
      toast.error(error.message || "Could not submit review");
    } finally {
      setReviewSubmitting(false);
    }
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

  const purchaseActions = isSoldOut ? (
    <div className="grid grid-cols-2 gap-3">
      <Button onClick={handleAddToCart} disabled className="w-full">
        Sold Out
      </Button>
      <Button
        onClick={handleNotifyMe}
        loading={notifySubmitting}
        disabled={notifySent}
        variant="outline"
        className="w-full border-tangerine text-tangerine hover:bg-tangerine hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {notifySent ? "Notified" : "Notify Me"}
      </Button>
    </div>
  ) : (
    <div className="grid grid-cols-2 gap-3">
      <Button onClick={handleAddToCart} className="w-full">
        Add to Bag
      </Button>
      <Button onClick={handleBuyNow} className="w-full bg-tangerine text-white hover:bg-tangerine/90">
        Buy Now
      </Button>
    </div>
  );

  const productInfoPanel = (
    <>
      <div>
        {product.categorySlug && <p className="eyebrow mb-2 capitalize">{product.categorySlug}</p>}
        <h1 className="font-display text-4xl mb-4">{product.name}</h1>
        <div className="mb-6">
          <p className="text-2xl font-semibold leading-none">{formatINR(product.price)}</p>
          {hasCompareAtPrice && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-sm text-ink/45 line-through">MRP {formatINR(product.compareAtPrice)}</p>
              <p className="text-sm text-burgundy">{discountPercent}% OFF</p>
            </div>
          )}
          <p className="text-sm font-medium text-ink/70">Inclusive Of All Taxes</p>
        </div>

        <CouponOffers coupons={validCoupons} />

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
                  <span className={item.available ? "" : "line-through decoration-ink/45"}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {purchaseActions}

        <div className="mt-3">
          <WishlistButton product={product} mode="text" className="w-full" />
        </div>

        {isSoldOut ? (
          <p className="text-xs text-burgundy mt-3">This product is sold out.</p>
        ) : typeof product.stock === "number" && product.stock > 0 && product.stock <= 5 ? (
          <p className="text-xs text-burgundy mt-3">Only {product.stock} left in stock.</p>
        ) : null}

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
                  <span className={`text-ink/60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </button>
                {isOpen && <div className="pb-4 pr-2">{renderAccordionContent(item)}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <section className="mt-10 border border-ink/10 bg-[#fffaf6] p-5">
        <div className="mb-5">
          <p className="eyebrow">Customer Reviews</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-3xl text-ink">What shoppers say</h2>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          {averageRating ? (
            <span className="inline-flex items-center gap-2 border border-ink/10 bg-white px-3 py-1 text-sm text-ink/70">
              <RatingStars rating={Math.round(Number(averageRating))} />
              {averageRating} / 5
            </span>
          ) : null}
          <p className="text-sm uppercase tracking-[0.2em] text-ink/45">
            {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
          </p>
        </div>

        {user ? (
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm uppercase tracking-[0.18em] text-ink/45">Your rating</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setReviewForm((current) => ({ ...current, rating: value }))}
                    className="transition-transform hover:scale-110"
                    aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`h-5 w-5 ${reviewForm.rating >= value ? "fill-tangerine text-tangerine" : "text-ink/20"}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={reviewForm.comment}
              onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
              rows={4}
              placeholder={`Share your thoughts on ${product.name}...`}
              className="w-full border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-tangerine"
            />

            <div className="space-y-4">
              <p className="text-sm leading-6 text-ink/50">
                Reviews are linked to completed orders and the verified badge appears only when applicable.
              </p>
              <Button type="submit" loading={reviewSubmitting} className="w-full px-6">
                Post Review
              </Button>
            </div>
          </form>
        ) : (
          <div className="border border-dashed border-ink/10 bg-white p-5 text-sm text-ink/65">
            <Link href="/signin" className="font-medium text-tangerine">
              Sign in
            </Link>{" "}
            to add your own review.
          </div>
        )}
      </section>

      <section className="mt-6 pt-4">
        {productReviewsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="h-40 animate-pulse border border-ink/10 bg-sand/60" />
            ))}
          </div>
        ) : reviewCount === 0 ? (
          <div className="border border-dashed border-ink/10 bg-[#fffaf6] p-8 text-center">
            <p className="font-display text-2xl text-ink">No reviews yet</p>
            <p className="mt-2 text-sm leading-6 text-ink/55">
              Be the first to share how this product fits, feels, and wears.
            </p>
          </div>
        ) : (
          <div className="max-h-[780px] overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              {productReviews.map((review) => {
                const avatarLetter = (review.userName || review.userEmail || "U").charAt(0).toUpperCase();

                return (
                  <article key={review.id} className="border border-ink/10 bg-white p-4">
                    <div className="flex items-start gap-4">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden border border-ink/10 bg-[#fff4eb]">
                        {review.userPhotoURL ? (
                          <Image
                            src={normalizeImageUrl(review.userPhotoURL)}
                            alt={review.userName || "Reviewer"}
                            fill
                            className="object-cover"
                            unoptimized={isGoogleDriveImageUrl(review.userPhotoURL)}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center font-medium text-tangerine">
                            {avatarLetter}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-ink">{review.userName || "Customer"}</p>
                          {review.purchaseVerified ? (
                            <span className="inline-flex border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-700">
                              Verified Purchase
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <RatingStars rating={review.rating} />
                          <span className="text-xs uppercase tracking-[0.18em] text-ink/40">
                            {getReviewDate(review.createdAt)}
                          </span>
                        </div>
                        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink/70">{review.comment}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </>
  );

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
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div className="space-y-8">
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

            <section className="hidden lg:block mt-10 border border-ink/10 bg-[#fffaf6] p-6">
              <div className="mb-5">
                <p className="eyebrow">Customer Reviews</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-3xl text-ink">What shoppers say</h2>
                </div>
              </div>

              <div className="mb-5 flex flex-wrap items-center gap-3">
                {averageRating ? (
                  <span className="inline-flex items-center gap-2 border border-ink/10 bg-white px-3 py-1 text-sm text-ink/70">
                    <RatingStars rating={Math.round(Number(averageRating))} />
                    {averageRating} / 5
                  </span>
                ) : null}
                <p className="text-sm uppercase tracking-[0.2em] text-ink/45">
                  {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                </p>
              </div>

              {user ? (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm uppercase tracking-[0.18em] text-ink/45">Your rating</p>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReviewForm((current) => ({ ...current, rating: value }))}
                          className="transition-transform hover:scale-110"
                          aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                        >
                          <Star
                            className={`h-5 w-5 ${reviewForm.rating >= value ? "fill-tangerine text-tangerine" : "text-ink/20"}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={reviewForm.comment}
                    onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                    rows={5}
                    placeholder={`Share your thoughts on ${product.name}...`}
                    className="w-full border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-tangerine"
                  />

                  <div className="space-y-4">
                    <p className="text-sm leading-6 text-ink/50">
                      Reviews are linked to completed orders and the verified badge appears only when applicable.
                    </p>
                    <Button type="submit" loading={reviewSubmitting} className="w-full px-6">
                      Post Review
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="border border-dashed border-ink/10 bg-white p-5 text-sm text-ink/65">
                  <Link href="/signin" className="font-medium text-tangerine">
                    Sign in
                  </Link>{" "}
                  to add your own review.
                </div>
              )}
            </section>

            <div className="lg:hidden">
              {productInfoPanel}
            </div>

          </div>

          <div className="hidden lg:block lg:justify-self-center lg:w-full lg:max-w-[580px]">
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
                <p className="text-sm font-medium text-ink/70">Inclusive Of All Taxes</p>
              </div>

              <CouponOffers coupons={validCoupons} />

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

              {purchaseActions}

              <div className="mt-3">
                <WishlistButton product={product} mode="text" className="w-full" />
              </div>

              {isSoldOut ? (
                <p className="text-xs text-burgundy mt-3">This product is sold out.</p>
              ) : typeof product.stock === "number" && product.stock > 0 && product.stock <= 5 ? (
                <p className="text-xs text-burgundy mt-3">Only {product.stock} left in stock.</p>
              ) : null}

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

              <section className="mt-6 pt-4">
                {productReviewsLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className="h-40 animate-pulse border border-ink/10 bg-sand/60" />
                    ))}
                  </div>
                ) : reviewCount === 0 ? (
                  <div className="border border-dashed border-ink/10 bg-[#fffaf6] p-8 text-center">
                    <p className="font-display text-2xl text-ink">No reviews yet</p>
                    <p className="mt-2 text-sm leading-6 text-ink/55">
                      Be the first to share how this product fits, feels, and wears.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[780px] overflow-y-auto pr-1">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {productReviews.map((review) => {
                        const avatarLetter = (review.userName || review.userEmail || "U").charAt(0).toUpperCase();

                        return (
                          <article
                            key={review.id}
                            className="border border-ink/10 bg-white p-4 shadow-[0_10px_24px_rgba(0,0,0,0.03)]"
                          >
                            <div className="flex items-start gap-4">
                              <div className="relative h-11 w-11 shrink-0 overflow-hidden border border-ink/10 bg-[#fff4eb]">
                                {review.userPhotoURL ? (
                                  <Image
                                    src={normalizeImageUrl(review.userPhotoURL)}
                                    alt={review.userName || "Reviewer"}
                                    fill
                                    className="object-cover"
                                    unoptimized={isGoogleDriveImageUrl(review.userPhotoURL)}
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center font-medium text-tangerine">
                                    {avatarLetter}
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-ink">{review.userName || "Customer"}</p>
                                  {review.purchaseVerified ? (
                                    <span className="inline-flex border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-700">
                                      Verified Purchase
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-3">
                                  <RatingStars rating={review.rating} />
                                  <span className="text-xs uppercase tracking-[0.18em] text-ink/40">
                                    {getReviewDate(review.createdAt)}
                                  </span>
                                </div>
                                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink/70">
                                  {review.comment}
                                </p>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

            </div>
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






