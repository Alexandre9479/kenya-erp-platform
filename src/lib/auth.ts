import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/drizzle";
import { users, tenants } from "@/lib/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.tenantName = (user as any).tenantName;
        token.tenantLogo = (user as any).tenantLogo;
        token.currency = (user as any).currency;
        token.currencySymbol = (user as any).currencySymbol;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.tenantName = token.tenantName as string;
        session.user.tenantLogo = token.tenantLogo as string;
        session.user.currency = token.currency as string;
        session.user.currencySymbol = token.currencySymbol as string;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(6),
        }).safeParse(credentials);

        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const userResult = await db
          .select({
            id: users.id,
            tenantId: users.tenantId,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            password: users.password,
            role: users.role,
            isActive: users.isActive,
            tenantName: tenants.companyName,
            tenantLogo: tenants.companyLogo,
            currency: tenants.currency,
            currencySymbol: tenants.currencySymbol,
            tenantIsActive: tenants.isActive,
          })
          .from(users)
          .leftJoin(tenants, eq(users.tenantId, tenants.id))
          .where(eq(users.email, email))
          .limit(1);

        const user = userResult[0];
        if (!user) return null;
        if (!user.isActive) return null;
        if (user.tenantId && !user.tenantIsActive) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        // Update last login
        await db
          .update(users)
          .set({ lastLogin: new Date(), updatedAt: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          tenantId: user.tenantId,
          firstName: user.firstName,
          lastName: user.lastName,
          tenantName: user.tenantName,
          tenantLogo: user.tenantLogo,
          currency: user.currency,
          currencySymbol: user.currencySymbol,
        };
      },
    }),
  ],
});