"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function SignInPage() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(form.email, form.password);
      toast.success("Welcome back");
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
      toast.success("Welcome back");
      router.push("/");
    } catch (err) {
      toast.error(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <p className="eyebrow mb-2">Welcome Back</p>
      <h1 className="font-display text-4xl mb-8">Sign In</h1>

      <form onSubmit={handleSubmit}>
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
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Button type="submit" loading={loading} className="w-full mb-4">
          Sign In
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
        Don't have an account?{" "}
        <Link href="/signup" className="text-burgundy underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
