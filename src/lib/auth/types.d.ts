import type { UserRole } from "@/lib/types/supabase";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tenantId: string | null;
    tenantName: string | null;
    tenantLogo: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      tenantId: string | null;
      tenantName: string | null;
      tenantLogo: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    tenantId: string | null;
    tenantName: string | null;
    tenantLogo: string | null;
  }
}
