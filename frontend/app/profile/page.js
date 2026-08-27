"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Bell,
  Camera,
  ChevronRight,
  Heart,
  LogOut,
  MapPin,
  Package2,
  PencilLine,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import AuthGuard from "../../components/auth/AuthGuard";
import Input from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";
import {
  buildAddressSummary,
  createAddress,
  deleteAddress,
  loadProductsByIds,
  listenToUserAddresses,
  listenToUserOrders,
  setDefaultAddress,
  updateAddress,
} from "../../lib/accountFirestore";
import { listenToUserReviews } from "../../lib/reviewFirestore";
import { db, doc, serverTimestamp, setDoc } from "../../lib/firebase";
import { formatINR } from "../../lib/currency";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../lib/image";

const summaryCards = [
  { key: "total", label: "Total Orders", icon: Package2 },
  { key: "delivered", label: "Delivered", icon: Truck },
  { key: "processing", label: "Processing", icon: ShieldCheck },
  { key: "wishlist", label: "Wishlist", icon: Heart },
];

const orderStatusStyles = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  shipped: "bg-sky-50 text-sky-700 border-sky-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

const EMPTY_PROFILE_FORM = {
  displayName: "",
  phone: "",
  gender: "",
};

const EMPTY_ADDRESS_FORM = {
  label: "Home",
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
  country: "India",
  phone: "",
  isDefault: false,
};

function normalizeText(value) {
  return String(value || "").trim();
}

function formatDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMemberSince(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return "Just joined";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAddressLines(address, fallbackName) {
  if (!address) {
    return fallbackName ? [fallbackName, "Add a default shipping address."] : ["Add a default shipping address."];
  }

  if (typeof address === "string") {
    const parts = address
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean);

    return parts.length ? parts : [address];
  }

  const parts = [];
  if (address.label) parts.push(address.label);
  if (address.fullName) parts.push(address.fullName);
  if (address.line1) parts.push(address.line1);
  if (address.line2) parts.push(address.line2);

  const cityLine = [address.city, address.state, address.zip].filter(Boolean).join(", ");
  if (cityLine) parts.push(cityLine);
  if (address.country) parts.push(address.country);
  if (address.phone) parts.push(address.phone);

  return parts.length ? parts : ["Add a default shipping address."];
}

function shortOrderId(orderId) {
  return String(orderId || "").slice(-6).toUpperCase();
}

function getOrderItemCount(order) {
  if (!Array.isArray(order?.items)) return 0;
  return order.items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
}

function getWishlistIds(items) {
  return items.map((item) => normalizeText(item.productId || item.id)).filter(Boolean);
}

function SidebarLink({ item }) {
  const Icon = item.icon;

  const isActive = Boolean(item.active);
  const sharedClassName = [
    "flex w-full items-center justify-between border px-3 py-3 text-sm transition-all duration-200",
    isActive
      ? "border-tangerine/25 bg-[#fff4ea] text-ink shadow-[0_8px_24px_rgba(255,106,0,0.08)]"
      : "border-transparent text-ink/72 hover:border-ink/10 hover:bg-[#fff7f0] hover:text-ink",
  ].join(" ");

  const inner = (
    <>
      <span className="flex items-center gap-3">
        <span className={`grid h-9 w-9 place-items-center border ${isActive ? "border-tangerine bg-tangerine text-paper" : "border-ink/10 bg-[#fff4eb] text-tangerine"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className={isActive ? "font-medium text-ink" : "text-ink/72"}>{item.label}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-ink/35" />
    </>
  );

  return (
    <button
      type="button"
      className={sharedClassName}
      onClick={item.onClick}
      aria-pressed={isActive}
    >
      {inner}
    </button>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {action}
    </div>
  );
}

function StatTile({ label, value, icon: Icon, id }) {
  return (
    <div id={id} className="flex items-center gap-4 border border-ink/10 bg-[#fffaf6] px-4 py-4">
      <div className="grid h-12 w-12 place-items-center border border-ink/10 bg-white text-tangerine">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-display text-2xl leading-none text-ink">{value}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-ink/45">{label}</p>
      </div>
    </div>
  );
}

function ProfileDashboard() {
  const router = useRouter();
  const { user, profile, refreshProfile, logout } = useAuth();
  const { wishlistItems, removeFromWishlist, wishlistCount } = useWishlist();
  const contentRef = useRef(null);
  const [activeSection, setActiveSection] = useState("profile");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [reviewHistoryLoading, setReviewHistoryLoading] = useState(true);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);

  useEffect(() => {
    if (!profile) return;

    setProfileForm({
      displayName: profile.displayName || "",
      phone: profile.phone || "",
      gender: profile.gender || "",
    });
  }, [profile]);

  useEffect(() => {
    if (!user?.uid) return undefined;

    setOrdersLoading(true);
    return listenToUserOrders(
      user.uid,
      (items) => {
        setOrders(Array.isArray(items) ? items : []);
        setOrdersLoading(false);
      },
      (error) => {
        console.error(error);
        setOrders([]);
        setOrdersLoading(false);
      }
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return undefined;

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

  const wishlistIds = useMemo(() => getWishlistIds(wishlistItems), [wishlistItems]);
  const wishlistIdKey = useMemo(() => wishlistIds.join("|"), [wishlistIds]);

  useEffect(() => {
    let active = true;

    if (!wishlistIds.length) {
      setWishlistProducts([]);
      setWishlistLoading(false);
      return () => {
        active = false;
      };
    }

    setWishlistLoading(true);
    loadProductsByIds(wishlistIds)
      .then((items) => {
        if (active) setWishlistProducts(items);
      })
      .catch((error) => {
        console.error(error);
        if (active) setWishlistProducts([]);
      })
      .finally(() => {
        if (active) setWishlistLoading(false);
      });

    return () => {
      active = false;
    };
  }, [wishlistIdKey]);

  useEffect(() => {
    if (!user?.uid) return undefined;

    setReviewHistoryLoading(true);
    return listenToUserReviews(
      user.uid,
      (items) => {
        setReviewHistory(Array.isArray(items) ? items : []);
        setReviewHistoryLoading(false);
      },
      (error) => {
        console.error(error);
        setReviewHistory([]);
        setReviewHistoryLoading(false);
      }
    );
  }, [user?.uid]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncSectionFromHash = () => {
      const hash = window.location.hash.replace("#", "").trim();
      if (["profile", "orders", "addresses", "wishlist", "reviews"].includes(hash)) {
        setActiveSection(hash);
      }
    };

    syncSectionFromHash();
    window.addEventListener("hashchange", syncSectionFromHash);

    return () => {
      window.removeEventListener("hashchange", syncSectionFromHash);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;
    if (!contentRef.current) return;

    const hash = window.location.hash.replace("#", "").trim();
    if (!["profile", "orders", "addresses", "wishlist", "reviews"].includes(hash)) return;

    const top = contentRef.current.getBoundingClientRect().top + window.scrollY - 12;
    window.scrollTo({ top, behavior: "smooth" });
  }, [activeSection]);

  const productMap = useMemo(() => new Map(wishlistProducts.map((product) => [String(product.id), product])), [wishlistProducts]);

  const wishlistRows = useMemo(
    () =>
      wishlistItems.map((entry) => {
        const product = productMap.get(String(entry.productId || entry.id));
        return {
          wishlistId: String(entry.productId || entry.id),
          addedAt: entry.addedAt,
          product,
        };
      }),
    [wishlistItems, productMap]
  );

  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((order) => String(order?.status || "").toLowerCase() === "delivered").length;
  const processingOrders = orders.filter((order) => {
    const status = String(order?.status || "pending").toLowerCase();
    return status === "pending" || status === "processing" || status === "shipped";
  }).length;
  const defaultAddress = addresses.find((address) => address.isDefault) || profile?.defaultAddress || null;
  const profileImage = normalizeImageUrl(profile?.photoURL) || null;
  const memberSince = formatMemberSince(profile?.createdAt);

  async function handleSaveProfile(event) {
    event.preventDefault();

    if (!db || !user?.uid) return;

    const displayName = normalizeText(profileForm.displayName);
    const phone = normalizeText(profileForm.phone);
    const gender = normalizeText(profileForm.gender);

    setProfileSaving(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName,
          phone,
          gender,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await refreshProfile();
      toast.success("Profile updated");
      setProfileFormOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to update profile");
    } finally {
      setProfileSaving(false);
    }
  }

  function openCreateAddress() {
    setEditingAddressId(null);
    setAddressForm({
      ...EMPTY_ADDRESS_FORM,
      isDefault: addresses.length === 0,
    });
    setAddressFormOpen(true);
  }

  function openEditAddress(address) {
    setEditingAddressId(address.id);
    setAddressForm({
      label: address.label || "Home",
      fullName: address.fullName || "",
      line1: address.line1 || "",
      line2: address.line2 || "",
      city: address.city || "",
      state: address.state || "",
      zip: address.zip || "",
      country: address.country || "India",
      phone: address.phone || "",
      isDefault: Boolean(address.isDefault),
    });
    setAddressFormOpen(true);
  }

  async function handleSaveAddress(event) {
    event.preventDefault();
    setAddressSaving(true);

    try {
      if (editingAddressId) {
        await updateAddress(editingAddressId, addressForm);
        toast.success("Address updated");
      } else {
        await createAddress(addressForm);
        toast.success("Address added");
      }

      setAddressFormOpen(false);
      setEditingAddressId(null);
      setAddressForm(EMPTY_ADDRESS_FORM);
      await refreshProfile();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to save address");
    } finally {
      setAddressSaving(false);
    }
  }

  async function handleDeleteAddress(addressId) {
    const confirmed = window.confirm("Delete this address?");
    if (!confirmed) return;

    try {
      await deleteAddress(addressId);
      toast.success("Address removed");
      await refreshProfile();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to delete address");
    }
  }

  async function handleSetDefault(addressId) {
    try {
      await setDefaultAddress(addressId);
      toast.success("Default address updated");
      await refreshProfile();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to update default address");
    }
  }

  async function handleRemoveWishlist(productId) {
    try {
      await removeFromWishlist(productId);
      toast.success("Removed from wishlist");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove item");
    }
  }

  async function handleLogout() {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error(error);
      toast.error("Could not sign out");
    }
  }

  const sectionButtonItems = [
    { key: "profile", label: "My Profile", icon: UserRound, active: activeSection === "profile" },
    { key: "orders", label: "Orders", icon: Package2, active: activeSection === "orders" },
    { key: "addresses", label: "Addresses", icon: MapPin, active: activeSection === "addresses" },
    { key: "wishlist", label: "Wishlist", icon: Heart, active: activeSection === "wishlist" },
    { key: "reviews", label: "My Reviews", icon: Star, active: activeSection === "reviews" },
  ];

  function renderActiveSection() {
    if (activeSection === "profile") {
      return (
        <section className="border border-ink/10 bg-white/95 p-6 shadow-[0_18px_60px_rgba(17,17,17,0.06)] backdrop-blur">
          <SectionHeader
            title="Profile Information"
            action={
              <button
                type="button"
                onClick={() => setProfileFormOpen(true)}
                className="inline-flex items-center gap-2 border border-tangerine/30 bg-[#fff7f1] px-4 py-2 text-sm font-medium text-tangerine transition-colors hover:bg-tangerine hover:text-white"
              >
                <PencilLine className="h-4 w-4" />
                Edit
              </button>
            }
          />

          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <div className="relative mx-auto h-40 w-40">
              <div className="absolute inset-0 border border-ink/10 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,106,0,0.28),_rgba(255,235,219,0.95))]" />
              <div className="absolute inset-3 overflow-hidden border border-ink/10 bg-[#fff3ea]">
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt={profile?.displayName || "Profile photo"}
                    fill
                    className="object-cover"
                    unoptimized={isGoogleDriveImageUrl(profileImage)}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="font-display text-5xl text-tangerine/45">
                      {(profile?.displayName || user?.email || "A").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute bottom-3 right-4 grid h-10 w-10 place-items-center border-4 border-white bg-tangerine text-white shadow-lg">
                <Camera className="h-4 w-4" />
              </div>
            </div>

            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <ProfileRow label="Name" value={profile?.displayName || "Not set"} />
              <ProfileRow label="Email" value={profile?.email || user?.email || "-"} />
              <ProfileRow label="Phone" value={profile?.phone || "Not set"} />
              <ProfileRow label="Gender" value={profile?.gender || "Not specified"} />
              <ProfileRow label="Member Since" value={memberSince} />
              <ProfileRow label="Default Address" value={buildAddressSummary(defaultAddress) || "Add an address"} />
            </dl>
          </div>

          <div className="mt-6 border-t border-ink/10 pt-6">
            <SectionHeader
             title="Order Summary"
           
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <StatTile
                  key={card.key}
                  id={card.key === "wishlist" ? "wishlist" : undefined}
                  label={card.label}
                  icon={card.icon}
                  value={
                    card.key === "total"
                      ? totalOrders
                      : card.key === "delivered"
                        ? deliveredOrders
                        : card.key === "processing"
                          ? processingOrders
                          : wishlistCount
                  }
                />
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-ink/10 pt-6">
            <SectionHeader
              title="Your Posted Reviews"
              action={
                <Link href="/products/all" className="inline-flex items-center gap-2 text-sm font-medium text-tangerine">
                  Browse Products
                  <ChevronRight className="h-4 w-4" />
                </Link>
              }
            />
            <p className="mb-4 text-sm leading-6 text-ink/55">
              Reviews you have submitted on products will appear here, along with the product link, rating, and date.
            </p>

            {reviewHistoryLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="h-28 animate-pulse border border-ink/10 bg-sand/60" />
                ))}
              </div>
            ) : reviewHistory.length === 0 ? (
              <div className="border border-dashed border-ink/10 bg-[#fffaf6] p-8 text-center">
                <Star className="mx-auto h-8 w-8 text-tangerine/60" fill="currentColor" />
                <p className="mt-4 font-display text-2xl text-ink">No reviews yet</p>
                <p className="mt-2 text-sm leading-6 text-ink/55">
                  Your product review history will appear here after you share feedback on an order.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviewHistory.map((review) => {
                  const href = `/product/${review.productSlug || review.productId}`;

                  return (
                    <article
                      key={review.id}
                      className="grid gap-4 border border-ink/10 bg-[#fffaf6] p-4 md:grid-cols-[72px_minmax(0,1fr)_auto] md:items-center"
                    >
                      <Link href={href} className="block">
                        <div className="relative h-18 w-18 overflow-hidden border border-ink/10 bg-paper">
                          {review.productImage ? (
                            <Image
                              src={normalizeImageUrl(review.productImage)}
                              alt={review.productName || "Review product"}
                              fill
                              className="object-cover"
                              unoptimized={isGoogleDriveImageUrl(review.productImage)}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-sand text-[10px] uppercase tracking-[0.14em] text-ink/40">
                              Review
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-medium text-ink">{review.productName || "Product"}</h3>
                          {review.purchaseVerified ? (
                            <span className="inline-flex border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-700">
                              Verified Purchase
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-ink/45">{formatDate(review.createdAt)}</p>
                        <p className="mt-3 text-sm leading-6 text-ink/70">{review.comment}</p>
                      </div>

                      <div className="flex flex-col items-start gap-2 md:items-end">
                        <p className="text-sm font-medium text-ink">{review.rating}/5</p>
                        <Link href={href} className="text-xs uppercase tracking-[0.18em] text-tangerine">
                          View Product
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      );
    }

    if (activeSection === "orders") {
      return (
        <section className="border border-ink/10 bg-white/95 p-6 shadow-[0_18px_60px_rgba(17,17,17,0.06)] backdrop-blur">
          <SectionHeader title="Order History" />

          {ordersLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-28 animate-pulse border border-ink/10 bg-sand/60" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="border border-dashed border-ink/10 bg-[#fffaf6] p-8 text-center">
              <p className="font-display text-2xl text-ink">No orders yet</p>
              <p className="mt-2 text-sm leading-6 text-ink/55">
                When you place your first order, it will appear here with the product breakdown and status.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const status = String(order?.status || "pending").toLowerCase();
                const total = Number(order?.total || order?.subtotal || 0);
                const itemCount = getOrderItemCount(order);
                const firstItem = order?.items?.[0];
                const image = normalizeImageUrl(firstItem?.image) || "/placeholder-product.svg";

                return (
                  <article key={order.id} className="grid gap-4 border border-ink/10 p-4 md:grid-cols-[92px_minmax(0,1fr)_auto] md:items-center">
                    <div className="relative h-24 w-full overflow-hidden border border-ink/10 bg-[#fff6ef] md:h-24 md:w-24">
                      <Image
                        src={image}
                        alt={firstItem?.name || "Order item"}
                        fill
                        className="object-cover"
                        unoptimized={isGoogleDriveImageUrl(image)}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-medium text-ink">Order #{shortOrderId(order.id)}</h3>
                        <span
                          className={`inline-flex border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${
                            orderStatusStyles[status] || "border-ink/10 bg-sand text-ink/70"
                          }`}
                        >
                          {String(status || "pending").charAt(0).toUpperCase() + String(status || "pending").slice(1)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink/45">{formatDate(order.createdAt)}</p>

                      <div className="mt-3 flex flex-wrap gap-2 text-sm text-ink/60">
                        {Array.isArray(order.items) && order.items.slice(0, 3).map((item) => (
                          <span key={`${order.id}-${item.productId || item.name}`} className="border border-ink/10 px-2 py-1">
                            {item.name} x {item.quantity}
                          </span>
                        ))}
                        {Array.isArray(order.items) && order.items.length > 3 ? (
                          <span className="border border-ink/10 px-2 py-1">+{order.items.length - 3} more</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.24em] text-ink/40">Items</p>
                        <p className="text-sm font-medium text-ink">
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.24em] text-ink/40">Total</p>
                        <p className="text-sm font-medium text-ink">{formatINR(total)}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      );
    }

    if (activeSection === "addresses") {
      return (
        <section className="border border-ink/10 bg-white/95 p-6 shadow-[0_18px_60px_rgba(17,17,17,0.06)] backdrop-blur">
          <SectionHeader
            title="Saved Addresses"
            action={
              <button
                type="button"
                onClick={openCreateAddress}
                className="inline-flex items-center gap-2 border border-tangerine/30 bg-[#fff7f1] px-4 py-2 text-sm font-medium text-tangerine transition-colors hover:bg-tangerine hover:text-white"
              >
                <Plus className="h-4 w-4" />
                Add Address
              </button>
            }
          />

          {addressesLoading ? (
            <div className="space-y-4">
              {[0, 1].map((index) => (
                <div key={index} className="h-32 animate-pulse border border-ink/10 bg-sand/60" />
              ))}
            </div>
          ) : addresses.length === 0 ? (
            <div className="border border-dashed border-ink/10 bg-[#fffaf6] p-8 text-center">
              <p className="font-display text-2xl text-ink">No saved addresses</p>
              <p className="mt-2 text-sm leading-6 text-ink/55">
                Add a delivery address to speed up checkout and keep one address marked as default.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {addresses.map((address) => {
                const lines = formatAddressLines(address);

                return (
                  <article key={address.id} className="border border-ink/10 bg-[#fffaf6] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-xl text-ink">{address.label || "Address"}</p>
                        {address.isDefault ? (
                          <span className="mt-2 inline-flex border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700">
                            Default
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {!address.isDefault ? (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(address.id)}
                            className="border border-ink/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-ink/70 transition-colors hover:bg-white"
                          >
                            Set Default
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openEditAddress(address)}
                          className="border border-ink/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-ink/70 transition-colors hover:bg-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(address.id)}
                          className="border border-rose-200 px-3 py-2 text-xs uppercase tracking-[0.18em] text-rose-700 transition-colors hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1 text-sm leading-6 text-ink/70">
                      {lines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      );
    }

    if (activeSection === "wishlist") {
      return (
        <section className="border border-ink/10 bg-white/95 p-6 shadow-[0_18px_60px_rgba(17,17,17,0.06)] backdrop-blur">
          <SectionHeader
            title="Wishlist"
            action={
              <Link href="/products/all" className="inline-flex items-center gap-2 text-sm font-medium text-tangerine">
                Continue Shopping
                <ChevronRight className="h-4 w-4" />
              </Link>
            }
          />

          {wishlistLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="h-72 animate-pulse border border-ink/10 bg-sand/60" />
              ))}
            </div>
          ) : wishlistRows.length === 0 ? (
            <div className="border border-dashed border-ink/10 bg-[#fffaf6] p-8 text-center">
              <Heart className="mx-auto h-8 w-8 text-tangerine/60" fill="currentColor" />
              <p className="mt-4 font-display text-2xl text-ink">Your wishlist is empty</p>
              <p className="mt-2 text-sm leading-6 text-ink/55">
                Save items from product pages to keep track of the pieces you love.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {wishlistRows.map(({ wishlistId, product }) => {
                const productHref = product?.slug ? `/product/${product.slug}` : product?.id ? `/product/${product.id}` : "/products/all";
                const image = normalizeImageUrl(product?.image || product?.images?.[0]) || "/placeholder-product.svg";

                return (
                  <article key={wishlistId} className="border border-ink/10 bg-[#fffaf6] p-4">
                    <Link href={productHref} className="block">
                      <div className="relative aspect-[4/5] overflow-hidden border border-ink/10 bg-paper">
                        <Image
                          src={image}
                          alt={product?.name || "Wishlist product"}
                          fill
                          className="object-cover"
                          unoptimized={isGoogleDriveImageUrl(image)}
                        />
                      </div>

                      <div className="mt-4">
                        <h3 className="line-clamp-2 font-medium text-ink">{product?.name || "Wishlist product"}</h3>
                        <p className="mt-2 text-sm text-ink/55">{formatINR(Number(product?.salePrice || product?.price || 0))}</p>
                      </div>
                    </Link>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <Link href={productHref} className="text-xs uppercase tracking-[0.18em] text-tangerine">
                        View Product
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemoveWishlist(wishlistId)}
                        aria-label="Remove from wishlist"
                        className="inline-flex h-10 w-10 items-center justify-center border border-rose-200 text-rose-700 transition-colors hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      );
    }

  }

  return (
    <div className="relative overflow-hidden bg-[#fcfaf7]">
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,_rgba(255,106,0,0.12),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(17,17,17,0.05),_transparent_35%)]" />
      <div className="absolute left-0 top-28 h-48 w-48 bg-tangerine/5 blur-3xl" />
      <div className="absolute right-[-4rem] top-44 h-64 w-64 bg-amber-100/60 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow mb-3">Account Center</p>
            <h1 className="font-display text-4xl text-ink sm:text-5xl">My Profile</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/60 sm:text-base">
              Manage your account details, saved addresses, recent orders, and wishlist from one place.
            </p>
          </div>

          <Link href="/products/all" className="btn-outline rounded-none bg-white/80 backdrop-blur">
            Continue Shopping
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border border-ink/10 bg-white/90 p-4 shadow-[0_18px_60px_rgba(17,17,17,0.06)] backdrop-blur">
            <div className="space-y-2 px-2 pb-4 pt-1">
              <p className="text-[11px] uppercase tracking-[0.34em] text-ink/40">Menu</p>
              <p className="font-display text-xl text-ink">Your Account</p>
            </div>

            <nav className="space-y-1">
              {sectionButtonItems.map((item) => (
                <SidebarLink
                  key={item.key}
                  item={{
                    ...item,
                    onClick: () => setActiveSection(item.key),
                  }}
                />
              ))}
              <SidebarLink
                item={{
                  label: "Logout",
                  icon: LogOut,
                  onClick: handleLogout,
                }}
              />
            </nav>

            <div className="mt-6 border border-ink/10 bg-[#fff4ec] p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center border border-ink/10 bg-white text-tangerine">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-lg text-ink">Need Help?</p>
                  <p className="mt-1 text-sm leading-6 text-ink/65">
                    Reach out if anything about orders, delivery, or your account needs attention.
                  </p>
                </div>
              </div>

              <Link href="/contact" className="btn-outline mt-5 w-full rounded-none bg-white">
                Contact Us
              </Link>
            </div>
          </aside>

          <div ref={contentRef} className="space-y-6 transition-all duration-300 ease-out">
            {renderActiveSection()}
          </div>
        </div>
      </div>

      {profileFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl border border-ink/10 bg-white p-6 shadow-[0_30px_100px_rgba(17,17,17,0.2)]">
            <button
              type="button"
              onClick={() => setProfileFormOpen(false)}
              className="absolute right-4 top-4 border border-transparent p-2 text-ink/40 transition-colors hover:border-ink/10 hover:bg-sand hover:text-ink"
              aria-label="Close profile editor"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <p className="eyebrow mb-3">Edit Account</p>
              <h3 className="font-display text-3xl text-ink">Update Profile</h3>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <Input
                label="Full Name"
                value={profileForm.displayName}
                onChange={(event) => setProfileForm({ ...profileForm, displayName: event.target.value })}
              />
              <Input
                label="Phone"
                value={profileForm.phone}
                onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
              />
              <Input
                label="Gender"
                value={profileForm.gender}
                onChange={(event) => setProfileForm({ ...profileForm, gender: event.target.value })}
              />

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setProfileFormOpen(false)}
                  className="inline-flex items-center justify-center border border-ink/10 px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-sand"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="inline-flex items-center justify-center bg-tangerine px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-tangerine-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {profileSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {addressFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl border border-ink/10 bg-white p-6 shadow-[0_30px_100px_rgba(17,17,17,0.2)]">
            <button
              type="button"
              onClick={() => setAddressFormOpen(false)}
              className="absolute right-4 top-4 border border-transparent p-2 text-ink/40 transition-colors hover:border-ink/10 hover:bg-sand hover:text-ink"
              aria-label="Close address editor"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <p className="eyebrow mb-3">{editingAddressId ? "Edit Address" : "New Address"}</p>
              <h3 className="font-display text-3xl text-ink">
                {editingAddressId ? "Update saved address" : "Add a delivery address"}
              </h3>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Label"
                  value={addressForm.label}
                  onChange={(event) => setAddressForm({ ...addressForm, label: event.target.value })}
                />
                <Input
                  label="Full Name"
                  value={addressForm.fullName}
                  onChange={(event) => setAddressForm({ ...addressForm, fullName: event.target.value })}
                />
              </div>

              <Input
                label="Address Line 1"
                value={addressForm.line1}
                onChange={(event) => setAddressForm({ ...addressForm, line1: event.target.value })}
              />
              <Input
                label="Address Line 2"
                value={addressForm.line2}
                onChange={(event) => setAddressForm({ ...addressForm, line2: event.target.value })}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="City"
                  value={addressForm.city}
                  onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })}
                />
                <Input
                  label="State"
                  value={addressForm.state}
                  onChange={(event) => setAddressForm({ ...addressForm, state: event.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="ZIP / Postal Code"
                  value={addressForm.zip}
                  onChange={(event) => setAddressForm({ ...addressForm, zip: event.target.value })}
                />
                <Input
                  label="Phone"
                  value={addressForm.phone}
                  onChange={(event) => setAddressForm({ ...addressForm, phone: event.target.value })}
                />
              </div>

              <Input
                label="Country"
                value={addressForm.country}
                onChange={(event) => setAddressForm({ ...addressForm, country: event.target.value })}
              />

              <label className="flex items-center gap-3 border border-ink/10 px-4 py-3 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(event) => setAddressForm({ ...addressForm, isDefault: event.target.checked })}
                />
                Set as default address
              </label>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setAddressFormOpen(false)}
                  className="inline-flex items-center justify-center border border-ink/10 px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-sand"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addressSaving}
                  className="inline-flex items-center justify-center bg-tangerine px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-tangerine-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {addressSaving ? "Saving..." : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.24em] text-ink/40">{label}</dt>
      <dd className="mt-2 text-sm font-medium leading-6 text-ink">{value}</dd>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileDashboard />
    </AuthGuard>
  );
}
