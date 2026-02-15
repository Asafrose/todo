import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { verifyPassword } from "./password";

const AUTH_MODE = process.env.AUTH_MODE || "local";

const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Local mode: email/password
    ...(AUTH_MODE === "local"
      ? [
          CredentialsProvider({
            name: "credentials",
            credentials: {
              email: { label: "Email", type: "email" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials: Record<string, unknown>) {
              if (!credentials?.email || !credentials?.password) {
                throw new Error("Email and password required");
              }

              const user = await prisma.user.findUnique({
                where: { email: String(credentials.email) },
              });

              if (!user || !user.password) {
                throw new Error("Invalid credentials");
              }

              const isValid = await verifyPassword(
                String(credentials.password),
                user.password
              );

              if (!isValid) {
                throw new Error("Invalid credentials");
              }

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
              };
            },
          }),
        ]
      : []),

    // Cloud mode: OAuth providers
    ...(AUTH_MODE === "cloud"
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
          AppleProvider({
            clientId: process.env.APPLE_ID!,
            clientSecret: process.env.APPLE_SECRET!,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
export const authOptions = authConfig;
