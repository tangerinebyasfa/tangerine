"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function SignUpPage() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await signUpWithEmail(form.email, form.password, form.name);
      toast.success("Account created — welcome!");
      router.push("/");
    } catch (err) {
      toast.error(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success("Account created — welcome!");
      router.push("/");
    } catch (err) {
      toast.error(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <p className="eyebrow mb-2">Join Us</p>
      <h1 className="font-display text-4xl mb-8">Create Account</h1>

      <form onSubmit={handleSubmit}>
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
          label="Password"
          type="password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Button type="submit" loading={loading} className="w-full mb-4">
          Create Account
        </Button>
      </form>

      <div className="flex items-center gap-4 my-6">
        <div className="h-px bg-ink/10 flex-1" />
        <span className="text-xs uppercase text-ink/40">or</span>
        <div className="h-px bg-ink/10 flex-1" />
      </div>

      <Button variant="outline" onClick={handleGoogle} loading={loading} className="w-full">
        Continue with Google
      </Button>

      <p className="text-sm text-ink/60 mt-8 text-center">
        Already have an account?{" "}
        <Link href="/signin" className="text-burgundy underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
