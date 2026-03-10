"use client";

import type { UserRole } from "@/lib/types";
import { hasPermission } from "@/lib/constants";

interface RoleGateProps {
  role: UserRole;
  permission: Parameters<typeof hasPermission>[1];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({
  role,
  permission,
  children,
  fallback = null,
}: RoleGateProps) {
  if (!hasPermission(role, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
