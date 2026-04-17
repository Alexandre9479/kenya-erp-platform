import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Public paths that don't need authentication
const PUBLIC_PATHS = ["/login", "/register", "/api/auth"];

// Route-level RBAC. Each entry maps a path prefix to the roles allowed to view it.
// The most specific prefix wins — keep longer prefixes higher up in the list.
// Anything not listed here is accessible to any authenticated user.
const ROUTE_ROLES: { prefix: string; roles: string[] }[] = [
  // Admin-only
  { prefix: "/admin", roles: ["super_admin"] },
  { prefix: "/users", roles: ["super_admin", "tenant_admin"] },
  { prefix: "/settings", roles: ["super_admin", "tenant_admin"] },

  // Finance suite — accountants, admins, viewers
  { prefix: "/accounting", roles: ["super_admin", "tenant_admin", "accountant", "viewer"] },
  { prefix: "/expenses", roles: ["super_admin", "tenant_admin", "accountant", "viewer"] },
  { prefix: "/reconciliation", roles: ["super_admin", "tenant_admin", "accountant"] },
  { prefix: "/supplier-recon", roles: ["super_admin", "tenant_admin", "accountant"] },
  { prefix: "/fixed-assets", roles: ["super_admin", "tenant_admin", "accountant"] },
  { prefix: "/budgets", roles: ["super_admin", "tenant_admin", "accountant"] },
  { prefix: "/etims", roles: ["super_admin", "tenant_admin", "accountant"] },

  // Operations
  { prefix: "/sales", roles: ["super_admin", "tenant_admin", "sales", "accountant", "viewer"] },
  { prefix: "/purchasing", roles: ["super_admin", "tenant_admin", "purchasing", "accountant", "viewer"] },
  { prefix: "/inventory", roles: ["super_admin", "tenant_admin", "warehouse", "sales", "viewer"] },
  { prefix: "/warehouse", roles: ["super_admin", "tenant_admin", "warehouse", "viewer"] },
  { prefix: "/crm", roles: ["super_admin", "tenant_admin", "sales", "viewer"] },

  // People
  { prefix: "/hr", roles: ["super_admin", "tenant_admin", "hr", "viewer"] },

  // Intelligence
  { prefix: "/reports", roles: ["super_admin", "tenant_admin", "accountant", "viewer"] },
];

function allowedForRole(path: string, role: string | undefined): boolean {
  const match = ROUTE_ROLES.find((r) => path === r.prefix || path.startsWith(r.prefix + "/"));
  if (!match) return true;
  if (!role) return false;
  return match.roles.includes(role);
}

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;

  // Allow all public paths
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    // Redirect logged-in users away from auth pages
    if (session && (path === "/login" || path === "/register")) {
      const role = (session.user as { role?: string })?.role;
      if (role === "super_admin") {
        return NextResponse.redirect(new URL("/admin", nextUrl));
      }
      return NextResponse.redirect(new URL("/apps", nextUrl));
    }
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!session) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route gating — skip for API routes so they can return 403 JSON themselves.
  if (!path.startsWith("/api/")) {
    const role = (session.user as { role?: string })?.role;
    if (!allowedForRole(path, role)) {
      return NextResponse.redirect(new URL("/apps", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
