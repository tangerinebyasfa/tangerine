import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  Clock3,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/products/all", label: "Shop" },
  { href: "/blog", label: "Blog" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
];

const companyLinks = [
  { href: "/about", label: "About Us" },
  { href: "/signin", label: "Sign In" },
];

const supportLinks = [
  { href: "/contact", label: "Contact Us" },
  { href: "/contact", label: "Size & Fit Help" },
  { href: "/contact", label: "Shipping Support" },
  { href: "/contact", label: "Returns Support" },
];

const socialItems = [
  { label: "Instagram", mark: "IG" },
  { label: "Facebook", mark: "FB" },
  { label: "YouTube", mark: "YT" },
  { label: "LinkedIn", mark: "IN" },
];

const locations = [
  { label: "Location One", lines: ["Atharva University", "Mumbai, Maharashtra"] },
  { label: "Location Two", lines: ["Blue Ocean Resort", "Ratnagiri, Maharashtra"] },
];

function SectionTitle({ children }) {
  return <p className="text-[11px] uppercase tracking-[0.36em] text-paper/80">{children}</p>;
}

function FooterLink({ href, children }) {
  return (
    <li>
      <Link
        href={href}
        className="group inline-flex items-center gap-2 text-sm leading-6 text-paper/78 transition-colors hover:text-tangerine"
      >
        <span className="text-tangerine transition-transform group-hover:translate-x-0.5">{">"}</span>
        <span>{children}</span>
      </Link>
    </li>
  );
}

function MobileSection({ title, children }) {
  return (
    <details className="group border-t border-paper/10 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
        <SectionTitle>{title}</SectionTitle>
        <ChevronDown className="h-4 w-4 text-paper/45 transition-transform group-open:rotate-180" />
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}

function ContactLine({ icon: Icon, children }) {
  return (
    <p className="flex items-start gap-3 text-sm leading-6 text-paper/80">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-tangerine" />
      <span>{children}</span>
    </p>
  );
}

function SocialRow() {
  return (
    <div className="flex flex-wrap gap-3">
      {socialItems.map(({ label, mark }) => (
        <span
          key={label}
          aria-label={label}
          title={label}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-paper text-ink shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-transform hover:-translate-y-0.5"
        >
          <span className="text-[10px] font-semibold tracking-[0.18em] text-tangerine">{mark}</span>
        </span>
      ))}
    </div>
  );
}

function BrandPills() {
  return (
    <div className="flex flex-wrap gap-3">
      {["Instagram", "Facebook", "YouTube", "LinkedIn"].map((label) => (
        <span
          key={label}
          className="inline-flex items-center rounded-full border border-paper/10 bg-paper/5 px-3 py-1.5 text-[11px] tracking-[0.16em] text-paper/78"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="mt-0 bg-ink text-paper sm:mt-10 lg:mt-24">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto hidden max-w-4xl flex-col items-center text-center lg:flex">
          <Image
            src="/Images/logo.png"
            alt="Tangerine"
            width={260}
            height={100}
            className="mt-2 h-16 w-auto object-contain sm:h-20"
          />

          <p className="mt-6 max-w-3xl text-sm leading-7 text-paper/76 sm:text-base">
            Tangerine brings together considered clothing, clean silhouettes, and a warm brand
            language designed for everyday dressing with confidence.
          </p>
        </div>

        <div className="mt-0 border-t-0 pt-0 lg:mt-10 lg:border-t lg:border-paper/10 lg:pt-10">
          <div className="hidden lg:grid lg:grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr] lg:gap-10">
            <div className="space-y-6">
              <SectionTitle>Get In Touch</SectionTitle>

              <div className="space-y-5">
                {locations.map((location) => (
                  <div key={location.label} className="space-y-2">
                    <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-tangerine">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{location.label}</span>
                    </p>
                    <div className="space-y-1 pl-5 text-sm leading-6 text-paper/80">
                      {location.lines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <ContactLine icon={Phone}>+91 98765 43210</ContactLine>
                <ContactLine icon={Mail}>hello@tangerine.in</ContactLine>
                <ContactLine icon={Clock3}>Mon - Sat: 10:00 AM to 7:00 PM</ContactLine>
              </div>

              <div className="space-y-3">
                <SectionTitle>Social Links</SectionTitle>
                <SocialRow />
              </div>
            </div>

            <div>
              <SectionTitle>Quick Links</SectionTitle>
              <ul className="mt-6 space-y-4">
                {quickLinks.map((link) => (
                  <FooterLink key={link.href} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}
              </ul>
            </div>

            <div>
              <SectionTitle>Company</SectionTitle>
              <ul className="mt-6 space-y-4">
                {companyLinks.map((link) => (
                  <FooterLink key={link.label} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}
              </ul>
            </div>

            <div>
              <SectionTitle>Support</SectionTitle>
              <ul className="mt-6 space-y-4">
                {supportLinks.map((link) => (
                  <FooterLink key={link.label} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-1 lg:hidden">
            <div className="pb-4 pt-0 text-center">
              <Image
                src="/Images/logo.png"
                alt="Tangerine"
                width={220}
                height={80}
                className="mx-auto h-14 w-auto object-contain"
              />
              <p className="mx-auto mt-5 max-w-[18rem] text-sm leading-7 text-paper/78">
                Tangerine brings together considered clothing, clean silhouettes, and a warm brand
                language designed for everyday dressing with confidence.
              </p>
            </div>

            <MobileSection title="Quick Links">
              <ul className="space-y-4">
                {quickLinks.map((link) => (
                  <FooterLink key={link.href} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}
              </ul>
            </MobileSection>

            <MobileSection title="Get In Touch">
              <div className="space-y-5">
                <div className="space-y-4">
                  {locations.map((location) => (
                    <div key={location.label} className="space-y-2">
                      <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-tangerine">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{location.label}</span>
                      </p>
                      <div className="space-y-1 pl-5 text-sm leading-6 text-paper/80">
                        {location.lines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <ContactLine icon={Phone}>+91 98765 43210</ContactLine>
                  <ContactLine icon={Mail}>hello@tangerine.in</ContactLine>
                  <ContactLine icon={Clock3}>Mon - Sat: 10:00 AM to 7:00 PM</ContactLine>
                </div>

                <div className="space-y-3">
                  <SectionTitle>Social Links</SectionTitle>
                  <SocialRow />
                </div>
              </div>
            </MobileSection>

            <MobileSection title="Company">
              <ul className="space-y-4">
                {companyLinks.map((link) => (
                  <FooterLink key={link.label} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}
              </ul>
            </MobileSection>

            <MobileSection title="Support">
              <ul className="space-y-4">
                {supportLinks.map((link) => (
                  <FooterLink key={link.label} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}
              </ul>
            </MobileSection>  

            <MobileSection title="Associated Brands">
              <BrandPills />
            </MobileSection>

            <div className="px-1 pb-2 pt-4 text-center">
              <p className="text-[11px] uppercase tracking-[0.34em] text-paper/65">
                Also Available On
              </p>
              <div className="mt-4 flex justify-center">
                <SocialRow />
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-paper/10 pt-6 text-[11px] uppercase tracking-[0.2em] text-paper/55 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-paper/40"></p>
            <p>© 2026 Tangerine. Powered by Atharva University - School of Design.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
