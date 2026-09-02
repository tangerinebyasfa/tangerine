"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Mail, MapPin, Phone, Inbox, ArrowUpRight } from "lucide-react";
import Spinner from "../../../components/ui/Spinner";
import { db, collection, onSnapshot, orderBy, query } from "../../../lib/firebase";

function formatDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeText(value) {
  return String(value || "").trim();
}

export default function ReachedCustomersPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }

    const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setMessages([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const totals = useMemo(() => {
    const preferredLocations = messages.reduce(
      (acc, item) => {
        const key = normalizeText(item.preferredLocation) || "Unspecified";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );

    return {
      total: messages.length,
      newCount: messages.filter((item) => normalizeText(item.status).toLowerCase() === "new").length,
      preferredLocations,
    };
  }, [messages]);

  if (loading) return <Spinner className="min-h-[50vh]" />;

  const topLocations = Object.entries(totals.preferredLocations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-2">Customer care</p>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">Reached Customers</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
            Every contact-us submission lands here from Firebase so the team can review inquiries,
            choose the right outlet, and follow up without missing anyone.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border border-ink/10 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-ink/40">Total leads</p>
          <p className="mt-2 font-display text-3xl text-ink">{totals.total}</p>
        </div>
        <div className="border border-ink/10 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-ink/40">New</p>
          <p className="mt-2 font-display text-3xl text-ink">{totals.newCount}</p>
        </div>
        <div className="border border-ink/10 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-ink/40">Top location</p>
          <p className="mt-2 font-display text-2xl text-ink">{topLocations[0]?.[0] || "None"}</p>
        </div>
        <div className="border border-ink/10 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-ink/40">Second location</p>
          <p className="mt-2 font-display text-2xl text-ink">{topLocations[1]?.[0] || "None"}</p>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="mt-8 border border-dashed border-ink/10 bg-white p-10 text-center">
          <Inbox className="mx-auto h-10 w-10 text-ink/20" />
          <p className="mt-4 font-display text-2xl text-ink">No customer messages yet</p>
          <p className="mt-2 text-sm leading-6 text-ink/55">
            When someone submits the contact form, their details will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-widest text-ink/40">
                <th className="py-3 pl-4 pr-4">Customer</th>
                <th className="py-3 pr-4">Contact</th>
                <th className="py-3 pr-4">Subject</th>
                <th className="py-3 pr-4">Preferred location</th>
                <th className="py-3 pr-4">Received</th>
                <th className="py-3 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {messages.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="py-4 pl-4 pr-4">
                    <p className="font-medium text-ink">{item.name || "Unknown customer"}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ink/40">
                      {normalizeText(item.status) || "new"}
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="space-y-2 text-ink/70">
                      {item.email ? (
                        <a href={`mailto:${item.email}`} className="flex items-center gap-2 hover:text-tangerine">
                          <Mail className="h-4 w-4 shrink-0" />
                          <span>{item.email}</span>
                        </a>
                      ) : null}
                      {item.phone ? (
                        <a href={`tel:${String(item.phone).replace(/\s+/g, "")}`} className="flex items-center gap-2 hover:text-tangerine">
                          <Phone className="h-4 w-4 shrink-0" />
                          <span>{item.phone}</span>
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="max-w-xs font-medium text-ink">{item.subject || "No subject"}</p>
                    <p className="mt-2 max-w-sm whitespace-pre-line text-sm leading-6 text-ink/60">
                      {item.message || "No message provided."}
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-start gap-2 text-ink/70">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-tangerine" />
                      <span>{item.preferredLocation || "Unspecified"}</span>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-start gap-2 text-ink/70">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-tangerine" />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-right">
                    {item.email ? (
                      <a
                        href={`mailto:${item.email}`}
                        className="inline-flex items-center gap-2 border border-ink/10 bg-white px-4 py-2 text-sm text-ink transition-colors hover:bg-sand"
                      >
                        Reply
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-ink/40">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
