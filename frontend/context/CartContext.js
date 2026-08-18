"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { normalizeImageUrl } from "../lib/image";

const CartContext = createContext(null);
const STORAGE_KEY = "fashion-cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  // Load persisted cart on first mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch {
      // ignore corrupted storage
    }
  }, []);

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function addItem(product, { size, color, quantity = 1 } = {}) {
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
          image: normalizeImageUrl(product.images?.[0]),
          size: size || null,
          color: color || null,
          quantity,
        },
      ];
    });
    setDrawerOpen(true);
  }

  function updateQuantity(lineId, quantity) {
    if (quantity <= 0) return removeItem(lineId);
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
