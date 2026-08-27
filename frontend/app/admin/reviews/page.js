"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Spinner from "../../../components/ui/Spinner";
import { api } from "../../../lib/api";
import { formatINR } from "../../../lib/currency";

function formatDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [filters, setFilters] = useState({
    productId: "",
    userId: "",
    verified: "all",
  });

  const activeFilters = useMemo(() => {
    const parsed = {};
    if (filters.productId.trim()) parsed.productId = filters.productId.trim();
    if (filters.userId.trim()) parsed.userId = filters.userId.trim();
    if (filters.verified !== "all") parsed.verified = filters.verified === "true";
    return parsed;
  }, [filters]);

  async function loadReviews(currentFilters = activeFilters) {
    setLoading(true);
    try {
      const data = await api.getReviews({ ...currentFilters, authRequired: true });
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to load reviews");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, [activeFilters]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      if (activeFilters.productId) {
        const target = activeFilters.productId.toLowerCase();
        const productMatch =
          String(review.productId || "").toLowerCase().includes(target) ||
          String(review.productSlug || "").toLowerCase().includes(target) ||
          String(review.productName || "").toLowerCase().includes(target);
        if (!productMatch) return false;
      }

      if (activeFilters.userId && String(review.userId || "").toLowerCase() !== String(activeFilters.userId).toLowerCase()) {
        return false;
      }

      if (filters.verified !== "all" && Boolean(review.purchaseVerified) !== (filters.verified === "true")) {
        return false;
      }

      return true;
    });
  }, [reviews, activeFilters, filters.verified]);

  async function handleDelete(reviewId) {
    const confirmed = window.confirm("Delete this review?");
    if (!confirmed) return;

    setDeletingId(reviewId);
    try {
      await api.deleteReview(reviewId);
      setReviews((current) => current.filter((review) => review.id !== reviewId));
      toast.success("Review deleted");
    } catch (error) {
      toast.error(error.message || "Unable to delete review");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-2">Moderation</p>
          <h1 className="font-display text-3xl">Reviews</h1>
          <p className="mt-2 text-sm text-ink/55">
            Review customer feedback, inspect verified purchase status, and remove spam or policy-breaking content.
          </p>
        </div>
        <p className="text-sm uppercase tracking-[0.2em] text-ink/45">{filteredReviews.length} total</p>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <input
          value={filters.productId}
          onChange={(event) => setFilters((current) => ({ ...current, productId: event.target.value }))}
          placeholder="Filter by product ID or slug"
          className="input-field"
        />
        <input
          value={filters.userId}
          onChange={(event) => setFilters((current) => ({ ...current, userId: event.target.value }))}
          placeholder="Filter by user ID"
          className="input-field"
        />
        <select
          value={filters.verified}
          onChange={(event) => setFilters((current) => ({ ...current, verified: event.target.value }))}
          className="input-field"
        >
          <option value="all">All reviews</option>
          <option value="true">Verified only</option>
          <option value="false">Unverified only</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : filteredReviews.length === 0 ? (
        <div className="border border-dashed border-ink/10 bg-paper p-8 text-center">
          <p className="font-display text-2xl">No reviews found</p>
          <p className="mt-2 text-sm text-ink/55">Try adjusting the filters or wait for new customer reviews.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <article key={review.id} className="border border-ink/10 bg-paper p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl text-ink">{review.productName || "Product review"}</h2>
                    <span
                      className={`inline-flex border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${
                        review.purchaseVerified
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {review.purchaseVerified ? "Verified Purchase" : "Unverified"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-ink/60 md:grid-cols-3">
                    <p>
                      <span className="block text-xs uppercase tracking-[0.18em] text-ink/40">Product</span>
                      <Link href={`/product/${review.productSlug || review.productId}`} className="text-tangerine">
                        {review.productId}
                      </Link>
                    </p>
                    <p>
                      <span className="block text-xs uppercase tracking-[0.18em] text-ink/40">Customer</span>
                      {review.userName || review.userEmail || review.userId}
                    </p>
                    <p>
                      <span className="block text-xs uppercase tracking-[0.18em] text-ink/40">Date</span>
                      {formatDate(review.createdAt)}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                    <p>
                      <span className="mr-2 text-xs uppercase tracking-[0.18em] text-ink/40">Rating</span>
                      {review.rating}/5
                    </p>
                    {review.productPrice ? (
                      <p>
                        <span className="mr-2 text-xs uppercase tracking-[0.18em] text-ink/40">Ref Price</span>
                        {formatINR(review.productPrice)}
                      </p>
                    ) : null}
                  </div>

                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-ink/70">{review.comment}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(review.id)}
                  disabled={deletingId === review.id}
                  className="inline-flex shrink-0 items-center justify-center border border-rose-200 px-4 py-2 text-sm text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === review.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
