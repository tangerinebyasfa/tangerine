"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LogIn, Menu, ShoppingBag, UserRound, ChevronDown, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { api } from "../../lib/api";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products/all", label: "Shop" },
  { href: "/products/outlet", label: "Outlet" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const { user, profile, isAdmin, logout } = useAuth();
  const { itemCount, setDrawerOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accessoriesOpen, setAccessoriesOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const accessoriesCloseTimerRef = useRef(null);

  useEffect(() => {
    let active = true;

    api
      .getSubcategories()
      .then((data) => {
        if (active) setCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setCategories([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (accessoriesCloseTimerRef.current) {
        clearTimeout(accessoriesCloseTimerRef.current);
      }
    };
  }, []);

  const accessoriesLinks = (Array.isArray(categories) ? categories : [])
    .filter((category) => category?.parentType === "accessories")
    .map((category) => ({
      href: `/products/${category.slug}`,
      label: category.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  function openAccessoriesMenu() {
    if (accessoriesCloseTimerRef.current) {
      clearTimeout(accessoriesCloseTimerRef.current);
      accessoriesCloseTimerRef.current = null;
    }
    setAccessoriesOpen(true);
  }

  function closeAccessoriesMenu() {
    if (accessoriesCloseTimerRef.current) {
      clearTimeout(accessoriesCloseTimerRef.current);
    }

    accessoriesCloseTimerRef.current = setTimeout(() => {
      setAccessoriesOpen(false);
    }, 2000);
  }

  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-ink/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="sr-only">Home</span>
          <Image
            src="/images/logo.png"
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
          <div
            className="relative"
            onMouseEnter={openAccessoriesMenu}
            onMouseLeave={closeAccessoriesMenu}
          >
            <Link
              href="/products/accessories"
              className="inline-flex items-center gap-1 text-xs tracking-widest uppercase text-ink/70 hover:text-burgundy transition-colors"
            >
              Accessories
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
            {accessoriesOpen && (
              <div
                className="absolute left-0 top-full mt-3 w-44 bg-paper border border-ink/10 shadow-lg py-2"
                onMouseEnter={openAccessoriesMenu}
                onMouseLeave={closeAccessoriesMenu}
              >
                {accessoriesLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-2 text-sm text-ink/80 hover:bg-sand hover:text-burgundy"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
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
            className="relative text-ink hover:text-tangerine transition-colors"
            aria-label="Search products"
          >
            <Search className="h-5 w-5" strokeWidth={2} />
          </Link>

          <button
            onClick={() => setDrawerOpen(true)}
            className="relative text-ink hover:text-tangerine transition-colors"
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
                <Link href="/orders" className="block px-4 py-2 text-sm hover:bg-sand">
                  My Orders
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

      {menuOpen && (
        <div className="md:hidden border-t border-ink/10 px-6 py-4 flex flex-col gap-4">
          <div className="flex items-center gap-4 pb-2">
            <Link href="/products/all" className="flex items-center gap-2 text-sm uppercase tracking-widest">
              <Search className="h-4 w-4" strokeWidth={2} />
              Search
            </Link>
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 text-sm uppercase tracking-widest"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={2} />
              Cart
            </button>
          </div>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm uppercase tracking-widest">
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setAccessoriesOpen((open) => !open)}
              className="flex items-center justify-between text-sm uppercase tracking-widest"
              aria-expanded={accessoriesOpen}
              aria-controls="mobile-accessories-menu"
            >
              <span>Accessories</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${accessoriesOpen ? "rotate-180" : ""}`}
                strokeWidth={2}
              />
            </button>
            {accessoriesOpen && (
              <div id="mobile-accessories-menu" className="pl-4 flex flex-col gap-3 border-l border-ink/10">
                {accessoriesLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="text-sm uppercase tracking-widest text-ink/70">
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {isAdmin && (
            <Link href="/admin" className="text-sm uppercase tracking-widest text-burgundy">
              Admin Panel
            </Link>
          )}
          {user ? (
            <>
              <Link href="/profile" className="text-sm uppercase tracking-widest">
                My Profile
              </Link>
              <Link href="/orders" className="text-sm uppercase tracking-widest">
                My Orders
              </Link>
              <button onClick={logout} className="text-sm uppercase tracking-widest text-left text-burgundy">
                Sign Out
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/signin" className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <LogIn className="h-4 w-4" strokeWidth={2} />
                Sign In
              </Link>
              <Link href="/signup" className="text-sm uppercase tracking-widest">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
