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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="mb-8 border-b border-ink/10 pb-6 sm:mb-10 sm:pb-8">
        <p className="eyebrow mb-3 inline-flex items-center gap-2 before:h-px before:w-8 before:bg-tangerine">Tangerine</p>
        <h1 className="font-display text-4xl text-ink md:text-5xl">Brand Story</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink/60 sm:text-base">A student-run fashion house where creativity meets hands-on learning.</p>
      </header>
      <section aria-labelledby="story-heading" className="grid items-center gap-8 rounded-3xl bg-gradient-to-br from-sand via-paper to-sand/40 p-5 shadow-sm ring-1 ring-ink/5 sm:p-8 lg:grid-cols-[1fr_0.95fr] lg:gap-12 lg:p-10">
        <div className="py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-tangerine sm:text-xs">Our purpose</p>
          <h2 id="story-heading" className="mt-3 font-display text-3xl leading-tight sm:text-4xl">Where fashion inspires learning</h2>
          <div aria-hidden="true" className="mt-5 h-0.5 w-12 bg-tangerine" />
          <div className="mt-5 space-y-4 text-base leading-7 text-ink/70">
            <p className='text-justify'>Tangerine is the in-house store of the School of Design at Atharva University Mumbai. It was introduced by Honourable Shri Sunil Rane, Founder and Chancellor of Atharva University, Mumbai.</p>
            <p className='text-justify'>Tangerine provides real-time experience in entrepreneurship and boutique management, nurturing the next generation of professionals.</p>
            <p className='text-justify'>The founder aims to give students the opportunity to learn alongside professional designers and entrepreneurs. This combined journey of study and entrepreneurship encourages creative and critical thinking.</p>
            <p className='text-justify'>Tangerine is a brand run by students under the guidance of professional designers.</p>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand ring-1 ring-ink/10 lg:aspect-[4/3]">
          {heroImage ? (
            <Image src={heroImage} alt="Inside the Tangerine boutique, with fashion displays and a seating area" fill sizes="(max-width: 1023px) 100vw, 50vw" className="object-cover" unoptimized={isGoogleDriveImageUrl(heroImage)} />
          ) : null}
        </div>
      </section>
      <TeamSection />
    </div>
  );
}
