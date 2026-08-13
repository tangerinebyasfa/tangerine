import Image from "next/image";
import PageHeader from "../../components/ui/PageHeader";

export const metadata = { title: "About | Tangerine" };

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <PageHeader
        eyebrow="Our Story"
        title="Made slowly, worn for years."
        description="Tangerine began as a two-person studio with one belief: clothes should be designed for the life you actually live, not the season they were sold in."
      />

      <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
        <div className="relative aspect-[4/5] bg-sand">
          <Image
            src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=900&q=80"
            alt="Atelier workspace"
            fill
            className="object-cover"
          />
        </div>
        <div>
          <h2 className="font-display text-3xl mb-4">Small batches, honest fabric</h2>
          <p className="text-ink/60 leading-relaxed mb-4">
            Every piece is produced in limited runs using natural, responsibly sourced
            fabric — linen, wool, and organic cotton. We'd rather sell out of a style
            than fill a warehouse with it.
          </p>
          <p className="text-ink/60 leading-relaxed">
            Our small team works directly with mills and makers we've known for years,
            keeping the supply chain short and the craftsmanship close.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-10 border-t border-ink/10 pt-16">
        <div>
          <p className="font-display text-4xl text-burgundy mb-2">2016</p>
          <p className="text-sm text-ink/60">Founded in a single room studio, one sewing machine, one idea.</p>
        </div>
        <div>
          <p className="font-display text-4xl text-burgundy mb-2">100%</p>
          <p className="text-sm text-ink/60">Natural and recycled fibres across our core collection.</p>
        </div>
        <div>
          <p className="font-display text-4xl text-burgundy mb-2">12</p>
          <p className="text-sm text-ink/60">Independent makers we partner with across three countries.</p>
        </div>
      </div>
    </div>
  );
}
