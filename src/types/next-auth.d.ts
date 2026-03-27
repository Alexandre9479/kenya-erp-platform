import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      tenantName: string;
      tenantLogo: string;
      currency: string;
      currencySymbol: string;
    } & DefaultSession["user"];
  }
}