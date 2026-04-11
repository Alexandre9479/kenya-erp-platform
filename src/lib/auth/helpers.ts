import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types/supabase";
import type { SessionUser } from "@/lib/types";

/**
 * Get the current session user in a Server Component.
 * Redirects to /login if not authenticated.
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = session.user as any;
  return {
    id: u.id as string,
    email: u.email as string,
    name: u.name as string,
    role: u.role as UserRole,
    tenantId: (u.tenantId as string) ?? null,
    tenantName: (u.tenantName as string) ?? null,
    tenantLogo: (u.tenantLogo as string) ?? null,
  };
}

/**
 * Require a specific role (or one of several roles).
 * Redirects to /dashboard if the user lacks permission.
 */
export async function requireRole(
  allowed: UserRole | UserRole[]
): Promise<SessionUser> {
  const user = await requireAuth();
  const allowedArray = Array.isArray(allowed) ? allowed : [allowed];
  if (!allowedArray.includes(user.role)) redirect("/dashboard");
  return user;
}

/**
 * Check if the user has any of the given roles (non-redirecting).
 */
export function hasRole(user: SessionUser, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

/**
 * Check if user is a super admin.
 */
export function isSuperAdmin(user: SessionUser): boolean {
  return user.role === "super_admin";
}

/**
 * Check if user can manage the tenant (super_admin or tenant_admin).
 */
export function canManageTenant(user: SessionUser): boolean {
  return user.role === "super_admin" || user.role === "tenant_admin";
}

/**
 * RBAC permission map — which roles can perform which module actions.
 */
export const PERMISSIONS = {
  inventory: {
    view: ["super_admin", "tenant_admin", "warehouse", "sales", "viewer"] as UserRole[],
    manage: ["super_admin", "tenant_admin", "warehouse"] as UserRole[],
  },
  sales: {
    view: ["super_admin", "tenant_admin", "sales", "accountant", "viewer"] as UserRole[],
    manage: ["super_admin", "tenant_admin", "sales"] as UserRole[],
  },
  purchasing: {
    view: ["super_admin", "tenant_admin", "purchasing", "accountant", "viewer"] as UserRole[],
    manage: ["super_admin", "tenant_admin", "purchasing"] as UserRole[],
  },
  accounting: {
    view: ["super_admin", "tenant_admin", "accountant", "viewer"] as UserRole[],
    manage: ["super_admin", "tenant_admin", "accountant"] as UserRole[],
  },
  hr: {
    view: ["super_admin", "tenant_admin", "hr", "viewer"] as UserRole[],
    manage: ["super_admin", "tenant_admin", "hr"] as UserRole[],
  },
  warehouse: {
    view: ["super_admin", "tenant_admin", "warehouse", "viewer"] as UserRole[],
    manage: ["super_admin", "tenant_admin", "warehouse"] as UserRole[],
  },
  users: {
    view: ["super_admin", "tenant_admin"] as UserRole[],
    manage: ["super_admin", "tenant_admin"] as UserRole[],
  },
  reports: {
    view: ["super_admin", "tenant_admin", "accountant", "viewer"] as UserRole[],
    manage: ["super_admin", "tenant_admin", "accountant"] as UserRole[],
  },
  settings: {
    view: ["super_admin", "tenant_admin"] as UserRole[],
    manage: ["super_admin", "tenant_admin"] as UserRole[],
  },
} as const;
