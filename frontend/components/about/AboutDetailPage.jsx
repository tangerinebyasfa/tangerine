import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../lib/image";
import PageHeader from "../ui/PageHeader";

function SectionCard({ section }) {
  return (
    <section className="border border-ink/10 bg-white p-6 sm:p-8">
      <h2 className="font-display text-2xl text-ink">{section.title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-ink/70">
        {section.paragraphs?.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {section.items?.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {section.items.map((item) => (
              <li key={item} className="flex gap-3 rounded-lg border border-ink/10 bg-sand/30 px-4 py-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-tangerine shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export default function AboutDetailPage({ eyebrow, title, description, image, imageAlt, sections, links }) {
  const imageSrc = normalizeImageUrl(image);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      {(imageSrc || links?.length) && (
        <div className="grid gap-8 lg:grid-cols-[1fr_0.92fr] lg:items-start">
          {imageSrc ? (
            <div className="relative aspect-[4/5] overflow-hidden border border-ink/10 bg-sand">
              <Image
                src={imageSrc}
                alt={imageAlt || title}
                fill
                className="object-cover"
                unoptimized={isGoogleDriveImageUrl(imageSrc)}
              />
            </div>
          ) : (
            <div className="hidden lg:block" />
          )}

          <div className="space-y-5">
            <div className="rounded-2xl border border-ink/10 bg-white p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-tangerine">About Tangerine</p>
              <p className="mt-3 text-sm leading-7 text-ink/70">
                Tangerine is a women's fashion and lifestyle brand where creativity, education, and
                entrepreneurship come together in a professional retail setting.
              </p>
            </div>

            {links?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-center justify-between border border-ink/10 bg-white px-4 py-4 transition-colors hover:border-tangerine/40 hover:bg-sand/30"
                  >
                    <span className="text-sm font-medium text-ink">{link.label}</span>
                    <ArrowRight className="h-4 w-4 text-tangerine transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-5">
        {sections.map((section) => (
          <SectionCard key={section.title} section={section} />
        ))}
      </div>
    </div>
  );
}
