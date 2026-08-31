"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Clock3,
  MapPin,
  Phone,
  Store,
  MessageCircle,
} from "lucide-react";
import { api } from "../../../lib/api";
import ProductCard from "../../../components/product/ProductCard";
import PageHeader from "../../../components/ui/PageHeader";
import Spinner from "../../../components/ui/Spinner";

const MAIN_TYPES = ["accessories", "clothes", "footwear"];

const TYPE_COPY = {
  accessories: {
    title: "Accessories",
    description: "Browse all accessories from the current edit.",
  },
  clothes: {
    title: "Clothes",
    description: "Browse all clothing pieces from the current edit.",
  },
  footwear: {
    title: "Footwear",
    description: "Browse all footwear from the current edit.",
  },
};

const OUTLET_LOCATIONS = [
  {
    name: "Atharva University",
    label: "Flagship Outlet",
    address: [
      "Atharva University",
      "Malad West, Mumbai",
    ],
    phone: "+91 98765 43210",
    whatsapp: "+91 98765 43210",
    hours: ["Mon - Sat: 10:30 AM - 9:00 PM", "Sunday: 11:00 AM - 8:00 PM"],
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d941.9848015891606!2d72.82593776963357!3d19.197857465401317!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7b72b40faf091%3A0x372093a6375172fa!2sAtharva%20University%20Mumbai!5e0!3m2!1sen!2sin!4v1788167211768!5m2!1sen!2sin",
  },
  {
    name: "Blue Ocean Resort",
    label: "City Boutique Outlet",
    address: [
      "Blue Ocean Resort",
      "Ganpatipule, Ratnagiri",
      "Maharashtra, 415612",
    ],
    phone: "+91 98765 43211",
    whatsapp: "+91 98765 43211",
    hours: ["Mon - Sat: 11:00 AM - 8:30 PM", "Sunday: 11:30 AM - 7:30 PM"],
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3811.80749379707!2d73.25541007607045!3d17.179573108756795!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bea0d22b314f62f%3A0xd7222cf5ca7e771b!2sBlue%20Ocean%20The%20Fern%20Resort%20%26%20Spa%20Ganpatipule%2C%20Series%20by%20Marriott!5e0!3m2!1sen!2sin!4v1788167283728!5m2!1sen!2sin",
  },
];

function OutletCard({ outlet }) {
  return (
    <div className="group border border-ink/10 bg-paper overflow-hidden">
      <div className="relative bg-gradient-to-br from-sand via-paper to-sand/40 p-6 md:p-7 border-b border-ink/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">{outlet.label}</p>
            <h2 className="font-display text-3xl md:text-4xl">{outlet.name}</h2>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/10 bg-paper text-burgundy shadow-sm">
            <Store className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-5 max-w-xl text-sm leading-7 text-ink/60">
          This space can hold the exact address, store-specific notes, offers, appointment info,
          parking guidance, or any other outlet details you want to communicate clearly.
        </p>
      </div>

      <div className="grid gap-6 p-6 md:p-7 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="flex gap-3">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-burgundy" />
            <div>
              <p className="text-xs tracking-widest uppercase text-ink/40 mb-2">Address</p>
              <div className="space-y-1 text-sm leading-6 text-ink/80">
                {outlet.address.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Clock3 className="mt-1 h-5 w-5 shrink-0 text-burgundy" />
            <div>
              <p className="text-xs tracking-widest uppercase text-ink/40 mb-2">Hours</p>
              <div className="space-y-1 text-sm leading-6 text-ink/80">
                {outlet.hours.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={`tel:${outlet.phone.replace(/\s+/g, "")}`}
              className="flex items-center gap-3 border border-ink/10 px-4 py-3 text-sm hover:bg-sand transition-colors"
            >
              <Phone className="h-4 w-4 text-burgundy" />
              <span>{outlet.phone}</span>
            </a>
            <a
              href={`https://wa.me/${outlet.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 border border-ink/10 px-4 py-3 text-sm hover:bg-sand transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-burgundy" />
              <span>WhatsApp us</span>
            </a>
          </div>
        </div>

        <div className="overflow-hidden border border-ink/10 bg-white">
          <iframe
            src={outlet.mapSrc}
            title={`${outlet.name} location map`}
            width="600"
            height="450"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-[320px] w-full border-0 md:h-full"
          />
        </div>
      </div>
    </div>
  );
}

export default function CategoryPage() {
  const { category } = useParams();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("q")?.trim() || searchParams.get("search")?.trim() || "";
  const [products, setProducts] = useState([]);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (category === "outlet") {
      setProducts([]);
      setCategoryInfo(null);
      setLoading(false);
      return undefined;
    }

    let active = true;

    async function loadProducts() {
      setLoading(true);
      try {
        const isAll = category === "all";
        const isMainType = MAIN_TYPES.includes(category);
        const [productList, info] = await Promise.all([
          api.getProducts(
            {
              ...(isAll ? {} : isMainType ? { type: category } : { category }),
              ...(searchTerm ? { search: searchTerm } : {}),
            }
          ),
          isAll || isMainType ? Promise.resolve(null) : api.getSubcategory(category).catch(() => null),
        ]);
        if (!active) return;
        setProducts(productList);
        setCategoryInfo(info);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProducts();

    const refreshProducts = () => {
      if (document.visibilityState === "visible") {
        loadProducts();
      }
    };

    const interval = setInterval(loadProducts, 15000);

    window.addEventListener("focus", refreshProducts);
    document.addEventListener("visibilitychange", refreshProducts);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", refreshProducts);
      document.removeEventListener("visibilitychange", refreshProducts);
    };
  }, [category, searchTerm]);

  const isMainType = MAIN_TYPES.includes(category);
  const typeCopy = TYPE_COPY[category];
  const title =
    searchTerm
      ? `Search results for "${searchTerm}"`
      : category === "outlet"
        ? "Outlet"
        : category === "all"
          ? "All Products"
          : categoryInfo?.name || typeCopy?.title || category;
  const description =
    searchTerm
      ? `Showing products that match "${searchTerm}".`
      : category === "outlet"
        ? "Explore our two outlet locations, their details, and everything your customers need before visiting."
        : category === "all"
          ? "Browse the full range from this edit."
          : categoryInfo?.description || typeCopy?.description || "Browse the full range from this edit.";

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <PageHeader eyebrow={category === "outlet" ? "Visit Us" : "Shop"} title={title} description={description} />

      {category === "outlet" ? (
        <div className="space-y-8">
          <section id="locations" className="space-y-6">
            {OUTLET_LOCATIONS.map((outlet) => (
              <OutletCard key={outlet.name} outlet={outlet} />
            ))}
          </section>
        </div>
      ) : loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <p className="text-ink/50 text-sm">No products found in this {isMainType ? "type" : "category"} yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
