"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import AuthGuard from "../../components/auth/AuthGuard";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { formatINR } from "../../lib/currency";
import { loadRazorpayCheckout, razorpayKeyId } from "../../lib/razorpay";
import { buildAddressSummary } from "../../lib/accountFirestore";
import { Banknote, CheckCircle2, CreditCard, Lock, MapPin, Package, ShieldCheck, Tag, X, Zap } from "lucide-react";

const ZIP_LOOKUP_MIN_LENGTH = 6;
const CHECKOUT_STORAGE_PREFIX = "razorpay-checkout";
const COD_AVAILABLE = true;

// Cash on delivery keeps its own copy, because nothing is charged up front and
// the order is confirmed the moment it is placed.
const PAYMENT_OPTIONS = [
  {
    value: "razorpay",
    icon: Zap,
    title: "Pay Online",
    description: "UPI, cards, netbanking and wallets. Your order is confirmed only after the payment succeeds.",
    badge: "Secured",
  },
  ...(COD_AVAILABLE
    ? [{
        value: "cod",
        icon: Banknote,
        title: "Cash on Delivery",
        description: "Pay the confirmed total in cash when your order arrives. Available across India.",
        badge: "Pay at door",
      }]
    : []),
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
  const { items, subtotal: cartSubtotal, clearCart } = useCart();
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
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [quoteRevision, setQuoteRevision] = useState(0);
  const placing = useRef(false);
  const checkoutItems = useMemo(() => items.map(({ productId, quantity, size, color }) => ({ productId, quantity, size, color })), [items]);
  const quoteKey = JSON.stringify([checkoutItems, appliedCoupon?.code || "", user?.uid, quoteRevision]);
  const currentQuote = quote?.key === quoteKey ? quote : null;

  useEffect(() => {
    let active = true;
    setQuoteError("");
    if (!user || !checkoutItems.length) { setQuote(null); return; }
    async function loadQuote() {
      try {
        const storageKey = `${CHECKOUT_STORAGE_PREFIX}-${user.uid}`;
        let attempt = null;
        try { attempt = JSON.parse(sessionStorage.getItem(storageKey)); } catch {}
        if (attempt?.requestId) {
          const recovered = await api.recoverOrder(attempt.requestId);
          if (!active) return;
          // A prepaid attempt is recovered only once it is paid. A cash order is
          // confirmed the moment it is created, because nothing else is pending.
          const prepaid = recovered?.paymentMethod !== "cod" && recovered?.paymentStatus === "paid";
          const cash = recovered?.paymentMethod === "cod" && recovered?.status !== "cancelled";
          if (recovered && (prepaid || cash)) {
            sessionStorage.removeItem(storageKey);
            clearCart();
            router.push(`/checkout/success/${recovered.id}`);
            return;
          }
          // A released or failed one starts fresh.
          if (recovered) sessionStorage.removeItem(storageKey);
        }
        const result = await api.quoteOrder({ items: checkoutItems, couponCode: appliedCoupon?.code || "" });
        if (active) setQuote({ ...result, key: quoteKey });
      } catch (error) { if (active) { setQuote(null); setQuoteError(error.message); } }
    }
    loadQuote();
    return () => { active = false; };
  }, [quoteKey]);

  const hasSavedAddresses = addresses.length > 0;
  const hasMultipleSavedAddresses = addresses.length > 1;

  useEffect(() => {
    if (!user?.uid) {
      setAddresses([]);
      setAddressesLoading(false);
      return undefined;
    }

    setAddressesLoading(true);
    let active = true;

    api
      .getMyAddresses()
      .then((items) => {
        if (!active) return;
        setAddresses(Array.isArray(items) ? items : []);
      })
      .catch((error) => {
        if (!active) return;
        console.error(error);
        setAddresses([]);
      })
      .finally(() => {
        if (active) setAddressesLoading(false);
      });

    return () => {
      active = false;
    };
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

  const subtotal = currentQuote?.subtotal ?? cartSubtotal;
  const shipping = currentQuote?.shipping ?? 8;
  const couponDiscount = currentQuote?.discount ?? 0;
  const total = currentQuote?.total ?? subtotal + shipping;

  async function handleApplyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError("Enter a coupon code.");
      return;
    }

    setCouponLoading(true);
    setCouponError("");
    try {
      const result = await api.quoteOrder({ couponCode: code, items: checkoutItems });
      setAppliedCoupon({ code: result.couponCode });
      setCouponCode(result.couponCode);
      toast.success("Coupon applied");
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(error.message || "This coupon cannot be applied.");
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  }

  // Frees the reserved stock and coupon when the customer never completes payment.
  async function releaseAttempt(orderId, storageKey) {
    if (!orderId) return;
    try { await api.releaseUnpaidOrder(orderId); } catch (error) {
      console.warn("Could not release the unpaid order:", error);
    } finally {
      // A new attempt must not reuse a released order id.
      try { sessionStorage.removeItem(storageKey); } catch {}
    }
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your bag is empty");
      return;
    }
    if (placing.current || couponLoading || !currentQuote) return;
    placing.current = true;
    setLoading(true);
    setOrderError("");
    const storageKey = `${CHECKOUT_STORAGE_PREFIX}-${user.uid}`;
    let createdOrder = null;
    let paymentCaptured = false;
    let codPlaced = false;
    try {
      const orderPayload = {
        shippingAddress: address,
        paymentMethod,
        items: checkoutItems,
        couponCode: appliedCoupon?.code || "",
        quoteId: currentQuote.quoteId,
      };
      // Retain the same request after a timeout or page refresh. Store no address.
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(orderPayload)));
      const fingerprint = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
      let attempt = null;
      try { attempt = JSON.parse(sessionStorage.getItem(storageKey)); } catch {}
      if (attempt?.fingerprint !== fingerprint) {
        attempt = { fingerprint, requestId: crypto.randomUUID() };
        sessionStorage.setItem(storageKey, JSON.stringify(attempt));
      }
      const created = await api.createOrder({ ...orderPayload, requestId: attempt.requestId });
      createdOrder = created;

      // Cash on delivery is confirmed as soon as the order exists: no gateway
      // window to wait for, so there is nothing to release if the tab closes.
      if (paymentMethod === "cod") {
        codPlaced = true;
        sessionStorage.removeItem(storageKey);
        clearCart();
        toast.success("Order placed. Pay cash when it arrives.");
        router.push(`/checkout/success/${created.id}`);
        return;
      }

      const razorpayPublicKey = razorpayKeyId(created.razorpayKeyId);
      if (!created.razorpayOrderId || !razorpayPublicKey) {
        throw new Error("Online payment is unavailable right now. Please contact us or try again shortly.");
      }

      const Razorpay = await loadRazorpayCheckout();
      const success = await new Promise((resolve, reject) => {
        const instance = new Razorpay({
          key: razorpayPublicKey,
          amount: Math.round(Number(currentQuote.total) * 100),
          currency: "INR",
          name: "Tangerine",
          description: `Order ${created.displayOrderId || created.id}`,
          order_id: created.razorpayOrderId,
          prefill: {
            name: address.fullName,
            contact: address.phone,
            email: user.email || "",
          },
          notes: { orderId: created.id },
          theme: { color: "#ff6a00" },
          retry: { enabled: false },
          modal: {
            // The user abandoned or declined payment: give the stock back.
            ondismiss: () => reject(new Error("Payment window closed before the order was paid.")),
          },
          handler: (response) => resolve(response),
        });
        instance.on("payment.failed", (payload) => {
          const reason = payload?.error?.description || "Payment was declined.";
          reject(new Error(reason));
        });
        instance.open();
      });

      // The signature is verified server-side against the stored order id.
      paymentCaptured = true;
      const verified = await api.verifyOrderPayment(created.id, {
        razorpayPaymentId: success.razorpay_payment_id,
        razorpaySignature: success.razorpay_signature,
      });
      sessionStorage.removeItem(storageKey);
      clearCart();
      toast.success("Payment received. Your order is confirmed!");
      router.push(`/checkout/success/${verified?.id || created.id}`);
    } catch (err) {
      // A placed cash order is already a real order. Never cancel it here, or a
      // failure while navigating would silently refund the customer nothing
      // and take the item out of stock.
      if (codPlaced && createdOrder) {
        try { sessionStorage.removeItem(storageKey); } catch {}
        clearCart();
        router.push(`/checkout/success/${createdOrder.id}`);
        return;
      }
      // A captured payment is never released: the webhook will settle it.
      if (paymentCaptured) {
        setOrderError("We received your payment and are confirming it. This page updates in a moment.");
        try {
          const settled = await api.getOrder(createdOrder.id);
          if (settled?.paymentStatus === "paid") {
            sessionStorage.removeItem(storageKey);
            clearCart();
            router.push(`/checkout/success/${createdOrder.id}`);
          }
        } catch {}
        return;
      }
      if (createdOrder) {
        await releaseAttempt(createdOrder.id, storageKey);
      } else {
        try { sessionStorage.removeItem(storageKey); } catch {}
      }
      setOrderError(
        paymentMethod === "cod"
          ? err.message || "We could not place your order. Please retry."
          : err.message || "Could not complete your payment. Please retry."
      );
      setQuoteRevision((value) => value + 1);
    } finally {
      placing.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2 sm:space-y-3">
          <p className="text-[11px] tracking-[0.28em] text-tangerine uppercase sm:text-xs sm:tracking-[0.35em]">Almost there</p>
          <h1 className="font-display text-3xl text-ink sm:text-4xl lg:text-5xl">Checkout</h1>
          <p className="max-w-2xl text-sm leading-6 text-ink/60 sm:text-base">
            Review your delivery details and the confirmed total, then pay securely online with UPI, cards, netbanking or wallets, or choose cash on delivery.
          </p>
        </div>
        <div className="flex w-full items-start gap-3 border border-ink/10 bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)] sm:w-auto sm:shrink-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center bg-[#fff3ea] text-tangerine sm:h-11 sm:w-11">
            <Lock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink">Secure Checkout</p>
            <p className="text-sm text-ink/55">Your data is safe with us</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:grid-cols-4 sm:gap-4">
        {[
          { step: "1", label: "Shipping", active: true },
          { step: "2", label: "Payment", active: false },
          { step: "3", label: "Review", active: false },
          { step: "4", label: "Confirmation", active: false },
        ].map((item) => (
          <div key={item.step} className="flex min-w-0 flex-col items-center gap-2 text-center">
            <div
              className={`grid h-9 w-9 place-items-center border text-sm font-medium sm:h-11 sm:w-11 ${
                item.active
                  ? "border-tangerine bg-tangerine text-white"
                  : "border-ink/20 bg-white text-ink/65"
              }`}
            >
              {item.step}
            </div>
            <div className="max-w-full break-words px-0.5 text-[10px] font-medium uppercase leading-tight tracking-[0.14em] text-ink/60 sm:px-1 sm:text-xs sm:tracking-[0.25em]">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handlePlaceOrder} className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)] lg:gap-8">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <section className="border border-ink/10 bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.03)] sm:p-6 lg:p-8">
            <div className="mb-4 flex items-start gap-3 sm:mb-6 sm:gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center bg-[#fff3ea] text-tangerine sm:h-12 sm:w-12">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-xl text-ink sm:text-2xl">Shipping Information</h3>
                <p className="mt-1 text-sm text-ink/55">Enter your delivery address</p>
              </div>
            </div>

            {addressesLoading ? (
              <div className="mb-4 border border-ink/10 bg-[#fffaf6] px-3 py-3 text-sm text-ink/65 sm:mb-6 sm:px-4">
                Loading your saved addresses...
              </div>
            ) : hasSavedAddresses ? (
              <div className="mb-4 space-y-3 sm:mb-6 sm:space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] tracking-widest uppercase text-ink/45 sm:text-xs">Saved Addresses</p>
                    <p className="mt-1 text-sm text-ink/60">
                      {hasMultipleSavedAddresses
                        ? "Choose the address you want to ship to."
                        : "Your saved address is selected below."}
                    </p>
                  </div>
                  {hasMultipleSavedAddresses ? (
                    <div className="shrink-0 rounded-full border border-ink/10 bg-[#fffaf6] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink/55 sm:text-xs">
                      {addresses.length} saved
                    </div>
                  ) : null}
                </div>

                {hasMultipleSavedAddresses ? (
                  <div className="space-y-3">
                    {addresses.map((savedAddress, index) => {
                      const isSelected = savedAddress.id === selectedAddressId;
                      const summary = buildAddressSummary(savedAddress);
                      return (
                        <label
                          key={savedAddress.id}
                          className={`flex cursor-pointer items-start gap-3 border px-3 py-3 transition-colors sm:px-5 sm:py-4 ${
                            isSelected
                              ? "border-tangerine bg-[#fff7f0] shadow-[0_8px_24px_rgba(255,106,0,0.08)]"
                              : "border-ink/15 bg-white hover:bg-[#fffaf6]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="saved-address"
                            className="mt-1 shrink-0"
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
                ) : (
                  <div className="border border-ink/10 bg-[#fffaf6] px-3 py-3 sm:px-4 sm:py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center border border-tangerine/20 bg-white text-tangerine">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-ink">
                          {addresses[0].label || "Saved Address"}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-ink/70">
                          {buildAddressSummary(addresses[0])}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4 border border-ink/10 bg-[#fffaf6] px-3 py-3 text-sm text-ink/65 sm:mb-6 sm:px-4">
                No saved addresses found. Fill in the form below to use a new shipping address.
              </div>
            )}

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-[1.15fr_1fr_1fr]">
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
          <div className="mb-3 flex items-start gap-2 text-xs text-ink/60 sm:mb-4">
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
            <div className="mb-4 flex items-start gap-3 sm:mb-6 sm:gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center bg-[#fff3ea] text-tangerine sm:h-12 sm:w-12">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-xl text-ink sm:text-2xl">Payment Method</h3>
                <p className="mt-1 text-sm text-ink/55">Pay securely online, or in cash when your order arrives.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4">
              {PAYMENT_OPTIONS.map((option) => {
                const isSelected = paymentMethod === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-3 border p-3 transition-colors sm:p-4 ${
                      isSelected
                        ? "border-tangerine bg-[#fff7f0] shadow-[0_8px_24px_rgba(255,106,0,0.08)]"
                        : "border-ink/15 bg-white hover:bg-[#fffaf6]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      className="relative h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full border border-tangerine bg-white transition-colors checked:bg-tangerine after:absolute after:inset-0 after:m-auto after:h-1.5 after:w-1.5 after:rounded-full after:bg-white after:opacity-0 after:transition-opacity checked:after:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2"
                      checked={isSelected}
                      onChange={() => {
                        setPaymentMethod(option.value);
                        setOrderError("");
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3 sm:items-stretch">
                        <div
                          className={`grid h-10 w-10 shrink-0 place-items-center sm:h-11 sm:w-11 ${
                            isSelected ? "bg-tangerine text-white" : "bg-[#fff3ea] text-tangerine"
                          }`}
                        >
                          <option.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-ink">{option.title}</p>
                              <p className="mt-1 text-sm text-ink/60">{option.description}</p>
                            </div>
                            <span
                              className={`shrink-0 self-start text-[11px] font-medium uppercase tracking-[0.2em] sm:text-xs ${
                                isSelected ? "text-emerald-600" : "text-ink/40"
                              }`}
                            >
                              {option.badge}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-3 flex flex-col gap-2 text-xs text-ink/55 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
              {paymentMethod === "cod" ? (
                <>
                  <span className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-tangerine" />
                    Pay the confirmed total in cash at the door
                  </span>
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-tangerine" />
                    We never ask for card or UPI details
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-tangerine" />
                    Razorpay encrypted checkout
                  </span>
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-tangerine" />
                    We never store card or UPI details
                  </span>
                </>
              )}
            </div>
          </section>
        </div>

        <aside className="h-fit min-w-0 space-y-4 sm:space-y-6 lg:sticky lg:top-6">
          <div className="border border-ink/10 bg-white p-3 sm:p-4 lg:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.03)]">
            <div className="mb-4 flex items-start gap-3 sm:mb-6 sm:gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center bg-[#fff3ea] text-tangerine sm:h-12 sm:w-12">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-xl text-ink sm:text-2xl">Order Summary</h3>
                <p className="mt-1 text-sm text-ink/55">Review the items in your cart</p>
              </div>
            </div>

          <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1 sm:max-h-64">
            {items.map((item, itemIndex) => (
              <div key={item.lineId} className="flex gap-3 border border-ink/10 p-2.5 sm:p-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden bg-[#fff7f0] sm:h-16 sm:w-16">
                  <img
                    src={item.image || "/placeholder-product.svg"}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{item.name}</p>
                      <p className="mt-1 text-sm text-ink/60">
                        {item.size ? `Size: ${item.size}` : "One size"}
                        {item.color ? ` | ${item.color}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-ink/60">Qty: {item.quantity}</p>
                    </div>
                    <span className="shrink-0 font-medium text-ink">{formatINR(currentQuote?.items?.[itemIndex]?.lineTotal ?? item.price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-4 border border-ink/10 bg-[#fffaf6] p-3 sm:mb-5 sm:p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-ink"><Tag className="h-4 w-4 shrink-0 text-tangerine" /> Apply Coupon</div>
            {appliedCoupon ? (
              <div className="mt-3 flex items-center justify-between gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:gap-3"><span className="min-w-0 break-words"><strong>{appliedCoupon.code}</strong> applied</span><button type="button" onClick={handleRemoveCoupon} disabled={loading} aria-label="Remove coupon" className="shrink-0 text-emerald-700"><X className="h-4 w-4" /></button></div>
            ) : (
              <div className="mt-3 flex gap-2"><input aria-label="Coupon code" maxLength={40} disabled={loading || couponLoading} value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }} placeholder="Enter code" className="min-w-0 flex-1 border border-ink/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-tangerine sm:py-2" /><button type="button" onClick={handleApplyCoupon} disabled={couponLoading || loading || !couponCode.trim()} className="shrink-0 border border-tangerine px-3 py-2.5 text-xs font-semibold uppercase tracking-widest text-tangerine disabled:opacity-50 sm:py-2">{couponLoading ? "Checking" : "Apply"}</button></div>
            )}
            {couponError ? <p className="mt-2 text-xs text-rose-600">{couponError}</p> : null}
            {appliedCoupon ? <p className="mt-2 text-xs text-ink/55">Coupon discount: {formatINR(couponDiscount)}</p> : null}
          </div>

          <div className="space-y-2 border-t border-ink/10 pt-4">
            <div className="flex items-baseline justify-between gap-3 text-sm text-ink/70">
              <span>Subtotal</span>
              <span className="shrink-0">{formatINR(subtotal)}</span>
            </div>
            {appliedCoupon ? <div className="flex items-baseline justify-between gap-3 text-sm text-emerald-700"><span className="min-w-0 break-words">Coupon ({appliedCoupon.code})</span><span className="shrink-0">- {formatINR(couponDiscount)}</span></div> : null}
            <div className="flex items-baseline justify-between gap-3 text-sm text-ink/70">
              <span>Shipping</span>
              <span className="shrink-0">{formatINR(shipping)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 pt-2 text-base font-medium">
              <span>Final Total</span>
              <span className="shrink-0">{formatINR(total)}</span>
            </div>
          </div>

            <div className="mt-3 text-sm sm:mt-4" aria-live="polite">
              {!currentQuote && !quoteError && items.length > 0 ? <p>Confirming current prices and stock?</p> : null}
              {quoteError ? <p className="text-rose-700">{quoteError}</p> : null}
              {orderError ? <p className="text-rose-700">{orderError}</p> : null}
              {(quoteError || orderError) ? <button type="button" disabled={loading} onClick={() => { setQuote(null); setQuoteRevision(value => value + 1); }} className="mt-2 underline">Refresh total</button> : null}
              <p className="mt-2 text-ink/60">
                {paymentMethod === "cod"
                  ? "You can cancel from your order details before shipment. Nothing is charged until your order arrives."
                  : "You can cancel from your order details before shipment, and prepaid amounts are refunded to the original payment method."}
              </p>
            </div>
            <Button type="submit" loading={loading} disabled={!currentQuote || !items.length || loading || couponLoading} className="mt-4 w-full sm:mt-6">
              {loading
                ? paymentMethod === "cod" ? "Placing your order..." : "Opening secure payment..."
                : paymentMethod === "cod"
                  ? `Place Order  ${formatINR(total)}`
                  : `Pay ${formatINR(total)} Securely`}
            </Button>
          </div>

          <div className="border border-ink/10 bg-white p-3 shadow-[0_12px_40px_rgba(0,0,0,0.03)] sm:p-6">
            <div className="space-y-4">
              {paymentMethod === "cod" ? (
                <div className="flex items-start gap-3">
                  <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-tangerine" />
                  <div className="min-w-0">
                    <p className="font-medium text-ink">Cash on Delivery</p>
                    <p className="text-sm text-ink/55">
                      Your order is confirmed the moment you place it. Keep the exact amount ready for the delivery agent.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-tangerine" />
                  <div className="min-w-0">
                    <p className="font-medium text-ink">Secure Online Payment</p>
                    <p className="text-sm text-ink/55">
                      Payments open in a Razorpay window. If you close it without paying, your reserved items are released straight away.
                    </p>
                  </div>
                </div>
              )}
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
