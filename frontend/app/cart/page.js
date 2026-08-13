"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "../../context/CartContext";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <PageHeader eyebrow="Your Selection" title="Shopping Bag" />

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-ink/50 mb-6">Your bag is empty.</p>
          <Link href="/products/all" className="btn-primary">Continue Shopping</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-12">
          <div className="md:col-span-2 divide-y divide-ink/10">
            {items.map((item) => (
              <div key={item.lineId} className="flex gap-4 py-6">
                <div className="relative w-24 h-28 bg-sand shrink-0">
                  {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{item.name}</p>
                  <p className="text-xs text-ink/50 mt-1">
                    {item.size ? `Size ${item.size}` : ""} {item.color ? `· ${item.color}` : ""}
                  </p>
                  <p className="text-sm mt-1">${item.price.toFixed(2)}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      className="w-7 h-7 border border-ink/20 text-sm"
                      onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span className="text-sm">{item.quantity}</span>
                    <button
                      className="w-7 h-7 border border-ink/20 text-sm"
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

          <div className="border border-ink/10 p-6 h-fit">
            <h3 className="font-display text-xl mb-4">Order Summary</h3>
            <div className="flex justify-between text-sm mb-2">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-ink/50 mb-6">Shipping and taxes calculated at checkout.</p>
            <Link href="/checkout" className="btn-primary w-full block text-center">
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
