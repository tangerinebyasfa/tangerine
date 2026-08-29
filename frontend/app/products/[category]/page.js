"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Clock3,
  MapPin,
  Navigation,
  Phone,
  Sparkles,
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
    highlights: [
      "In-store styling support",
      "Fresh outlet-only edits",
      "Easy exchanges and fitting assistance",
    ],
    directionsLabel: "Get Directions",
    directionsHref: "#",
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
    highlights: [
      "Curated outlet pieces",
      "Seasonal offers and bundles",
      "Private appointment support",
    ],
    directionsLabel: "Get Directions",
    directionsHref: "#",
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

        <div className="bg-ink text-paper p-6 md:p-7">
          <div className="flex items-center gap-2 text-xs tracking-widest uppercase text-paper/50">
            <Sparkles className="h-4 w-4" />
            Important Details
          </div>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-paper/80">
            {outlet.highlights.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-tangerine shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-paper/10 pt-5">
            <Link
              href={outlet.directionsHref}
              className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-tangerine hover:text-paper transition-colors"
            >
              <Navigation className="h-4 w-4" />
              {outlet.directionsLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CategoryPage() {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (category === "outlet") {
          setProducts([]);
          setCategoryInfo(null);
          return;
        }

        const isAll = category === "all";
        const isMainType = MAIN_TYPES.includes(category);
        const [productList, info] = await Promise.all([
          api.getProducts(
            isAll ? {} : isMainType ? { type: category } : { category }
          ),
          isAll || isMainType ? Promise.resolve(null) : api.getSubcategory(category).catch(() => null),
        ]);
        setProducts(productList);
        setCategoryInfo(info);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [category]);

  const isMainType = MAIN_TYPES.includes(category);
  const typeCopy = TYPE_COPY[category];
  const title =
    category === "outlet"
      ? "Outlet"
      : category === "all"
        ? "All Products"
        : categoryInfo?.name || typeCopy?.title || category;
  const description =
    category === "outlet"
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
