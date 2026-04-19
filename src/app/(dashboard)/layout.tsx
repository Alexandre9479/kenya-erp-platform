export const dynamic = "force-dynamic";

import AppHeader from "@/components/layout/app-header";
import { OnboardingBanner } from "@/components/onboarding/onboarding-banner";
import { auth } from "@/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader />
      <main className="flex-1 p-4 md:p-6">
        <OnboardingBanner role={role} />
        {children}
      </main>
    </div>
  );
}
