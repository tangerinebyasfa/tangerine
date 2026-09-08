"use client";

import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { normalizeImageUrl } from "../lib/image";

const CartContext = createContext(null);
const STORAGE_KEY = "fashion-cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  // Load persisted cart on first mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) setItems(parsed.filter(item => item && typeof item.productId === "string" && Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99));
    } catch {
      // ignore corrupted storage
    } finally { setLoaded(true); }
  }, []);

  // Persist on every change
  useEffect(() => {
    if (loaded) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {} }
  }, [items, loaded]);

  function addItem(product, { size, color, quantity = 1 } = {}) {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) return false;
    const sizes = product.sizeOptions?.length ? product.sizeOptions.filter(option => option.available).map(option => option.label) : product.sizes || [];
    if ((sizes.length && !sizes.includes(size)) || (product.sizeOptions?.length && !sizes.length) || (product.colors?.length && !product.colors.includes(color))) {
      toast.error("Please select an available size and colour."); return false;
    }
    const inBag = items.filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
    if (!Number.isSafeInteger(product.stock) || product.stock < inBag + quantity || inBag + quantity > 99) {
      toast.error("No more stock is available for this product."); return false;
    }

    setItems((prev) => {
      const lineId = `${product.id}-${size || "onesize"}-${color || "default"}`;
      const existing = prev.find((i) => i.lineId === lineId);

      if (existing) {
        return prev.map((i) =>
          i.lineId === lineId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }

      return [
        ...prev,
        {
          lineId,
          productId: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          image: normalizeImageUrl(product.images?.[0]),
          size: size || null,
          color: color || null,
          quantity,
        },
      ];
    });
    setDrawerOpen(true);
    return true;
  }

  function updateQuantity(lineId, quantity) {
    if (!Number.isSafeInteger(quantity)) return;
    if (quantity <= 0) return removeItem(lineId);
    const line = items.find(item => item.lineId === lineId);
    const others = items.filter(item => item.productId === line?.productId && item.lineId !== lineId).reduce((sum, item) => sum + item.quantity, 0);
    if (quantity + others > Math.min(99, line?.stock ?? 99)) { toast.error("Available stock limit reached."); return; }
    setItems((prev) => prev.map((i) => (i.lineId === lineId ? { ...i, quantity } : i)));
  }

  function removeItem(lineId) {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  }

  function clearCart() {
    setItems([]);
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        subtotal,
        itemCount,
        isDrawerOpen,
        setDrawerOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
