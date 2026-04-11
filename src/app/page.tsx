import { redirect } from "next/navigation";

/**
 * Root page — redirects to /dashboard.
 * The middleware handles auth: unauthenticated users are sent to /login.
 */
export default function HomePage() {
  redirect("/dashboard");
}
