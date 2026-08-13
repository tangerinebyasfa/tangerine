"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import AuthGuard from "../../components/auth/AuthGuard";
import PageHeader from "../../components/ui/PageHeader";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

const SHIPPING_FLAT_RATE = 8;

function CheckoutForm() {
  const { items, subtotal, clearCart } = useCart();
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    fullName: profile?.displayName || "",
    line1: "",
    city: "",
    state: "",
    zip: "",
    phone: profile?.phone || "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const shipping = items.length ? SHIPPING_FLAT_RATE : 0;
  const total = subtotal + shipping;

  async function handlePlaceOrder(e) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your bag is empty");
      return;
    }
    setLoading(true);
    try {
      const order = await api.createOrder({
        items: items.map(({ productId, name, price, size, color, quantity, image }) => ({
          productId,
          name,
          price,
          size,
          color,
          quantity,
          image,
        })),
        shippingAddress: address,
        paymentMethod,
        subtotal,
        shipping,
        total,
      });
      clearCart();
      toast.success("Order placed!");
      router.push("/orders");
    } catch (err) {
      toast.error(err.message || "Could not place order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <PageHeader eyebrow="Almost There" title="Checkout" />

      <form onSubmit={handlePlaceOrder} className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <h3 className="font-display text-xl mb-4">Shipping Address</h3>
          <Input
            label="Full Name"
            required
            value={address.fullName}
            onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
          />
          <Input
            label="Address"
            required
            value={address.line1}
            onChange={(e) => setAddress({ ...address, line1: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              required
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
            />
            <Input
              label="State"
              required
              value={address.state}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ZIP / Postal Code"
              required
              value={address.zip}
              onChange={(e) => setAddress({ ...address, zip: e.target.value })}
            />
            <Input
              label="Phone"
              required
              value={address.phone}
              onChange={(e) => setAddress({ ...address, phone: e.target.value })}
            />
          </div>

          <h3 className="font-display text-xl mb-4 mt-8">Payment Method</h3>
          <div className="space-y-3">
            {[
              { value: "cod", label: "Cash on Delivery" },
              { value: "card", label: "Credit / Debit Card" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 text-sm border border-ink/20 px-4 py-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === opt.value}
                  onChange={() => setPaymentMethod(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="border border-ink/10 p-6 h-fit">
          <h3 className="font-display text-xl mb-4">Order Summary</h3>
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.lineId} className="flex justify-between text-sm">
                <span className="text-ink/70">{item.name} × {item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-ink/10 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-medium pt-2">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          <Button type="submit" loading={loading} className="w-full mt-6">
            Place Order
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <AuthGuard>
      <CheckoutForm />
    </AuthGuard>
  );
}
