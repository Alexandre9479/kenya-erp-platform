import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/supabase";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const supabase = await createServiceClient();

        // Step 1: Get user by email
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("email", (credentials.email as string).toLowerCase().trim())
          .single();

        if (userError || !user) return null;

        // Cast to a typed object since full DB types generated in Phase 3
        const u = user as {
          id: string;
          email: string;
          password_hash: string;
          full_name: string;
          role: UserRole;
          is_active: boolean;
          tenant_id: string | null;
        };

        if (!u.is_active) return null;

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          u.password_hash
        );
        if (!isValidPassword) return null;

        // Step 2: If tenant user, validate tenant status
        let tenantName: string | null = null;
        let tenantLogo: string | null = null;

        if (u.role !== "super_admin" && u.tenant_id) {
          const { data: tenant, error: tenantError } = await supabase
            .from("tenants")
            .select("id, name, logo_url, is_active, subscription_status, trial_ends_at")
            .eq("id", u.tenant_id)
            .single();

          if (tenantError || !tenant) return null;

          const t = tenant as {
            id: string;
            name: string;
            logo_url: string | null;
            is_active: boolean;
            subscription_status: string;
            trial_ends_at: string | null;
          };

          if (!t.is_active) return null;
          if (t.subscription_status === "expired") return null;
          if (
            t.subscription_status === "trial" &&
            t.trial_ends_at &&
            new Date(t.trial_ends_at) < new Date()
          ) {
            return null;
          }

          tenantName = t.name;
          tenantLogo = t.logo_url;
        }

        return {
          id: u.id,
          email: u.email,
          name: u.full_name,
          role: u.role,
          tenantId: u.tenant_id,
          tenantName,
          tenantLogo,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          role: UserRole;
          tenantId: string | null;
          tenantName: string | null;
          tenantLogo: string | null;
        };
        token.id = u.id;
        token.role = u.role;
        token.tenantId = u.tenantId;
        token.tenantName = u.tenantName;
        token.tenantLogo = u.tenantLogo;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        const u = session.user as typeof session.user & {
          id: string;
          role: UserRole;
          tenantId: string | null;
          tenantName: string | null;
          tenantLogo: string | null;
        };
        u.id = token.id as string;
        u.role = token.role as UserRole;
        u.tenantId = (token.tenantId as string | null) ?? null;
        u.tenantName = (token.tenantName as string | null) ?? null;
        u.tenantLogo = (token.tenantLogo as string | null) ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});
