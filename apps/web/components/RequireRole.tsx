"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import type { User } from "@/lib/api/users";

type Props = {
  role: User["role"];
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function RequireRole({ role, children, fallback = null }: Props) {
  const { user } = useAuth();
  if (user?.role !== role) return <>{fallback}</>;
  return <>{children}</>;
}
