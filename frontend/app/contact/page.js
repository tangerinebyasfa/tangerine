"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { db, collection, addDoc, serverTimestamp } from "../../lib/firebase";
import PageHeader from "../../components/ui/PageHeader";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "messages"), { ...form, createdAt: serverTimestamp() });
      toast.success("Message sent — we'll be in touch soon.");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <PageHeader
        eyebrow="Get in Touch"
        title="Contact Us"
        description="Questions about an order, a fit, or a fabric? Send a note and our studio team will reply within two business days."
      />

      <form onSubmit={handleSubmit} className="max-w-lg">
        <Input
          label="Full Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Message"
          textarea
          required
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        <Button type="submit" loading={loading}>Send Message</Button>
      </form>
    </div>
  );
}
