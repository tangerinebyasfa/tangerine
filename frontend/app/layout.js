import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import CartDrawer from "../components/cart/CartDrawer";
import ScrollToTopButton from "../components/ui/ScrollToTopButton";
import { Toaster } from "react-hot-toast";

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
  title: "Tangerine | Considered Clothing",
  icons: {
    icon: "/Images/favicon.png",
  },
  description: "A fashion house for clothing that moves with you — shop new arrivals, curated edits, and timeless staples.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <CartDrawer />
            <main className="min-h-[70vh]">{children}</main>
            <Footer />
            <Toaster position="bottom-right" />
            <ScrollToTopButton />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
