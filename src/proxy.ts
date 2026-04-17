import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Public paths that don't need authentication
const PUBLIC_PATHS = ["/login", "/register", "/api/auth"];


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
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!session) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Super admin routes
  if (path.startsWith("/admin")) {
    const role = (session.user as { role?: string })?.role;
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
