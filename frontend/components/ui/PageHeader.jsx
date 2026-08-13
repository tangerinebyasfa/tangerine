export default function PageHeader({ eyebrow, title, description }) {
  return (
    <div className="border-b border-ink/10 pb-8 mb-12">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h1 className="font-display text-4xl md:text-5xl text-ink">{title}</h1>
      {description && <p className="mt-4 max-w-xl text-ink/60">{description}</p>}
    </div>
  );
}
