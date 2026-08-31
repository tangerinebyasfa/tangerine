import PageHeader from "../ui/PageHeader";

function PolicySection({ section }) {
  return (
    <section className="border border-ink/10 bg-white p-6 sm:p-8">
      <h2 className="font-display text-2xl text-ink">{section.title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-ink/70">
        {section.paragraphs?.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {section.items?.length ? (
          <ul className="space-y-3 pl-5">
            {section.items.map((item) => (
              <li key={item} className="list-disc">
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export default function PolicyPage({ eyebrow, title, description, effectiveDate, sections }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      {effectiveDate ? (
        <p className="mb-8 text-xs uppercase tracking-[0.22em] text-ink/45">
          Effective date: {effectiveDate}
        </p>
      ) : null}

      <div className="space-y-5">
        {sections.map((section) => (
          <PolicySection key={section.title} section={section} />
        ))}
      </div>
    </div>
  );
}
