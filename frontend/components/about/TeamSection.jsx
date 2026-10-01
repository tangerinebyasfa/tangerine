"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

const teamMembers = [
  {
    id: "sunil-rane",
    name: "Shri. Sunil Rane",
    role: "Founder & Chancellor of Atharva University Mumbai",
    image: "/Images/about/fonder-gray-background.png",
    bio: "Shri. Sunil Rane is the founder and chancellor of Atharva University Mumbai, and the guiding force behind Tangerine. His vision is to pair the discipline of structured education with the freedom of individual expression, so that every garment we make feels considered, purposeful and built to last. He leads the brand with a long-term view of quality over trend.",
  },
  {
    id: "varda",
    name: "Miss. Varda Kalaburgi",
    role: "Fashion Designer",
    image: "/Images/about/head.jpeg",
    bio: "Varda designs the silhouettes that define our womenswear and occasion lines. Her approach combines classical draping knowledge with modern, wearable cuts, and she is closely involved from the first sketch through to the final fitting. She is responsible for the fit library that keeps sizing consistent across every collection.",
  },
  {
    id: "sanchita-vishwakarma",
    name: "Miss. Sanchita Vishwakarma",
    role: "Fashion Designer",
    image: "/Images/about/designer.jpeg",
    bio: "Sanchita leads our print, colour and surface development, working with our sampling room to turn textile ideas into finished pieces. She focuses on the details that separate a garment from a costume, and collaborates with the production team on embroidery and finishing to keep the craft consistent at every batch.",
  },
];

function TeamMemberModal({ member, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!member) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-4 sm:px-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-member-name"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-paper shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-paper/90 text-ink shadow-md transition hover:bg-sand hover:text-burgundy"
          aria-label="Close team member details"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="max-h-[92vh] overflow-y-auto px-5 py-8 text-center sm:px-10 sm:py-10">
          <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-sand sm:h-36 sm:w-36">
            <Image
              src={member.image}
              alt={member.name}
              width={144}
              height={144}
              sizes="144px"
              className="h-full w-full object-cover object-top"
            />
          </div>

          <h3 id="team-member-name" className="mt-6 break-words font-display text-2xl leading-tight text-ink sm:text-3xl">
            {member.name}
          </h3>

          {member.role && (
            <p className="mt-2 break-words text-sm uppercase tracking-[0.14em] text-tangerine">{member.role}</p>
          )}

          <div aria-hidden="true" className="mx-auto mt-6 h-0.5 w-10 bg-tangerine" />

          {member.bio && (
            <p className="mt-6 text-left text-sm leading-7 text-ink/70">{member.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeamSection() {
  const [activeMember, setActiveMember] = useState(null);

  return (
    <section aria-labelledby="team-heading" className="mt-12 bg-white px-5 py-12 sm:mt-16 sm:px-16 sm:py-14">
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/70 sm:text-xs">Meet the team</p>
        <h2 id="team-heading" className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
          The Heart Behind <span className="text-tangerine">Tangerine</span>
        </h2>
        <div aria-hidden="true" className="mx-auto mt-4 h-0.5 w-10 bg-tangerine" />
      </div>
      <ul className="relative mx-auto mt-8 grid max-w-xl grid-cols-1 gap-8 min-[380px]:grid-cols-2 min-[768px]:grid-cols-3 sm:gap-16">
        {teamMembers.map((member, index) => (
          <li
            key={member.id}
            className={`min-w-0 text-center ${index === teamMembers.length - 1 ? "min-[380px]:max-md:col-span-2" : ""}`}
          >
            <button
              type="button"
              onClick={() => setActiveMember(member)}
              aria-haspopup="dialog"
              className="group mx-auto block w-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-4"
            >
              <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-sand ring-1 ring-ink/10 transition group-hover:ring-2 group-hover:ring-tangerine sm:h-36 sm:w-36">
                <Image
                  src={member.image}
                  alt={member.name}
                  width={144}
                  height={144}
                  sizes="(max-width: 639px) 112px, 144px"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <h3 className="mt-4 break-words font-sans text-sm font-semibold text-ink transition-colors group-hover:text-tangerine">
                {member.name}
              </h3>
              {member.role && <p className="mt-1 break-words text-xs leading-5 text-ink/65">{member.role}</p>}
              <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-[0.16em] text-tangerine opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                View profile
              </span>
            </button>
          </li>
        ))}
      </ul>

      {activeMember ? <TeamMemberModal member={activeMember} onClose={() => setActiveMember(null)} /> : null}
    </section>
  );
}