/**
 * Full Auth.js instance (server runtime).
 *
 * Spreads the edge-safe config and adds the Prisma adapter plus the Credentials
 * provider, whose `authorize` verifies email/password against the database.
 * Import { auth } from here inside Server Components and Server Actions.
 */
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        // Returned object becomes the `user` arg to the jwt callback.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          position: user.position,
          institution: user.institution,
          role: user.role,
        };
      },
    }),
  ],
});
