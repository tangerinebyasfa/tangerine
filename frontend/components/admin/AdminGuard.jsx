"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../ui/Spinner";

export default function AdminGuard({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.push("/");
  }, [loading, user, isAdmin, router]);

  if (loading || !user || !isAdmin) return <Spinner className="min-h-[50vh]" />;

  return children;
}
