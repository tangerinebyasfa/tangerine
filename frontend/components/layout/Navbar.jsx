"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  LogIn,
  Menu,
  ShoppingBag,
  UserRound,
  Search,
  X,
  Heart,
  ChevronDown,
  ArrowRight,
  LayoutGrid,
  Images,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { api } from "../../lib/api";
import { formatINR } from "../../lib/currency";
import { normalizeImageUrl } from "../../lib/image";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop by Category" },
  { href: "/gallery", label: "Gallery" },
  { href: "/products/outlet", label: "Outlet" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const mobileFeatureCards = [
  { href: "/products/all", label: "All Products", image: "/Images/HomePage/1mobile.png" },
  { href: "/products/outlet", label: "All Outlet", image: "/Images/HomePage/2mobile.png" },
  { href: "/gallery", label: "Gallery", image: "/Images/HomePage/3mobile.png" },
];

const mobileQuickLinks = [
  { href: "/products/new-in", label: "New In" },
  { href: "/products/all", label: "All Products" },
  { href: "/products/outlet", label: "Outlet" },
  { href: "/products/denim", label: "Everything Denim" },
  { href: "/products/basics", label: "Basics" },
  { href: "/products/most-loved", label: "Most Loved" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isAdmin, logout } = useAuth();
  const { itemCount, setDrawerOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchProducts, setSearchProducts] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);

  function closeMobileMenu() {
    setMenuOpen(false);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }

  function openSearch() {
    setMenuOpen(false);
    setUserMenuOpen(false);
    setSearchOpen(true);
  }

  useEffect(() => {
    if (!searchOpen) return undefined;

    let active = true;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeSearch();
    };

    const debounceId = window.setTimeout(() => {
      setSearchLoading(true);
      api
        .getProducts(searchQuery.trim() ? { search: searchQuery.trim() } : {})
        .then((items) => {
          if (!active) return;
          setSearchProducts(Array.isArray(items) ? items : []);
        })
        .catch((error) => {
          console.error(error);
          if (active) setSearchProducts([]);
        })
        .finally(() => {
          if (active) setSearchLoading(false);
        });
    }, searchQuery.trim() ? 220 : 0);

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      active = false;
      window.clearTimeout(debounceId);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus?.();
    }
  }, [searchOpen]);

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const searchResults = useMemo(() => searchProducts.slice(0, 6), [searchProducts]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    const query = searchQuery.trim();
    closeSearch();
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
  }

  function handleResultClick() {
    closeSearch();
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-ink/10">
        <div className="max-w-7xl mx-auto px-6 h-20 xl:h-24 flex items-center justify-between">
          <Link href="/products/outlet" className="flex items-center">
            <span className="sr-only">Outlet</span>
            <Image
              src="/Images/logo.png"
              alt="Tangerine"
              width={180}
              height={60}
              priority
              className="h-12 xl:h-16 w-auto object-contain"
            />
          </Link>

          <nav className="hidden xl:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs tracking-widest uppercase text-ink/70 hover:text-burgundy transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="text-xs tracking-widest uppercase text-burgundy hover:text-ink transition-colors"
              >
                Admin Panel
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4 xl:gap-5">
            <button
              type="button"
              onClick={openSearch}
              className="relative hidden xl:inline-flex text-ink hover:text-tangerine transition-colors"
              aria-label="Search products"
            >
              <Search className="h-5 w-5" strokeWidth={2} />
            </button>

            <button
              onClick={() => setDrawerOpen(true)}
              className="relative hidden xl:inline-flex text-ink hover:text-tangerine transition-colors"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={2} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-tangerine text-paper text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            <div className="relative hidden xl:block">
              {user ? (
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 text-ink hover:text-tangerine transition-colors"
                  aria-label="Open account menu"
                >
                  <UserRound className="h-5 w-5" strokeWidth={2} />
                  <span className="text-xs tracking-widest uppercase">
                    {profile?.displayName || "Account"}
                  </span>
                  <ChevronDown className="h-4 w-4" strokeWidth={2} />
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    href="/signin"
                    className="flex items-center gap-2 text-ink hover:text-tangerine transition-colors"
                    aria-label="Sign in"
                  >
                    <LogIn className="h-5 w-5" strokeWidth={2} />
                    <span className="text-xs tracking-widest uppercase">Sign In</span>
                  </Link>
                  <Link href="/signup" className="text-xs tracking-widest uppercase text-ink/70 hover:text-burgundy">
                    Sign Up
                  </Link>
                </div>
              )}

              {user && userMenuOpen && (
                <div
                  className="absolute right-0 mt-3 w-44 bg-paper border border-ink/10 shadow-lg py-2"
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-sand">
                    My Profile
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className="block px-4 py-2 text-sm hover:bg-sand">
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-sand text-burgundy"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 xl:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="relative text-ink transition-colors hover:text-tangerine"
                aria-label="Open cart"
              >
                <ShoppingBag className="h-5 w-5" strokeWidth={2} />
                {itemCount > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center bg-tangerine px-1 text-[9px] font-semibold leading-none text-paper">
                    {itemCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push("/profile#wishlist")}
                className="relative text-ink transition-colors hover:text-tangerine"
                aria-label="Open wishlist"
              >
                <Heart className="h-5 w-5" strokeWidth={2} />
                {wishlistCount > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center bg-burgundy px-1 text-[9px] font-semibold leading-none text-paper">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className="text-ink transition-colors hover:text-tangerine"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                <Menu className="h-6 w-6" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {searchOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/35" onClick={closeSearch} />
          <div className="fixed left-1/2 top-20 z-50 w-[min(100vw-1rem,28rem)] -translate-x-1/2 xl:left-auto xl:right-6 xl:top-24 xl:w-[min(92vw,28rem)] xl:translate-x-0">
            <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
              <form onSubmit={handleSearchSubmit} className="border-b border-ink/10 p-3">
                <div className="flex items-center gap-2 rounded-xl border border-ink/20 bg-white px-3 py-2">
                  <Search className="h-4 w-4 text-ink/35" strokeWidth={2} />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search products..."
                    className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-ink/40 transition-colors hover:text-ink"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </form>

              <div className="max-h-[20rem] overflow-y-auto p-2">
                {searchLoading ? (
                  <div className="p-4 text-sm text-ink/55">Loading products...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-sm text-ink/55">No products found.</div>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((product) => {
                      const image = normalizeImageUrl(product.images?.[0]) || "/placeholder-product.svg";
                      return (
                        <Link
                          key={product.id}
                          href={`/product/${product.slug || product.id}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sand/70"
                        >
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ink/10 bg-sand">
                            <Image src={image} alt={product.name || "Product"} fill className="object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                            <p className="truncate text-xs text-ink/50">
                              {product.description || product.categorySlug || "Product"}
                            </p>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-ink">{formatINR(product.price)}</p>
                              <ArrowRight className="h-4 w-4 text-tangerine" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-ink/10 p-3">
                <button
                  type="submit"
                  onClick={handleSearchSubmit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper transition-colors hover:bg-burgundy"
                >
                  Search all products
                </button>
              </div>
            </div>
          </div>
        </>
      )}

            {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 xl:hidden" onClick={closeMobileMenu}>
          <div
            className="absolute left-1/2 top-4 h-[calc(100vh-5rem)] w-[min(100vw-2rem,24.5rem)] -translate-x-1/2 overflow-hidden bg-paper shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-full flex-col px-5 pb-5 pt-6">
              <div className="flex items-center justify-between border-b border-ink/20 pb-3">
                <span className="text-[13px] uppercase tracking-[0.08em] text-ink/65">Search</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-ink"
                    aria-label="Search products"
                    onClick={() => {
                      closeMobileMenu();
                      openSearch();
                    }}
                  >
                    <Search className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={closeMobileMenu}
                    className="text-ink"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-6 border-b border-ink/10 pb-3">
                <button className="border-b-2 border-ink pb-1 text-sm font-semibold uppercase tracking-[0.06em]">Menu</button>
                <button className="pb-1 text-sm uppercase tracking-[0.06em] text-ink/40">#Onlymystyle</button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <div className="flex gap-3 pr-2">
                  {mobileFeatureCards.map((card) => (
                    <Link
                      key={card.href}
                      href={card.href}
                      onClick={closeMobileMenu}
                      className="relative h-44 w-36 shrink-0 overflow-hidden rounded-xl bg-sand"
                    >
                      <Image
                        src={card.image}
                        alt={card.label}
                        fill
                        sizes="144px"
                        className="object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-3">
                        <span className="text-xs font-medium uppercase tracking-[0.15em] text-paper">
                          {card.label}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex-1 overflow-y-auto pb-20">
                <div className="space-y-6 pr-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMobileMenu}
                      className="block text-sm font-medium uppercase tracking-[0.06em] text-ink/90"
                    >
                      {link.label}
                    </Link>
                  ))}
                  {isAdmin && (
                    <Link href="/admin" onClick={closeMobileMenu} className="block text-sm font-medium uppercase tracking-[0.06em] text-burgundy">
                      Admin Panel
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-ink/10 bg-paper">
        <div className="mx-auto grid w-full min-w-0 max-w-md grid-cols-5 items-center gap-1 overflow-hidden px-2 py-2 text-center text-[10px] uppercase tracking-[0.12em] text-ink/70">
          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              router.push("/");
            }}
            className="flex min-w-0 flex-col items-center gap-1"
            aria-label="Home"
          >
            <Home className="h-5 w-5" strokeWidth={2} />
            Home
          </button>
          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              openSearch();
            }}
            className="flex min-w-0 flex-col items-center gap-1"
            aria-label="Search"
          >
            <Search className="h-5 w-5" strokeWidth={2} />
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              router.push("/products");
            }}
            className="flex min-w-0 flex-col items-center gap-1"
            aria-label="Shop by category"
          >
            <LayoutGrid className="h-5 w-5" strokeWidth={2} />
            Category
          </button>
          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              router.push("/gallery");
            }}
            className="flex min-w-0 flex-col items-center gap-1"
            aria-label="Gallery"
          >
            <Images className="h-5 w-5" strokeWidth={2} />
            Gallery
          </button>
          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              router.push(user ? "/profile" : "/signin");
            }}
            className="flex min-w-0 flex-col items-center gap-1"
            aria-label="Account"
          >
            <UserRound className="h-5 w-5" strokeWidth={2} />
            Account
          </button>
        </div>
      </div>    </>
  );
}

