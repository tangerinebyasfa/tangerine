"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { api } from "../../lib/api";
import Spinner from "../../components/ui/Spinner";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../lib/image";

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-end mb-14">
        <div>
          <p className="eyebrow mb-3">Gallery</p>
          <h1 className="font-display text-4xl md:text-6xl leading-tight max-w-3xl">
            A visual diary of looks, moments, and Instagram highlights.
          </h1>
          <p className="mt-6 text-ink/60 max-w-2xl text-base leading-7">
            Each card below is driven by Firebase. Add, edit, or remove gallery items from the admin
            panel, and the public gallery updates automatically.
          </p>
        </div>

        <div className="border border-ink/10 bg-sand/30 p-6 md:p-7">
          <p className="text-xs tracking-widest uppercase text-ink/40">Instagram Links</p>
          <p className="mt-4 text-sm leading-7 text-ink/65">
            Link every image to a post, reel, or profile page. This makes the gallery work as both a
            visual showcase and a traffic bridge to your social content.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center gap-2 text-xs tracking-widest uppercase text-burgundy hover:text-ink transition-colors"
          >
            Contact us for gallery help
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="border border-ink/10 bg-paper p-10 text-center">
          <p className="font-display text-3xl">No gallery posts yet.</p>
          <p className="mt-3 text-sm text-ink/60">
            Add your first image, caption, and Instagram link from the admin gallery tab.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => {
            const image = normalizeImageUrl(item.imageUrl) || "/placeholder-category.svg";
            const hasLink = !!item.instagramLink;

            return (
              <article
                key={item.id}
                className={`group overflow-hidden border border-ink/10 bg-paper ${index % 3 === 1 ? "xl:mt-10" : ""}`}
              >
                <div className="relative aspect-[4/5] bg-sand">
                  <img
                    src={image}
                    alt={item.imageAlt || item.title || "Gallery image"}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl">{item.title}</h2>
                      <p className="mt-1 text-[11px] tracking-widest uppercase text-ink/40">
                        {item.sortOrder != null ? `Post ${item.sortOrder}` : "Gallery post"}
                      </p>
                    </div>
                    {hasLink ? (
                      <a
                        href={item.instagramLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs tracking-widest uppercase text-burgundy hover:text-ink transition-colors"
                      >
                        Open
                      </a>
                    ) : null}
                  </div>

                  {item.caption && <p className="mt-3 text-sm leading-7 text-ink/60">{item.caption}</p>}

                  {hasLink && (
                    <a
                      href={item.instagramLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex items-center gap-2 text-xs tracking-widest uppercase text-ink hover:text-burgundy transition-colors"
                    >
                      View on Instagram
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

