"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import AuthGuard from "../../components/auth/AuthGuard";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { formatINR } from "../../lib/currency";
import { buildAddressSummary, listenToUserAddresses } from "../../lib/accountFirestore";
import { CheckCircle2, CreditCard, Lock, MapPin, Package, ShieldCheck } from "lucide-react";

const SHIPPING_FLAT_RATE = 8;
const ZIP_LOOKUP_MIN_LENGTH = 6;

const PAYMENT_OPTIONS = [
  {
    value: "cod",
    label: "Cash on Delivery",
    description: "Pay when your order is delivered.",
    meta: "FREE",
    icon: Package,
  },
  {
    value: "card",
    label: "Credit / Debit Card",
    description: "Secure online payment.",
    meta: "Instant",
    icon: CreditCard,
  },
];

function addressToForm(address, profile) {
  if (typeof address === "string") {
    return {
      fullName: profile?.displayName || "",
      line1: address,
      line2: "",
      city: "",
      state: "",
      zip: "",
      country: "India",
      phone: profile?.phone || "",
    };
  }

  if (!address) {
    return {
      fullName: profile?.displayName || "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      zip: "",
      country: "India",
      phone: profile?.phone || "",
    };
  }

  return {
    fullName: address.fullName || profile?.displayName || "",
    line1: address.line1 || "",
    line2: address.line2 || "",
    city: address.city || "",
    state: address.state || "",
    zip: address.zip || "",
    country: address.country || "India",
    phone: address.phone || profile?.phone || "",
  };
}

function getPreferredAddress(addresses, profile, selectedAddressId) {
  const bySelectedId = addresses.find((item) => item.id === selectedAddressId);
  if (bySelectedId) return bySelectedId;

  const defaultAddress =
    addresses.find((item) => item.isDefault) ||
    (profile?.defaultAddressId
      ? addresses.find((item) => item.id === profile.defaultAddressId)
      : null) ||
    (profile?.defaultAddress?.id
      ? addresses.find((item) => item.id === profile.defaultAddress.id)
      : null);

  return defaultAddress || addresses[0] || profile?.defaultAddress || profile?.address || null;
}

function CheckoutForm() {
  const { items, subtotal, clearCart } = useCart();
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [zipLookupLoading, setZipLookupLoading] = useState(false);
  const [zipLookupError, setZipLookupError] = useState("");
  const [zipVerified, setZipVerified] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [address, setAddress] = useState({
    fullName: profile?.displayName || "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "India",
    phone: profile?.phone || "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const selectedPayment = PAYMENT_OPTIONS.find((option) => option.value === paymentMethod) || PAYMENT_OPTIONS[0];

  useEffect(() => {
    if (!user?.uid) {
      setAddresses([]);
      setAddressesLoading(false);
      return undefined;
    }

    setAddressesLoading(true);
    return listenToUserAddresses(
      user.uid,
      (items) => {
        setAddresses(Array.isArray(items) ? items : []);
        setAddressesLoading(false);
      },
      (error) => {
        console.error(error);
        setAddresses([]);
        setAddressesLoading(false);
      }
    );
  }, [user?.uid]);

  useEffect(() => {
    const preferredAddress = getPreferredAddress(addresses, profile, selectedAddressId);

    if (preferredAddress) {
      const nextAddressId = preferredAddress.id || "";
      if (nextAddressId && nextAddressId !== selectedAddressId) {
        setSelectedAddressId(nextAddressId);
      }
      setAddress(addressToForm(preferredAddress, profile));
      return;
    }

    setAddress((current) => ({
      ...current,
      fullName: current.fullName || profile?.displayName || "",
      phone: current.phone || profile?.phone || "",
      country: current.country || "India",
    }));
  }, [addresses, profile, selectedAddressId]);

  useEffect(() => {
    const zip = String(address.zip || "").trim();

    if (zip.length < ZIP_LOOKUP_MIN_LENGTH) {
      setZipLookupLoading(false);
      setZipLookupError("");
      setZipVerified(false);
      return undefined;
    }

    let active = true;
    const controller = new AbortController();

    async function lookupZipCode() {
      setZipLookupLoading(true);
      setZipLookupError("");

      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(zip)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to verify ZIP code.");
        }

        const data = await response.json();
        const result = Array.isArray(data) ? data[0] : null;
        const office = result?.PostOffice?.[0];

        if (!active) return;

        if (result?.Status !== "Success" || !office) {
          setZipVerified(false);
          setZipLookupError("Enter a valid ZIP / postal code.");
          return;
        }

        setZipVerified(true);
        setAddress((current) => ({
          ...current,
          city: office.District || current.city,
          state: office.State || current.state,
          country: current.country || "India",
        }));
      } catch (error) {
        if (!active || error?.name === "AbortError") return;
        setZipVerified(false);
        setZipLookupError("Enter a valid ZIP / postal code.");
      } finally {
        if (active) setZipLookupLoading(false);
      }
    }

    lookupZipCode();

    return () => {
      active = false;
      controller.abort();
    };
  }, [address.zip]);

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
      const orderPayload = {
        customerName: address.fullName || profile?.displayName || "",
        customerEmail: profile?.email || user?.email || "",
        customerPhone: address.phone || profile?.phone || "",
        shippingAddress: address,
        paymentMethod,
        paymentStatus: "pending",
        items: items.map(({ productId, slug, name, price, size, color, quantity, image, lineId }) => ({
          productId,
          slug,
          name,
          price,
          unitPrice: price,
          size,
          color,
          quantity,
          image,
          lineId,
        })),
        subtotal,
        shipping,
        discount: 0,
        total,
        currency: "INR",
      };

      const created = await api.createOrder(orderPayload);
      clearCart();
      toast.success("Order placed!");
      router.push(`/checkout/success/${created.orderId || created.id}`);
    } catch (err) {
      toast.error(err.message || "Could not place order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs tracking-[0.35em] text-tangerine uppercase">Almost there</p>
          <h1 className="font-display text-4xl text-ink sm:text-5xl">Checkout</h1>
          <p className="max-w-2xl text-sm leading-6 text-ink/60 sm:text-base">
            Review your shipping details, pick a payment method, and place your order securely.
          </p>
        </div>
        <div className="flex items-start gap-3 border border-ink/10 bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="grid h-11 w-11 place-items-center bg-[#fff3ea] text-tangerine">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-ink">Secure Checkout</p>
            <p className="text-sm text-ink/55">Your data is safe with us</p>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { step: "1", label: "Shipping", active: true },
          { step: "2", label: "Payment", active: false },
          { step: "3", label: "Review", active: false },
          { step: "4", label: "Confirmation", active: false },
        ].map((item) => (
          <div key={item.step} className="flex flex-col items-center gap-2 text-center">
            <div
              className={`grid h-10 w-10 place-items-center border text-sm font-medium sm:h-11 sm:w-11 ${
                item.active
                  ? "border-tangerine bg-tangerine text-white"
                  : "border-ink/20 bg-white text-ink/65"
              }`}
            >
              {item.step}
            </div>
            <div className="text-[11px] font-medium uppercase tracking-[0.25em] text-ink/60 sm:text-xs">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handlePlaceOrder} className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)] lg:gap-8">
        <div className="space-y-6">
          <section className="border border-ink/10 bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.03)] sm:p-6 lg:p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center bg-[#fff3ea] text-tangerine">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-2xl text-ink">Shipping Information</h3>
                <p className="mt-1 text-sm text-ink/55">Enter your delivery address</p>
              </div>
            </div>

          {addressesLoading ? (
            <div className="mb-6 border border-ink/10 bg-[#fffaf6] px-4 py-3 text-sm text-ink/65">
              Loading your saved addresses...
            </div>
          ) : addresses.length > 0 ? (
            <div className="mb-6 space-y-3">
              <p className="text-xs tracking-widest uppercase text-ink/45">Saved Addresses</p>
              <div className="space-y-3">
                {addresses.map((savedAddress, index) => {
                  const isSelected = savedAddress.id === selectedAddressId;
                  const summary = buildAddressSummary(savedAddress);
                  return (
                    <label
                      key={savedAddress.id}
                      className={`flex cursor-pointer items-start gap-3 border px-4 py-4 transition-colors sm:px-5 ${
                        isSelected
                          ? "border-tangerine bg-[#fff7f0] shadow-[0_8px_24px_rgba(255,106,0,0.08)]"
                          : "border-ink/15 bg-white hover:bg-[#fffaf6]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="saved-address"
                        className="mt-1"
                        checked={isSelected}
                        onChange={() => setSelectedAddressId(savedAddress.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-lg text-ink">
                            {savedAddress.label || `Address ${index + 1}`}
                          </span>
                          {savedAddress.isDefault ? (
                            <span className="border border-tangerine/20 bg-tangerine/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-tangerine">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-ink/70">{summary}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mb-6 border border-ink/10 bg-[#fffaf6] px-4 py-3 text-sm text-ink/65">
              No saved addresses found. Fill in the form below to use a new shipping address.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              required
              value={address.fullName}
              onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
            />
            <Input
              label="Phone Number"
              required
              value={address.phone}
              onChange={(e) => setAddress({ ...address, phone: e.target.value })}
            />
          </div>
          <Input
            label="Address"
            required
            value={address.line1}
            onChange={(e) => setAddress({ ...address, line1: e.target.value })}
          />
          <Input
            label="Address Line 2"
            value={address.line2}
            onChange={(e) => setAddress({ ...address, line2: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1fr]">
            <Input
              label="ZIP / Postal Code"
              required
              inputMode="numeric"
              maxLength={6}
              value={address.zip}
              onChange={(e) => {
                const nextZip = e.target.value.replace(/\D/g, "").slice(0, 6);
                setAddress({
                  ...address,
                  zip: nextZip,
                  city: "",
                  state: "",
                });
              }}
            />
            <Input
              label="City / Town"
              required
              value={address.city}
              readOnly={zipVerified}
              disabled={zipVerified}
              className={zipVerified ? "bg-[#faf7f2] cursor-not-allowed" : ""}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
            />
            <Input
              label="State"
              required
              value={address.state}
              readOnly={zipVerified}
              disabled={zipVerified}
              className={zipVerified ? "bg-[#faf7f2] cursor-not-allowed" : ""}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
            />
          </div>
          <div className="mb-4 flex items-start gap-2 text-xs text-ink/60">
            <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${zipVerified ? "text-emerald-600" : "text-ink/35"}`} />
            {zipLookupLoading ? (
              <span>Verifying ZIP code and loading city/state...</span>
            ) : zipVerified ? (
              <span className="text-emerald-700">ZIP verified. City and state are locked.</span>
            ) : zipLookupError ? (
              <span className="text-rose-700">{zipLookupError}</span>
            ) : (
              <span>Enter a valid ZIP / postal code to auto-fill city and state.</span>
            )}
          </div>
          <Input
            label="Country"
            value={address.country}
            onChange={(e) => setAddress({ ...address, country: e.target.value })}
          />
          </section>

          <section className="border border-ink/10 bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.03)] sm:p-6 lg:p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center bg-[#fff3ea] text-tangerine">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-2xl text-ink">Payment Method</h3>
                <p className="mt-1 text-sm text-ink/55">Choose your preferred payment option</p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {PAYMENT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const checked = paymentMethod === option.value;

                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-stretch gap-3 border p-4 transition-all ${
                      checked
                        ? "border-tangerine bg-[#fff7f0] shadow-[0_8px_24px_rgba(255,106,0,0.08)]"
                        : "border-ink/15 bg-white hover:bg-[#fffaf6]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={checked}
                      onChange={() => setPaymentMethod(option.value)}
                      className="mt-1"
                    />
                    <div className={`grid h-11 w-11 shrink-0 place-items-center ${checked ? "bg-tangerine text-white" : "bg-[#fff3ea] text-tangerine"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink">{option.label}</p>
                          <p className="mt-1 text-sm text-ink/60">{option.description}</p>
                        </div>
                        <span className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-600">
                          {option.meta}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-ink/55">
              <ShieldCheck className="h-4 w-4 text-tangerine" />
              <span>Selected payment method: {selectedPayment.label}</span>
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-6 lg:sticky lg:top-6">
          <div className="border border-ink/10 bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.03)] sm:p-6">
            <div className="mb-6 flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center bg-[#fff3ea] text-tangerine">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-2xl text-ink">Order Summary</h3>
                <p className="mt-1 text-sm text-ink/55">Review the items in your cart</p>
              </div>
            </div>

          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.lineId} className="flex gap-3 border border-ink/10 p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden bg-[#fff7f0]">
                  <img
                    src={item.image || "/placeholder-product.svg"}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{item.name}</p>
                      <p className="mt-1 text-sm text-ink/60">
                        {item.size ? `Size: ${item.size}` : "One size"}
                        {item.color ? ` | ${item.color}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-ink/60">Qty: {item.quantity}</p>
                    </div>
                    <span className="shrink-0 font-medium text-ink">{formatINR(item.price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-ink/10 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-ink/70">
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-ink/70">
              <span>Shipping</span>
              <span>{formatINR(shipping)}</span>
            </div>
            <div className="flex justify-between text-base font-medium pt-2">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>

            <Button type="submit" loading={loading} className="mt-6 w-full">
              Place Order
            </Button>
          </div>

          <div className="border border-ink/10 bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.03)] sm:p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-tangerine" />
                <div>
                  <p className="font-medium text-ink">Secure Payments</p>
                  <p className="text-sm text-ink/55">100% secure and encrypted transactions</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-tangerine" />
                <div>
                  <p className="font-medium text-ink">Easy Returns</p>
                  <p className="text-sm text-ink/55">Hassle-free support after purchase</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
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
