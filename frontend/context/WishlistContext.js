"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { addWishlistItem, getWishlist, removeWishlistItem } from "../lib/wishlist";

const WishlistContext = createContext(null);

function normalizeId(value) {
  return String(value || "").trim();
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function createOptimisticWishlistItem(productId) {
  return {
    id: productId,
    productId,
    addedAt: new Date().toISOString(),
    __optimistic: true,
  };
}

export function WishlistProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [wishlistDocs, setWishlistDocs] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [optimisticMap, setOptimisticMap] = useState({});
  const [pendingIds, setPendingIds] = useState(() => new Set());

  useEffect(() => {
    if (authLoading) {
      setWishlistLoading(true);
      return;
    }

    if (!user) {
      setWishlistDocs([]);
      setWishlistLoading(false);
      setOptimisticMap({});
      setPendingIds(new Set());
      return;
    }

    setWishlistLoading(true);
    let active = true;

    getWishlist()
      .then((items) => {
        if (!active) return;

        const normalized = Array.isArray(items)
          ? items.map((item) => ({
              ...item,
              id: normalizeId(item.id || item.productId),
              productId: normalizeId(item.productId || item.id),
            }))
          : [];

        setWishlistDocs(normalized);
        setOptimisticMap({});
      })
      .catch((error) => {
        console.error("[wishlist] Failed to load wishlist:", error);
        if (!active) return;
        setWishlistDocs([]);
      })
      .finally(() => {
        if (active) setWishlistLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, user?.uid]);

  const wishlistIds = useMemo(() => {
    const ids = new Set(wishlistDocs.map((item) => normalizeId(item.id || item.productId)));

    for (const [id, state] of Object.entries(optimisticMap)) {
      if (state === true) ids.add(id);
      if (state === false) ids.delete(id);
    }

    return ids;
  }, [wishlistDocs, optimisticMap]);

  const wishlistItems = useMemo(() => {
    const combined = [...wishlistDocs];

    for (const [id, state] of Object.entries(optimisticMap)) {
      if (state === true && !combined.some((item) => normalizeId(item.id || item.productId) === id)) {
        combined.push(createOptimisticWishlistItem(id));
      }
      if (state === false) {
        return combined.filter((item) => normalizeId(item.id || item.productId) !== id);
      }
    }

    return combined.sort((a, b) => toMillis(b.addedAt) - toMillis(a.addedAt));
  }, [wishlistDocs, optimisticMap]);

  const wishlistCount = wishlistIds.size;
  const loading = authLoading || wishlistLoading;

  function isPending(productId) {
    return pendingIds.has(normalizeId(productId));
  }

  function isWishlisted(productId) {
    return wishlistIds.has(normalizeId(productId));
  }

  function requireUser() {
    if (!user) {
      throw new Error("Please sign in to use the wishlist.");
    }
  }

  async function addToWishlist(product) {
    requireUser();
    const productId = normalizeId(product?.id);
    if (!productId || isPending(productId) || isWishlisted(productId)) return;

    setPendingIds((current) => new Set(current).add(productId));
    setOptimisticMap((current) => ({ ...current, [productId]: true }));
    setWishlistDocs((current) => {
      if (current.some((item) => normalizeId(item.id || item.productId) === productId)) return current;
      return [...current, createOptimisticWishlistItem(productId)];
    });

    try {
      await addWishlistItem(productId);
      const items = await getWishlist();
      setWishlistDocs(
        Array.isArray(items)
          ? items.map((item) => ({
              ...item,
              id: normalizeId(item.id || item.productId),
              productId: normalizeId(item.productId || item.id),
            }))
          : []
      );
      setOptimisticMap({});
    } catch (error) {
      setOptimisticMap((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
      setWishlistDocs((current) => current.filter((item) => normalizeId(item.id || item.productId) !== productId));
      throw error;
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
    }
  }

  async function removeFromWishlist(productId) {
    requireUser();
    const id = normalizeId(productId);
    if (!id || isPending(id) || !isWishlisted(id)) return;

    setPendingIds((current) => new Set(current).add(id));
    setOptimisticMap((current) => ({ ...current, [id]: false }));
    setWishlistDocs((current) => current.filter((item) => normalizeId(item.id || item.productId) !== id));

    try {
      await removeWishlistItem(id);
      const items = await getWishlist();
      setWishlistDocs(
        Array.isArray(items)
          ? items.map((item) => ({
              ...item,
              id: normalizeId(item.id || item.productId),
              productId: normalizeId(item.productId || item.id),
            }))
          : []
      );
      setOptimisticMap({});
    } catch (error) {
      setOptimisticMap((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      throw error;
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function toggleWishlist(product) {
    const productId = normalizeId(product?.id);
    if (!productId) throw new Error("Invalid product.");

    if (isWishlisted(productId)) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(product);
    }
  }

  return (
    <WishlistContext.Provider
      value={{
        wishlistDocs,
        wishlistItems,
        wishlistIds,
        wishlistCount,
        loading,
        isWishlisted,
        isPending,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
