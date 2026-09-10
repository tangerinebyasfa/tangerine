import Image from "next/image";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../lib/image";
import TeamSection from "../../components/about/TeamSection";

export const metadata = {
  title: "Brand Story | Tangerine",
  description: "Discover Tangerine, the student-run in-house store at Atharva University, Mumbai, where fashion, learning, and entrepreneurship come together.",
};

export default function AboutPage() {
  const heroImage = normalizeImageUrl(
    "https://drive.google.com/file/d/1Vnq7R6KcCC83SSksmoJLgmQj_dK2M2n7/view?usp=sharing"
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 l g:py-14">
      <header className="mb-8 border-b border-ink/10 pb-6 sm:mb-12 sm:pb-8">
        <p className="eyebrow mb-3">Tangerine</p>
        <h1 className="font-display text-4xl text-ink md:text-5xl">Brand Story</h1>
      </header>
      <section aria-labelledby="story-heading" className="grid items-stretch gap-8 lg:grid-cols-[1fr_0.95fr] lg:gap-14">
        <div>
          <h2 id="story-heading" className="font-display text-3xl leading-tight sm:text-4xl">Where fashion inspires learning</h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-ink/70">
            <p>Tangerine is the in-house store of the School of Design at Atharva University, Mumbai. It was introduced by Honourable Shri Sunil Rane, Founder and Chancellor of Atharva University, Mumbai.</p>
            <p>Tangerine provides real-world experience in entrepreneurship and boutique management, nurturing the next generation of professionals.</p>
            <p>The founder aims to give students the opportunity to learn alongside professional designers and entrepreneurs. This combined journey of study and entrepreneurship encourages creative and critical thinking.</p>
            <p>Tangerine is a brand run by students under the guidance of professional designers.</p>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden bg-sand lg:aspect-auto">
          {heroImage ? (
            <Image src={heroImage} alt="Inside the Tangerine boutique, with fashion displays and a seating area" fill sizes="(max-width: 1023px) 100vw, 50vw" className="object-cover" unoptimized={isGoogleDriveImageUrl(heroImage)} />
          ) : null}
        </div>
      </section>
      <TeamSection />
    </div>
  );
}
