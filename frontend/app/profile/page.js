"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import AuthGuard from "../../components/auth/AuthGuard";
import PageHeader from "../../components/ui/PageHeader";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    displayName: profile?.displayName || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({
      displayName: profile?.displayName || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
    });
  }, [profile]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateMe({ ...form });
      await refreshProfile();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.message || "Could not update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <PageHeader eyebrow="Account" title="My Profile" />

      <div className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-1">
          <p className="text-xs tracking-widest uppercase text-ink/40 mb-2">Signed in as</p>
          <p className="text-sm">{user.email}</p>
          <p className="text-xs tracking-widest uppercase text-ink/40 mt-6 mb-2">Role</p>
          <p className="text-sm capitalize">{profile?.role || "customer"}</p>
        </div>

        <form onSubmit={handleSubmit} className="md:col-span-2 max-w-md">
          <Input
            label="Full Name"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Shipping Address"
            textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Button type="submit" loading={loading}>Save Changes</Button>
        </form>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileForm />
    </AuthGuard>
  );
}
