import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../lib/image";
import PageHeader from "../../components/ui/PageHeader";

export const metadata = { title: "About | Tangerine" };

const aboutLinks = [
  {
    href: "/about/story",
    title: "Our Story",
    description: "How Tangerine began and why fashion education sits at the heart of the brand.",
  },
  {
    href: "/about/learning",
    title: "Learning & Collaboration",
    description: "How students, faculty, and professionals learn together inside the boutique.",
  },
  {
    href: "/about/brand",
    title: "Brand & Style",
    description: "The women's fashion and lifestyle side of Tangerine.",
  },
  {
    href: "/about/entrepreneurship",
    title: "Entrepreneurship",
    description: "How creativity turns into business thinking and future opportunities.",
  },
  {
    href: "/about/locations",
    title: "Locations & Vision",
    description: "Mumbai, Ratnagiri, the experience, and the long-term vision.",
  },
];

export default function AboutPage() {
  const heroImage = normalizeImageUrl(
    "https://drive.google.com/file/d/1Vnq7R6KcCC83SSksmoJLgmQj_dK2M2n7/view?usp=sharing"
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <PageHeader
        eyebrow="Brand Story"
        title="About Tangerine"
        description="A shorter About hub that opens the full brand story in focused sections instead of one long page."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-start">
        <div className="space-y-6">
          <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-tangerine">Where fashion inspires learning</p>
            <p className="mt-4 text-sm leading-7 text-ink/70">
              Tangerine is a professional women's fashion and lifestyle brand founded by Sunil Rane.
              It brings together creativity, contemporary style, education, boutique management, and
              entrepreneurship.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {aboutLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group border border-ink/10 bg-white p-5 transition-colors hover:border-tangerine/40 hover:bg-sand/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl text-ink">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-ink/60">{item.description}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-tangerine transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="relative aspect-[4/5] overflow-hidden border border-ink/10 bg-sand">
          {heroImage ? (
            <Image
              src={heroImage}
              alt="Tangerine collection"
              fill
              className="object-cover"
              unoptimized={isGoogleDriveImageUrl(heroImage)}
            />
          ) : null}
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-ink/10 bg-ink px-6 py-6 text-paper sm:px-8">
        <p className="text-xs uppercase tracking-[0.24em] text-tangerine">Quick read</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-paper/80">
          Open each section to read the story in smaller chapters. That keeps the About area readable
          while still keeping the full content available through linked pages.
        </p>
      </div>
    </div>
  );
}
