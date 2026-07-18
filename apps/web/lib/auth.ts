import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const SESSION_VERSION_CHECK_INTERVAL_MS = 60_000;

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            emailVerified: true,
            image: true,
            role: true,
          },
        });

        if (!user || !user.passwordHash || !user.emailVerified) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;

        const currentUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { sessionVersion: true },
        });
        if (!currentUser) return null;

        token.sessionVersion = currentUser.sessionVersion;
        token.sessionVersionCheckedAt = Date.now();
        return token;
      }

      // JWTs emitidos antes desta proteção não têm uma versão confiável.
      if (!token.id || typeof token.sessionVersion !== "number") return null;

      const lastCheckedAt = token.sessionVersionCheckedAt ?? 0;
      if (Date.now() - lastCheckedAt < SESSION_VERSION_CHECK_INTERVAL_MS) {
        return token;
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: { sessionVersion: true },
      });
      if (!currentUser || currentUser.sessionVersion !== token.sessionVersion) {
        return null;
      }

      token.sessionVersionCheckedAt = Date.now();
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as "USER" | "ADMIN";
      }
      return session;
    },
  },
});
