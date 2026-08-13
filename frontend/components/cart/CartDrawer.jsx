"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "../../context/CartContext";

export default function CartDrawer() {
  const { items, isDrawerOpen, setDrawerOpen, updateQuantity, removeItem, subtotal } = useCart();

  return (
    <>
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-ink/40 z-50"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-paper z-50 shadow-2xl transform transition-transform duration-300 flex flex-col ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 h-20 border-b border-ink/10">
          <h2 className="font-display text-xl">Your Bag ({items.length})</h2>
          <button onClick={() => setDrawerOpen(false)} className="text-sm uppercase tracking-widest">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {items.length === 0 && (
            <p className="text-ink/50 text-sm">Your bag is empty. Start exploring the collection.</p>
          )}

          {items.map((item) => (
            <div key={item.lineId} className="flex gap-4">
              <div className="relative w-20 h-24 bg-sand shrink-0">
                {item.image && (
                  <Image src={item.image} alt={item.name} fill className="object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm">{item.name}</p>
                <p className="text-xs text-ink/50 mt-1">
                  {item.size ? `Size ${item.size}` : ""} {item.color ? `· ${item.color}` : ""}
                </p>
                <p className="text-sm mt-1">${item.price.toFixed(2)}</p>

                <div className="flex items-center gap-3 mt-2">
                  <button
                    className="w-6 h-6 border border-ink/20 text-xs"
                    onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                  >
                    -
                  </button>
                  <span className="text-sm">{item.quantity}</span>
                  <button
                    className="w-6 h-6 border border-ink/20 text-xs"
                    onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    className="ml-auto text-xs uppercase text-burgundy"
                    onClick={() => removeItem(item.lineId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="border-t border-ink/10 px-6 py-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-ink/50">Shipping and taxes calculated at checkout.</p>
            <Link
              href="/checkout"
              onClick={() => setDrawerOpen(false)}
              className="btn-primary w-full"
            >
              Checkout
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
