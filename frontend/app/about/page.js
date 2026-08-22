import Image from "next/image";
import { normalizeImageUrl } from "../../lib/image";
import PageHeader from "../../components/ui/PageHeader";

export const metadata = { title: "About | Tangerine" };

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <PageHeader
        eyebrow="Brand Story"
        title="Tangerine"
        description="Tangerine is the fashion brand of Honorable Shri Sunil Rane Sir, shaped by a refined design language, thoughtful silhouettes, and a clear sense of identity."
      />

      <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
        <div className="relative aspect-[4/5] bg-sand">
          <Image
            src={normalizeImageUrl("https://drive.google.com/file/d/1Vnq7R6KcCC83SSksmoJLgmQj_dK2M2n7/view?usp=sharing") || "https://drive.google.com/file/d/1Vnq7R6KcCC83SSksmoJLgmQj_dK2M2n7/view?usp=sharing"}
            alt="Tangerine collection"
            fill
            className="object-cover"
          />
        </div>
        <div>
          <h2 className="font-display text-3xl mb-4">Built with a clear vision</h2>
          <p className="text-ink/60 leading-relaxed mb-4">
            The brand reflects a commitment to elegant, wearable fashion that feels polished,
            modern, and distinctively Tangerine.
          </p>
          <p className="text-ink/60 leading-relaxed">
            Every collection is curated to balance comfort, confidence, and presentation,
            bringing together pieces that work beautifully in everyday life and special moments alike.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-10 border-t border-ink/10 pt-16">
        <div>
          <p className="font-display text-4xl text-burgundy mb-2">TANGERINE</p>
          <p className="text-sm text-ink/60">A brand with a clear identity and a considered fashion direction.</p>
        </div>
        <div>
          <p className="font-display text-4xl text-burgundy mb-2">VISION</p>
          <p className="text-sm text-ink/60">Designed to feel modern, confident, and easy to wear across occasions.</p>
        </div>
        <div>
          <p className="font-display text-4xl text-burgundy mb-2">SUNIL RANE</p>
          <p className="text-sm text-ink/60">The name behind the brand and its creative direction, Honorable Shri Sunil Rane Sir.</p>
        </div>
      </div>
    </div>
  );
}

