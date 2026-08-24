import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-ink text-paper mt-24">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <p className="text-paper/60 text-sm mt-3 max-w-xs">
            Considered clothing, cut for the way people actually move through their days.
          </p>
        </div>

        <div>
          <p className="text-xs tracking-widest uppercase text-paper/40 mb-4">Shop</p>
          <ul className="space-y-2 text-sm text-paper/80">
            <li><Link href="/products/all">All Products</Link></li>
            <li><Link href="/brand">Our Brand</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs tracking-widest uppercase text-paper/40 mb-4">Company</p>
          <ul className="space-y-2 text-sm text-paper/80">
            <li><Link href="/about">About</Link></li>
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/wishlist">Wishlist</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs tracking-widest uppercase text-paper/40 mb-4">Account</p>
          <ul className="space-y-2 text-sm text-paper/80">
            <li><Link href="/signin">Sign In</Link></li>
            <li><Link href="/profile">My Profile</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/10 py-6 text-center text-xs text-paper/40">
        &copy; {new Date().getFullYear()} All rights reserved.
      </div>
    </footer>
  );
}
