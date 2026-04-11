import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Providers from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Kenya ERP Platform",
    template: "%s | Kenya ERP Platform",
  },
  description:
    "Multi-tenant SaaS ERP platform built for Kenyan businesses — inventory, sales, accounting, HR, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={4000}
            />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
