import Image from "next/image";
import PageHeader from "../../components/ui/PageHeader";

export const metadata = { title: "Brand | Tangerine" };

const pillars = [
  {
    title: "Material First",
    body: "We choose fabric before silhouette — every design starts with a fibre we trust.",
  },
  {
    title: "Considered Volume",
    body: "We produce in small batches only, so nothing sits in a warehouse waiting to date.",
  },
  {
    title: "Repairable by Design",
    body: "Simple construction means our pieces can be mended, not just replaced.",
  },
];

export default function BrandPage() {
  return (
    <div>
      <div className="relative h-[60vh] min-h-[420px]">
        <Image
          src="https://images.unsplash.com/photo-1445205170230-053b83016050?w=1400&q=80"
          alt="Tangerine lookbook"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-ink/30 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-14 w-full">
            <h1 className="font-display text-5xl md:text-6xl text-paper">The Brand</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <PageHeader
          eyebrow="What We Stand For"
          title="Fewer, better things."
          description="Three principles guide everything we cut, sew, and ship."
        />

        <div className="grid md:grid-cols-3 gap-10">
          {pillars.map((p) => (
            <div key={p.title} className="border-t border-ink/10 pt-6">
              <h3 className="font-display text-2xl mb-3">{p.title}</h3>
              <p className="text-ink/60 text-sm leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
