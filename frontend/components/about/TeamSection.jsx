import Image from "next/image";

const teamMembers = [
  { id: "sunil-rane", name: "Mr. Sunil Rane", role: "Founder", image: "/Images/about/founder.png" },
  { id: "varda", name: "Varda", role: "Design Head", image: "/Images/about/head.jpeg" },
];

export default function TeamSection() {
  return (
    <section aria-labelledby="team-heading" className="mt-12 bg-white px-5 py-12 sm:mt-16 sm:px-16 sm:py-14">
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70 sm:text-xs">Meet the team</p>
        <h2 id="team-heading" className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
          The Heart Behind <span className="text-tangerine">Tangerine</span>
        </h2>
        <div aria-hidden="true" className="mx-auto mt-4 h-0.5 w-10 bg-tangerine" />
      </div>
      <ul className="relative mx-auto mt-8 grid max-w-xl grid-cols-1 gap-8 min-[380px]:grid-cols-2 sm:gap-16">
        {teamMembers.map((member) => (
          <li key={member.id} className="min-w-0 text-center">
            <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-sand sm:h-36 sm:w-36">
              <Image
                src={member.image}
                alt={member.name}
                width={144}
                height={144}
                sizes="(max-width: 639px) 112px, 144px"
                className="h-full w-full object-cover object-top"
              />
            </div>
            <h3 className="mt-4 break-words font-sans text-sm font-semibold text-ink">{member.name}</h3>
            {member.role && <p className="mt-1 break-words text-xs leading-5 text-ink/65">{member.role}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
