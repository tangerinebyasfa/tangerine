"use client";

import { useState } from "react";
import Link from "next/link";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ArrowRight, Clock3, MapPin, MessageCircle, Mail, Phone, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { db } from "../../lib/firebase";

const CONTACT_CHANNELS = [
  {
    icon: Phone,
    label: "Call us",
    value: "+91 98765 43210",
    href: "tel:+919876543210",
    note: "Mon - Sat | 10:00 AM - 7:00 PM",
  },
  {
    icon: Mail,
    label: "Email us",
    value: "hello@tangerine.in",
    href: "mailto:hello@tangerine.in",
    note: "We reply within 24 hours",
  },
  {
    icon: MapPin,
    label: "Visit us",
    value: "Two studio locations",
    href: "#locations",
    note: "Mumbai and Ratnagiri",
  },
  {
    icon: MessageCircle,
    label: "Chat with us",
    value: "WhatsApp support",
    href: "https://wa.me/919876543210",
    note: "Fast help during store hours",
  },
];

const LOCATIONS = [
  {
    name: "Atharva University",
    tag: "Flagship outlet",
    address: ["Atharva University", "Malad West", "Mumbai, Maharashtra"],
    hours: "Mon - Sat | 10:30 AM - 9:00 PM",
    phone: "+91 98765 43210",
    directions: "https://www.google.com/maps/search/?api=1&query=Atharva%20University%20Mumbai",
  },
  {
    name: "Blue Ocean Resort",
    tag: "Boutique outlet",
    address: ["Blue Ocean Resort", "Ganpatipule", "Ratnagiri, Maharashtra"],
    hours: "Mon - Sat | 11:00 AM - 8:30 PM",
    phone: "+91 98765 43211",
    directions:
      "https://www.google.com/maps/search/?api=1&query=Blue%20Ocean%20Resort%20Ganpatipule%20Ratnagiri",
  },
];

const DEFAULT_FORM = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  preferredLocation: LOCATIONS[0].name,
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!db) {
      toast.error("Firebase is not configured yet.");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "messages"), {
        ...form,
        source: "contact-us",
        status: "new",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Message sent successfully. We will be in touch soon.");
      setForm(DEFAULT_FORM);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top_left,_rgba(255,149,92,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(90,63,55,0.08),_transparent_28%),linear-gradient(180deg,_#fff8f1_0%,_#fdfdfc_72%)]" />
      <div className="absolute left-[-5rem] top-24 -z-10 h-72 w-72 bg-tangerine/10 blur-3xl" />
      <div className="absolute right-[-6rem] top-64 -z-10 h-80 w-80 bg-ink/5 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <p className="eyebrow mb-4 inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Get in touch
          </p>
          <h1 className="max-w-2xl font-display text-[clamp(2.6rem,6vw,4.8rem)] leading-[0.95] text-ink">
            Contact Us
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-ink/65 sm:text-base">
            Questions about an order, a fitting, or store availability? Send a note, choose your
            preferred location, and our team will respond with care.
          </p>
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CONTACT_CHANNELS.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={item.label}
                href={item.href}
                className="group border border-ink/15 border-t-4 border-tangerine bg-white/90 p-5 backdrop-blur transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center border border-tangerine/30 bg-tangerine/10 text-tangerine">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.28em] text-ink/40">{item.label}</p>
                <p className="mt-2 font-display text-xl text-ink">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-ink/55">{item.note}</p>
              </a>
            );
          })}
        </section>

        <section className="mt-8">
          <div className="border border-ink/10 border-l-4 border-l-tangerine bg-white/90 p-6 backdrop-blur sm:p-8">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="eyebrow mb-3">Send a message</p>
                <h2 className="font-display text-3xl text-ink sm:text-4xl">We would love to hear from you</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-ink/65 sm:text-base">
                  Share the details below and we will route your message to the right team. Every
                  submission is stored in Firebase and appears in the admin panel under Reached Customers.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-ink/50">
                        Full name
                      </span>
                      <input
                        required
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        className="input-field"
                        placeholder="Your name"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-ink/50">
                        Email address
                      </span>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                        className="input-field"
                        placeholder="you@example.com"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-ink/50">
                        Phone number
                      </span>
                      <input
                        value={form.phone}
                        onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                        className="input-field"
                        placeholder="+91 98765 43210"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-ink/50">
                        Preferred location
                      </span>
                      <select
                        value={form.preferredLocation}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, preferredLocation: event.target.value }))
                        }
                        className="input-field"
                      >
                        {LOCATIONS.map((location) => (
                          <option key={location.name} value={location.name}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-ink/50">
                      Subject
                    </span>
                    <input
                      required
                      value={form.subject}
                      onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                      className="input-field"
                      placeholder="Order question, store visit, custom request..."
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-ink/50">
                      Message
                    </span>
                    <textarea
                      required
                      value={form.message}
                      onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                      className="input-field min-h-[150px] resize-y"
                      placeholder="Tell us a little more so we can help quickly."
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button type="submit" disabled={loading} className="btn-primary disabled:opacity-70">
                      {loading ? "Sending..." : "Send message"}
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <p className="text-sm leading-6 text-ink/50">
                      By submitting this form, you agree to be contacted by our team.
                    </p>
                  </div>
                </form>
              </div>

              <aside className="border border-tangerine/20 bg-gradient-to-br from-paper via-[#fff7ef] to-[#ffe9d7] p-5 sm:p-6">
                <div className="border border-white/70 bg-white/70 p-5 backdrop-blur">
                  <p className="eyebrow mb-3">Why reach out?</p>
                  <h3 className="font-display text-2xl text-ink">We keep replies thoughtful and quick</h3>
                  <div className="mt-6 space-y-4">
                    <div className="flex gap-3">
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center border border-tangerine/30 bg-tangerine/10 text-tangerine">
                        <Clock3 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">Fast response</p>
                        <p className="mt-1 text-sm leading-6 text-ink/60">We usually reply within 24 business hours.</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center border border-tangerine/30 bg-tangerine/10 text-tangerine">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">Two store locations</p>
                        <p className="mt-1 text-sm leading-6 text-ink/60">
                          We will route your message to Mumbai or Ratnagiri based on your preference.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center border border-tangerine/30 bg-tangerine/10 text-tangerine">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">Careful follow-up</p>
                        <p className="mt-1 text-sm leading-6 text-ink/60">
                          Every submission is saved in Firebase and appears in Reached Customers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden border border-white/70 bg-white/70">
                  <div className="p-5">
                    <p className="eyebrow mb-3">Quick links</p>
                    <div className="space-y-3 text-sm">
                      <a
                        href="mailto:hello@tangerine.in"
                        className="flex items-center justify-between gap-3 text-ink transition-colors hover:text-tangerine"
                      >
                        <span>Email support</span>
                        <ArrowRight className="h-4 w-4" />
                      </a>
                      <a
                        href="https://wa.me/919876543210"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 text-ink transition-colors hover:text-tangerine"
                      >
                        <span>WhatsApp chat</span>
                        <ArrowRight className="h-4 w-4" />
                      </a>
                      <Link
                        href="/about/locations"
                        className="flex items-center justify-between gap-3 text-ink transition-colors hover:text-tangerine"
                      >
                        <span>Read about our locations</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section
          id="locations"
          className="mt-8 border border-ink/10 border-t-4 border-t-ink bg-white/90 p-6 backdrop-blur sm:p-8"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow mb-2">Find us here</p>
              <h2 className="font-display text-3xl text-ink sm:text-4xl">Two locations, one brand experience</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-ink/60 sm:text-base">
              Visit the outlet nearest to you, or choose your preferred location in the form so we can
              guide your message to the right team.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {LOCATIONS.map((location) => (
              <article key={location.name} className="overflow-hidden border border-ink/10 border-l-4 border-l-tangerine bg-paper">
                <div className="border-b border-ink/10 bg-gradient-to-br from-[#fff7ef] to-[#fff] p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-tangerine">{location.tag}</p>
                  <h3 className="mt-3 font-display text-2xl text-ink">{location.name}</h3>
                  <div className="mt-4 space-y-1 text-sm leading-6 text-ink/65">
                    {location.address.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 text-tangerine" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-ink/40">Hours</p>
                      <p className="mt-1 text-sm leading-6 text-ink/70">{location.hours}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-tangerine" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-ink/40">Phone</p>
                      <p className="mt-1 text-sm leading-6 text-ink/70">{location.phone}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <a
                      href={location.directions}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 border border-ink/10 bg-white px-4 py-2 text-sm text-ink transition-colors hover:bg-sand"
                    >
                      Open in Maps
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <a
                      href={`tel:${location.phone.replace(/\s+/g, "")}`}
                      className="inline-flex items-center justify-center gap-2 border border-tangerine/30 bg-tangerine px-4 py-2 text-sm text-paper transition-colors hover:bg-ink"
                    >
                      Call this store
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
