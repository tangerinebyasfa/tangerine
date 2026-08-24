"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../ui/Spinner";

function buildReturnUrl(pathname, searchParams) {
  const query = searchParams?.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/signin?next=${encodeURIComponent(buildReturnUrl(pathname, searchParams))}`);
    }
  }, [loading, user, router, pathname, searchParams]);

  if (loading || !user) return <Spinner className="min-h-[50vh]" />;

  return children;
}
