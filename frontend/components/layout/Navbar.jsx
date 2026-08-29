"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, LogIn, Menu, ShoppingBag, UserRound, Search, X, Heart, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";

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
  const { user, profile, isAdmin, logout } = useAuth();
  const { itemCount, setDrawerOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  function closeMobileMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-ink/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <span className="sr-only">Home</span>
            <Image
              src="/Images/logo.png"
              alt="Tangerine"
              width={180}
              height={60}
              priority
              className="h-12 md:h-14 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
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

          <div className="flex items-center gap-4 md:gap-5">
            <Link
              href="/products/all"
              className="relative hidden md:inline-flex text-ink hover:text-tangerine transition-colors"
              aria-label="Search products"
            >
              <Search className="h-5 w-5" strokeWidth={2} />
            </Link>

            <button
              onClick={() => setDrawerOpen(true)}
              className="relative hidden md:inline-flex text-ink hover:text-tangerine transition-colors"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={2} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-tangerine text-paper text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            <div className="relative hidden md:block">
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

            <button
              className="md:hidden text-ink hover:text-tangerine transition-colors"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              <Menu className="h-6 w-6" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

            {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 md:hidden" onClick={closeMobileMenu}>
          <div
            className="absolute left-1/2 top-4 h-[calc(100vh-5rem)] w-[min(100vw-2rem,24.5rem)] -translate-x-1/2 overflow-hidden bg-paper shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-full flex-col px-5 pb-5 pt-6">
              <div className="flex items-center justify-between border-b border-ink/20 pb-3">
                <span className="text-[13px] uppercase tracking-[0.08em] text-ink/65">Search</span>
                <div className="flex items-center gap-3">
                  <Link href="/products/all" className="text-ink" aria-label="Search products" onClick={closeMobileMenu}>
                    <Search className="h-5 w-5" strokeWidth={2} />
                  </Link>
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

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-ink/10 bg-paper">
        <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1 px-4 py-2 text-center text-[10px] uppercase tracking-[0.16em] text-ink/70">
          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              router.push("/");
            }}
            className="flex flex-col items-center gap-1"
            aria-label="Home"
          >
            <Home className="h-5 w-5" strokeWidth={2} />
            Home
          </button>
          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              router.push("/products/all");
            }}
            className="flex flex-col items-center gap-1"
            aria-label="Search"
          >
            <Search className="h-5 w-5" strokeWidth={2} />
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              setDrawerOpen(true);
            }}
            className="flex flex-col items-center gap-1"
            aria-label="Open cart"
          >
            <span className="relative inline-flex h-6 w-6 items-center justify-center">
              <ShoppingBag className="h-5 w-5" strokeWidth={2} />
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-burgundy px-1 text-[9px] font-semibold leading-none text-paper shadow-sm ring-2 ring-paper">
                  {itemCount}
                </span>
              )}
            </span>
            Cart
          </button>
          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              router.push("/profile#wishlist");
            }}
            className="flex flex-col items-center gap-1"
            aria-label="Open wishlist"
          >
            <span className="relative inline-flex h-6 w-6 items-center justify-center">
              <Heart className="h-5 w-5" strokeWidth={2} />
              {wishlistCount > 0 && (
                <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-burgundy px-1 text-[9px] font-semibold leading-none text-paper shadow-sm ring-2 ring-paper">
                  {wishlistCount}
                </span>
              )}
            </span>
            Wishlist
          </button>
          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              router.push(user ? "/profile" : "/signin");
            }}
            className="flex flex-col items-center gap-1"
            aria-label="Account"
          >
            <UserRound className="h-5 w-5" strokeWidth={2} />
            Account
          </button>
        </div>
      </div>    </>
  );
}

