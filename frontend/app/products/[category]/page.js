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
    name: "Outlet One",
    label: "Flagship Outlet",
    address: [
      "Tangerine Studio Outlet",
      "Shop No. 12, Ground Floor",
      "City Center Mall, Main Road",
      "Ahmedabad, Gujarat 380015",
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
    name: "Outlet Two",
    label: "City Boutique Outlet",
    address: [
      "Tangerine Outlet Store",
      "Second Floor, Boutique Arcade",
      "Near Park Avenue, Ring Road",
      "Surat, Gujarat 395002",
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
          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-stretch">
            <div className="relative overflow-hidden border border-ink/10 bg-gradient-to-br from-paper via-sand/20 to-paper p-7 md:p-10">
              <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(135deg,#111111_1px,transparent_1px),linear-gradient(45deg,#111111_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="relative">
                <p className="eyebrow mb-4">Two locations, one experience</p>
                <h2 className="font-display text-4xl md:text-6xl max-w-2xl leading-tight">
                  Visit our outlet stores for in-person styling, fits, and exclusive pieces.
                </h2>
                <p className="mt-5 max-w-2xl text-sm md:text-base leading-7 text-ink/65">
                  Use this section to present your store locations with the full details customers care
                  about most: address, timing, contact methods, parking notes, special services, and
                  any outlet-only announcements.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="#locations"
                    className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-3 text-xs tracking-widest uppercase hover:bg-burgundy transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    View Locations
                  </a>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 border border-ink text-ink px-5 py-3 text-xs tracking-widest uppercase hover:bg-sand transition-colors"
                  >
                    Contact Us
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="border border-ink/10 bg-ink text-paper p-6 md:p-7">
                <p className="text-xs tracking-widest uppercase text-paper/40 mb-2">Outlet Overview</p>
                <p className="text-2xl font-display">Make visiting simple and informative.</p>
                <p className="mt-4 text-sm leading-7 text-paper/75">
                  Add operating hours, event timings, appointment policies, and any quick info your
                  team wants shoppers to know before arriving.
                </p>
              </div>
              <div className="border border-ink/10 bg-paper p-6 md:p-7">
                <p className="text-xs tracking-widest uppercase text-ink/40 mb-2">Suggested Details</p>
                <ul className="space-y-3 text-sm leading-6 text-ink/75">
                  <li>Parking availability and nearest landmark</li>
                  <li>WhatsApp / phone for quick enquiry</li>
                  <li>Store timings and closed days</li>
                  <li>Services like exchange, fitting, or tailoring support</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="locations" className="space-y-6">
            {OUTLET_LOCATIONS.map((outlet) => (
              <OutletCard key={outlet.name} outlet={outlet} />
            ))}
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            <div className="border border-ink/10 p-6 bg-paper">
              <p className="text-xs tracking-widest uppercase text-ink/40 mb-3">Before You Visit</p>
              <p className="font-display text-2xl">What to add here</p>
              <p className="mt-3 text-sm leading-7 text-ink/65">
                Include any details that reduce friction for customers, like appointment-only hours,
                lift access, nearby parking, or how to reach staff on arrival.
              </p>
            </div>
            <div className="border border-ink/10 p-6 bg-sand/30">
              <p className="text-xs tracking-widest uppercase text-ink/40 mb-3">Store Notes</p>
              <p className="font-display text-2xl">Add your own text</p>
              <p className="mt-3 text-sm leading-7 text-ink/65">
                This card can hold unique outlet notes such as weekend timings, sale periods, or
                special in-store services.
              </p>
            </div>
            <div className="border border-ink/10 p-6 bg-ink text-paper">
              <p className="text-xs tracking-widest uppercase text-paper/40 mb-3">Need Help?</p>
              <p className="font-display text-2xl">Direct support</p>
              <p className="mt-3 text-sm leading-7 text-paper/75">
                Add the main outlet contact here so visitors can call or WhatsApp before they leave
                home.
              </p>
            </div>
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
