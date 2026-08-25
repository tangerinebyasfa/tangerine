"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Image, Play, Share2, X } from "lucide-react";
import { api } from "../../lib/api";
import Spinner from "../../components/ui/Spinner";
import { normalizeImageUrl } from "../../lib/image";

const socialTabs = [
  // { label: "Instagram", icon: Image, active: true },
  // { label: "Facebook", icon: Share2, active: false },
  // { label: "YouTube", icon: Play, active: false },
];

function splitCopy(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function GalleryModal({ item, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!item) return null;

  const image = normalizeImageUrl(item.imageUrl) || "/placeholder-category.svg";
  const copyLines = splitCopy(item.caption);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-4 sm:px-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex w-full max-w-6xl max-h-[92vh] flex-col overflow-hidden rounded-[2rem] bg-paper shadow-2xl lg:grid lg:grid-cols-[1.1fr_0.9fr]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-paper/90 text-ink shadow-md transition hover:bg-sand hover:text-burgundy"
          aria-label="Close gallery detail"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex min-h-[42vh] items-center justify-center bg-black lg:min-h-[76vh]">
          <img
            src={image}
            alt={item.imageAlt || item.title || "Gallery image"}
            className="max-h-[76vh] w-full object-contain"
            loading="eager"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 lg:max-h-[92vh] lg:px-10 lg:py-9">
          <p className="eyebrow mb-4 text-burgundy">Gallery Detail</p>
          <h2 className="font-display text-3xl sm:text-4xl leading-tight text-ink">{item.title}</h2>

          <p className="mt-4 text-sm tracking-widest uppercase text-ink/45">
            {item.sortOrder != null ? `Post ${item.sortOrder}` : "Gallery post"}
          </p>

          <div className="mt-6 space-y-4 text-[15px] leading-8 text-ink/75">
            {copyLines.length > 0 ? (
              copyLines.map((line) => <p key={line}>{line}</p>)
            ) : (
              <p>Open the original post to view the full social context for this image.</p>
            )}
          </div>

          {item.imageAlt ? (
            <p className="mt-6 text-sm leading-7 text-ink/50">Alt text: {item.imageAlt}</p>
          ) : null}

          {item.instagramLink ? (
            <a
              href={item.instagramLink}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 text-sm tracking-widest uppercase text-burgundy transition hover:text-ink"
            >
              View Original Post
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await api.getGalleryItems();
        if (active) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[1320px] px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pb-24 lg:pt-8">
        <div className="text-center mx-auto max-w-4xl">
          <p className="eyebrow mb-3 text-burgundy">Social Feed</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-none text-ink">Gallery</h1>
          <p className="mx-auto mt-5 max-w-3xl text-sm sm:text-base leading-7 text-ink/60">
            A curated visual feed of campaign moments, product highlights, and social posts. Click any image
            to open the full detail view.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {socialTabs.map(({ label, icon: Icon, active }) => (
              <button
                key={label}
                type="button"
                className={`inline-flex items-center gap-2 border px-4 py-2 text-sm tracking-widest uppercase transition ${
                  active
                    ? "border-tangerine bg-tangerine text-paper shadow-sm"
                    : "border-ink/15 bg-paper text-ink hover:border-tangerine hover:text-tangerine"
                }`}
                aria-pressed={active}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* <div className="mt-16 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <div>
            <p className="eyebrow mb-4 text-burgundy">Gallery</p>
            <h2 className="max-w-2xl font-display text-[clamp(3rem,7vw,5.5rem)] leading-[0.92] text-ink">
              A visual diary of looks, moments, and Instagram highlights.
            </h2>
            <p className="mt-8 max-w-2xl text-base sm:text-lg leading-8 text-ink/70">
              Each card below is driven by Firebase. Add, edit, or remove gallery items from the admin panel,
              and the public gallery updates automatically.
            </p>
          </div>

          <div className="border border-ink/10 bg-[#faf6f0] p-6 sm:p-8 lg:p-10">
            <p className="eyebrow mb-5 text-ink/35">Instagram Links</p>
            <p className="text-base sm:text-lg leading-8 text-ink/70">
              Link every image to a post, reel, or profile page. This makes the gallery work as both a visual
              showcase and a traffic bridge to your social content.
            </p>
            <a
              href="/contact"
              className="mt-8 inline-flex items-center gap-2 text-sm tracking-widest uppercase text-burgundy transition hover:text-ink"
            >
              Contact us for gallery help
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div> */}

        <div className="mt-12 lg:mt-14">
          {loading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <div className="mx-auto max-w-2xl border border-ink/10 bg-sand/30 p-10 text-center">
              <p className="font-display text-3xl">No gallery posts yet.</p>
              <p className="mt-3 text-sm text-ink/60">
                Add your first image, caption, and Instagram link from the admin gallery tab.
              </p>
            </div>
          ) : (
            <div className="columns-1 gap-5 sm:columns-2 xl:columns-4">
              {items.map((item) => {
                const image = normalizeImageUrl(item.imageUrl) || "/placeholder-category.svg";

                return (
                  <article key={item.id} className="mb-5 break-inside-avoid overflow-hidden bg-paper">
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="group block w-full text-left"
                      aria-label={`Open detail for ${item.title || "gallery image"}`}
                    >
                      <div className="relative overflow-hidden bg-[#f5efe9]">
                        <img
                          src={image}
                          alt={item.imageAlt || item.title || "Gallery image"}
                          className="h-auto w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedItem ? <GalleryModal item={selectedItem} onClose={() => setSelectedItem(null)} /> : null}
    </div>
  );
}
