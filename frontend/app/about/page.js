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

const teamMembers = [
  {
    name: "Neha Sharma",
    role: "Founder & Creative Head",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=85",
  },
  {
    name: "Pooja Verma",
    role: "Design Head",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=85",
  },
  {
    name: "Anjali Mehta",
    role: "Marketing Head",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=85",
  },
  {
    name: "Rohan Kapoor",
    role: "Operations Head",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=85",
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

      {/* <section
        className="relative mt-16 overflow-hidden bg-transparent px-5 py-10 sm:px-8 sm:py-12 lg:mt-20 lg:px-12"
        aria-labelledby="heart-behind-heading"
      >
        <div
          className="pointer-events-none absolute -left-10 top-5 h-32 w-32 opacity-70"
          style={{
            backgroundImage: "radial-gradient(#ff6a00 1.2px, transparent 1.2px)",
            backgroundSize: "12px 12px",
            maskImage: "linear-gradient(135deg, black, transparent 75%)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-10 bottom-5 h-32 w-32 rotate-180 opacity-70"
          style={{
            backgroundImage: "radial-gradient(#ff6a00 1.2px, transparent 1.2px)",
            backgroundSize: "12px 12px",
            maskImage: "linear-gradient(135deg, black, transparent 75%)",
          }}
        />

        <div className="relative text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-ink/50">Meet the team</p>
          <h2 id="heart-behind-heading" className="mt-2 font-display text-3xl text-ink sm:text-4xl">
            The Heart Behind <span className="text-tangerine">Tangerine</span>
          </h2>
          <div className="mx-auto mt-3 h-0.5 w-5 bg-tangerine" />
        </div>

        <div className="relative mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-x-4 gap-y-8 sm:mt-10 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-10">
          {teamMembers.map((member) => (
            <article key={member.name} className="text-center">
              <div className="relative mx-auto aspect-square w-full max-w-[132px] overflow-hidden rounded-full bg-sand ring-8 ring-white sm:max-w-[148px]">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  sizes="(max-width: 640px) 38vw, (max-width: 1024px) 148px, 148px"
                  className="object-cover"
                />
              </div>
              <h3 className="mt-5 font-display text-lg text-ink sm:text-xl">{member.name}</h3>
              <p className="mx-auto mt-1 max-w-[150px] text-[10px] uppercase leading-4 tracking-[0.12em] text-ink/50 sm:text-[11px]">
                {member.role}
              </p>
            </article>
          ))}
        </div>
      </section> */}

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
