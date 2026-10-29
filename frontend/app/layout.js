import { Fraunces, Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext";
import { WishlistProvider } from "../context/WishlistContext";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import SiteFooter from "../components/layout/SiteFooter";
import CartDrawer from "../components/cart/CartDrawer";
import ScrollToTopButton from "../components/ui/ScrollToTopButton";
import { Toaster } from "react-hot-toast";
import StructuredData from "../SEO/StructuredData";
import { getRequestOrigin } from "../SEO/schemaUtils";
import { createOrganizationSchema } from "../SEO/organizationSchema";
import { createWebsiteSchema } from "../SEO/websiteSchema";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "Tangerine Fashion World",
  description: "Tangerine brings a refined perspective to everyday dressing, defined by clean silhouettes, considered details, and an understated warmth that feels distinctly its own.",
  keywords: [
    "Tangerine",
    "Tangerine Fashion World",
    "Tangerine World",
    "Tangerine clothing",
    "Tangerine clothes",
    "Tangerine brand",
    "Tangerine shop",
    "Tangerine shopping",
    "Tangerine Mumbai",
    "Tangerine AUM",
    "Tangerine Atharva University Mumbai",
    "Tangerine Atharva University",
    "Tangerine Blue Ocean Resort",
    "Tangerine Ratnagiri",
    "Tangerine Blue Ocean The Fern Resort & Spa",
    "Atharva University Mumbai",
    "Atharva University",
    "AUM",
    "Blue Ocean Resort",
    "Blue Ocean The Fern Resort & Spa",
  ],
  icons: {
    icon: "/Images/favicon.png",
  },
};

export default function RootLayout({ children }) {
  const requestHeaders = headers();
  const origin = getRequestOrigin(requestHeaders);

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <StructuredData schema={createOrganizationSchema(origin)} />
        <StructuredData schema={createWebsiteSchema(origin)} />
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <Navbar />
              <CartDrawer />
              <main className="min-h-[70vh]">{children}</main>
              <SiteFooter><Footer /></SiteFooter>
              <Toaster position="bottom-right" />
              <ScrollToTopButton />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
