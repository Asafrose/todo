# Todo App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: This plan is designed for swarm team execution with parallel development.

**Goal:** Build a full-stack todo application with calendar sync, PWA capabilities, team collaboration, AI features, and local mode support.

**Architecture:** Next.js 15 monorepo with App Router, PostgreSQL (Prisma), NextAuth.js, tRPC, Supabase Realtime, Ollama/OpenAI for AI features, next-pwa for offline support.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma, PostgreSQL, NextAuth.js, tRPC, Vitest, Playwright, Ollama, OpenAI

**Team Structure:**
- tech-lead (opus): Architecture, design, code review
- dev-auth (haiku): Authentication system
- dev-core (haiku): Todos, teams, calendar sync
- dev-ai (haiku): AI features, PWA setup

---

## Phase 1: Project Foundation

**Owner:** tech-lead (design) → dev-core (implementation)

**Deliverables:**
- Next.js 15 project initialized
- Monorepo structure configured
- Database schema created
- Testing infrastructure ready
- CI/CD pipeline configured

### Task 1.1: Initialize Next.js Project

**Files:**
- Create: `package.json`
- Create: `next.config.js`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `.env.example`

**Steps:**

1. Initialize Next.js with TypeScript
```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

2. Install core dependencies
```bash
npm install @tanstack/react-query @trpc/client @trpc/server @trpc/react-query zod
npm install prisma @prisma/client
npm install next-auth@beta
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npm install -D eslint-config-prettier prettier
```

3. Configure environment variables
```bash
cp .env.example .env.local
```

`.env.example`:
```
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/todo_dev"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth (optional for cloud mode)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Apple Sign In (optional for cloud mode)
APPLE_ID=""
APPLE_SECRET=""

# AI Mode (local | cloud)
AI_MODE="local"

# OpenAI (if AI_MODE=cloud)
OPENAI_API_KEY=""

# Ollama (if AI_MODE=local)
OLLAMA_BASE_URL="http://localhost:11434"

# Auth Mode (local | cloud)
AUTH_MODE="local"
```

4. Configure Prettier and ESLint
`.prettierrc`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2
}
```

5. Update `next.config.js` for PWA
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  reactStrictMode: true,
});
```

6. Commit
```bash
git add .
git commit -m "chore: initialize Next.js project with TypeScript and Tailwind"
```

**Definition of Done:**
- [ ] `npm run dev` starts successfully
- [ ] `npm run build` completes without errors
- [ ] TypeScript compiles with 0 errors
- [ ] Tech lead review approved

### Task 1.2: Set up Prisma with PostgreSQL

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `lib/prisma.ts`

**Steps:**

1. Initialize Prisma
```bash
npx prisma init
```

2. Create database schema in `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  password      String?   // For local mode (bcrypt hashed)
  provider      String?   // "google" | "apple" | "local"
  providerId    String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  todos          Todo[]
  teamMembers    TeamMember[]
  calendarTokens CalendarToken[]
  accounts       Account[]
  sessions       Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Todo {
  id              String    @id @default(cuid())
  title           String
  description     String?
  dueDate         DateTime?
  priority        String    @default("medium") // "low" | "medium" | "high"
  status          String    @default("pending") // "pending" | "completed" | "archived"
  tags            String[]
  isPersonal      Boolean   @default(true)
  calendarEventId String?   // Synced Google/Apple event ID

  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  teamId    String?
  team      Team?     @relation(fields: [teamId], references: [id], onDelete: Cascade)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([userId])
  @@index([teamId])
  @@index([status])
}

model Team {
  id          String    @id @default(cuid())
  name        String
  description String?

  todos       Todo[]
  members     TeamMember[]
  invites     TeamInvite[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model TeamMember {
  id        String   @id @default(cuid())
  role      String   @default("member") // "owner" | "member" | "viewer"

  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([userId, teamId])
}

model TeamInvite {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  role      String   @default("member")
  status    String   @default("pending") // "pending" | "accepted" | "revoked"

  teamId    String
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  invitedBy String

  expiresAt DateTime
  createdAt DateTime @default(now())
}

model CalendarToken {
  id           String    @id @default(cuid())
  provider     String    // "google" | "apple"
  accessToken  String    @db.Text
  refreshToken String?   @db.Text
  expiresAt    DateTime?

  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@unique([userId, provider])
}
```

3. Create Prisma client singleton in `lib/prisma.ts`
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

4. Generate Prisma client
```bash
npx prisma generate
```

5. Run migrations
```bash
npx prisma migrate dev --name init
```

Expected output: "Your database is now in sync with your schema."

6. Commit
```bash
git add prisma/ lib/prisma.ts
git commit -m "feat: add Prisma schema and database client"
```

**Definition of Done:**
- [ ] `npx prisma generate` succeeds
- [ ] `npx prisma migrate dev` succeeds
- [ ] Database schema matches design doc
- [ ] Prisma client imports without errors
- [ ] Tech lead review approved

### Task 1.3: Configure Testing Infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/example.test.ts`

**Steps:**

1. Configure Vitest in `vitest.config.ts`
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.config.*",
        "**/*.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

2. Create test setup file `tests/setup.ts`
```typescript
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

3. Configure Playwright in `playwright.config.ts`
```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

4. Create example test `tests/example.test.ts`
```typescript
import { describe, it, expect } from "vitest";

describe("Example Test", () => {
  it("should pass", () => {
    expect(1 + 1).toBe(2);
  });
});
```

5. Update `package.json` scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

6. Run test to verify
```bash
npm test
```

Expected: "✓ tests/example.test.ts (1) 1 passed"

7. Commit
```bash
git add vitest.config.ts playwright.config.ts tests/ package.json
git commit -m "feat: configure Vitest and Playwright testing infrastructure"
```

**Definition of Done:**
- [ ] `npm test` runs and passes
- [ ] `npm run test:e2e` is configured (tests will fail until app is ready)
- [ ] Test coverage reports generate
- [ ] Tech lead review approved

### Task 1.4: Set up tRPC

**Files:**
- Create: `server/trpc.ts`
- Create: `server/routers/_app.ts`
- Create: `server/routers/example.ts`
- Create: `app/api/trpc/[trpc]/route.ts`
- Create: `lib/trpc/client.ts`
- Create: `lib/trpc/Provider.tsx`

**Steps:**

1. Install tRPC dependencies
```bash
npm install @trpc/server @trpc/client @trpc/next @trpc/react-query @tanstack/react-query superjson
```

2. Create tRPC context and router in `server/trpc.ts`
```typescript
import { initTRPC } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";

export const createTRPCContext = async (opts: { req: NextRequest }) => {
  return {
    req: opts.req,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
```

3. Create example router in `server/routers/example.ts`
```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),
});
```

4. Create root router in `server/routers/_app.ts`
```typescript
import { createTRPCRouter } from "../trpc";
import { exampleRouter } from "./example";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
});

export type AppRouter = typeof appRouter;
```

5. Create API route handler in `app/api/trpc/[trpc]/route.ts`
```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/server/routers/_app";
import { createTRPCContext } from "@/server/trpc";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
  });

export { handler as GET, handler as POST };
```

6. Create tRPC client in `lib/trpc/client.ts`
```typescript
import { httpBatchLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import { type AppRouter } from "@/server/routers/_app";
import superjson from "superjson";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    };
  },
  ssr: false,
});
```

7. Create tRPC Provider in `lib/trpc/Provider.tsx`
```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";
import { trpc } from "./client";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: "/api/trpc",
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

8. Update root layout in `app/layout.tsx`
```typescript
import { TRPCProvider } from "@/lib/trpc/Provider";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
```

9. Test tRPC with example usage in `app/page.tsx`
```typescript
"use client";

import { trpc } from "@/lib/trpc/client";

export default function Home() {
  const hello = trpc.example.hello.useQuery({ text: "World" });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">
        {hello.data ? hello.data.greeting : "Loading..."}
      </h1>
    </main>
  );
}
```

10. Start dev server and verify
```bash
npm run dev
```

Visit http://localhost:3000 - should show "Hello World"

11. Commit
```bash
git add server/ lib/trpc/ app/api/trpc/ app/layout.tsx app/page.tsx
git commit -m "feat: configure tRPC with example router"
```

**Definition of Done:**
- [ ] tRPC endpoint responds at /api/trpc
- [ ] Example query works on homepage
- [ ] Type safety verified (hover over `hello.data` shows correct type)
- [ ] Tech lead review approved

---

## Phase 2: Authentication System

**Owner:** dev-auth

**Deliverables:**
- NextAuth.js configured with local + OAuth
- Sign up / sign in pages
- User session management
- Protected API routes

### Task 2.1: Configure NextAuth.js

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `lib/auth.ts`
- Create: `lib/password.ts`

**Steps:**

1. Install NextAuth and bcrypt
```bash
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
```

2. Create password utility in `lib/password.ts`
```typescript
import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
```

3. Create auth config in `lib/auth.ts`
```typescript
import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { verifyPassword } from "./password";

const AUTH_MODE = process.env.AUTH_MODE || "local";

export const authOptions: NextAuthOptions = {
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
            async authorize(credentials) {
              if (!credentials?.email || !credentials?.password) {
                throw new Error("Email and password required");
              }

              const user = await prisma.user.findUnique({
                where: { email: credentials.email },
              });

              if (!user || !user.password) {
                throw new Error("Invalid credentials");
              }

              const isValid = await verifyPassword(
                credentials.password,
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
    signUp: "/auth/signup",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
```

4. Create NextAuth route handler in `app/api/auth/[...nextauth]/route.ts`
```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

5. Create type definitions in `types/next-auth.d.ts`
```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
}
```

6. Commit
```bash
git add lib/auth.ts lib/password.ts app/api/auth/ types/
git commit -m "feat: configure NextAuth.js with local and OAuth support"
```

**Definition of Done:**
- [ ] NextAuth API routes respond at /api/auth/*
- [ ] Local auth configured for email/password
- [ ] OAuth providers configured (when AUTH_MODE=cloud)
- [ ] TypeScript types defined for session
- [ ] Tech lead review approved

### Task 2.2: Build Sign In / Sign Up UI

**Files:**
- Create: `app/auth/signin/page.tsx`
- Create: `app/auth/signup/page.tsx`
- Create: `app/auth/error/page.tsx`
- Create: `components/auth/SignInForm.tsx`
- Create: `components/auth/SignUpForm.tsx`

**Steps:**

1. Install UI dependencies
```bash
npm install @radix-ui/react-label @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
```

2. Add shadcn/ui Button component (or create manually)
```bash
npx shadcn-ui@latest add button input label card
```

3. Create Sign In form in `components/auth/SignInForm.tsx`
```typescript
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE || "local";

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          {AUTH_MODE === "cloud" && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              >
                Sign in with Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => signIn("apple", { callbackUrl: "/dashboard" })}
              >
                Sign in with Apple
              </Button>
            </>
          )}
        </form>

        <div className="mt-4 text-center text-sm">
          Don't have an account?{" "}
          <a href="/auth/signup" className="text-primary hover:underline">
            Sign up
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
```

4. Create Sign Up form in `components/auth/SignUpForm.tsx`
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      // Redirect to sign in
      router.push("/auth/signin?registered=true");
    } catch (err) {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your details to create a new account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <a href="/auth/signin" className="text-primary hover:underline">
            Sign in
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
```

5. Create Sign In page in `app/auth/signin/page.tsx`
```typescript
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignInForm />
    </div>
  );
}
```

6. Create Sign Up page in `app/auth/signup/page.tsx`
```typescript
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignUpForm />
    </div>
  );
}
```

7. Create signup API route in `app/api/auth/signup/route.ts`
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = signupSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        provider: "local",
      },
    });

    return NextResponse.json(
      { message: "User created", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

8. Test sign up and sign in flows
```bash
npm run dev
```

Visit:
- http://localhost:3000/auth/signup - create account
- http://localhost:3000/auth/signin - sign in

9. Commit
```bash
git add app/auth/ components/auth/ app/api/auth/signup/
git commit -m "feat: build sign in and sign up UI with local auth"
```

**Definition of Done:**
- [ ] Sign up flow works (creates user in database)
- [ ] Sign in flow works (authenticates user)
- [ ] OAuth buttons shown only in cloud mode
- [ ] Password validation works (min 8 chars)
- [ ] Error messages display correctly
- [ ] Tech lead review approved

### Task 2.3: Protect Routes and Add Session Management

**Files:**
- Create: `lib/auth-utils.ts`
- Create: `middleware.ts`
- Create: `components/SessionProvider.tsx`
- Create: `app/dashboard/page.tsx`

**Steps:**

1. Create auth utilities in `lib/auth-utils.ts`
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/signin");
  }
  return session;
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}
```

2. Create middleware in `middleware.ts`
```typescript
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: "/auth/signin",
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/todos/:path*", "/api/teams/:path*"],
};
```

3. Create session provider in `components/SessionProvider.tsx`
```typescript
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

4. Update root layout to include SessionProvider
```typescript
import { TRPCProvider } from "@/lib/trpc/Provider";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

5. Create protected dashboard page in `app/dashboard/page.tsx`
```typescript
import { requireAuth } from "@/lib/auth-utils";

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">Todo App</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session.user.email}
            </span>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 p-4">
        <h2 className="text-2xl font-bold">Welcome, {session.user.name || session.user.email}!</h2>
        <p className="mt-2 text-gray-600">Your todos will appear here.</p>
      </main>
    </div>
  );
}
```

6. Test protected routes
```bash
npm run dev
```

Test:
- Visit /dashboard without auth → redirects to /auth/signin
- Sign in → redirects to /dashboard
- Sign out → redirects to homepage

7. Commit
```bash
git add lib/auth-utils.ts middleware.ts components/SessionProvider.tsx app/dashboard/
git commit -m "feat: add route protection and session management"
```

**Definition of Done:**
- [ ] Protected routes redirect to sign in when not authenticated
- [ ] Dashboard shows after successful authentication
- [ ] Sign out works and clears session
- [ ] Session persists across page refreshes
- [ ] Tech lead review approved

---

## Phase 3: Core Todo Features

**Owner:** dev-core

**Deliverables:**
- Todo CRUD API routes (tRPC)
- Todo UI components
- Personal todo list page
- Todo detail/edit views

### Task 3.1: Build Todo tRPC Router

**Files:**
- Create: `server/routers/todos.ts`
- Update: `server/routers/_app.ts`

**Steps:**

1. Create todo router in `server/routers/todos.ts`
```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TRPCError } from "@trpc/server";

// Validation schemas
const createTodoSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  tags: z.array(z.string()).default([]),
});

const updateTodoSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["pending", "completed", "archived"]).optional(),
  tags: z.array(z.string()).optional(),
});

export const todoRouter = createTRPCRouter({
  // Get all personal todos for current user
  list: publicProcedure.query(async ({ ctx }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return prisma.todo.findMany({
      where: {
        userId: session.user.id,
        isPersonal: true,
        status: { not: "archived" },
      },
      orderBy: [
        { status: "asc" }, // pending first
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });
  }),

  // Get single todo by ID
  get: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const todo = await prisma.todo.findUnique({
        where: { id: input.id },
        include: { user: { select: { name: true, email: true } } },
      });

      if (!todo || todo.userId !== session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return todo;
    }),

  // Create new todo
  create: publicProcedure
    .input(createTodoSchema)
    .mutation(async ({ input, ctx }) => {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return prisma.todo.create({
        data: {
          ...input,
          userId: session.user.id,
          isPersonal: true,
        },
      });
    }),

  // Update existing todo
  update: publicProcedure
    .input(updateTodoSchema)
    .mutation(async ({ input, ctx }) => {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const { id, ...data } = input;

      // Verify ownership
      const todo = await prisma.todo.findUnique({ where: { id } });
      if (!todo || todo.userId !== session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return prisma.todo.update({
        where: { id },
        data,
      });
    }),

  // Delete todo
  delete: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Verify ownership
      const todo = await prisma.todo.findUnique({ where: { id: input.id } });
      if (!todo || todo.userId !== session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return prisma.todo.delete({
        where: { id: input.id },
      });
    }),

  // Toggle todo completion
  toggleComplete: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const todo = await prisma.todo.findUnique({ where: { id: input.id } });
      if (!todo || todo.userId !== session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return prisma.todo.update({
        where: { id: input.id },
        data: {
          status: todo.status === "completed" ? "pending" : "completed",
        },
      });
    }),
});
```

2. Update app router to include todo router
```typescript
import { createTRPCRouter } from "../trpc";
import { exampleRouter } from "./example";
import { todoRouter } from "./todos";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  todos: todoRouter,
});

export type AppRouter = typeof appRouter;
```

3. Write tests for todo router in `tests/routers/todos.test.ts`
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "@/server/routers/_app";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

// Mock NextAuth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("Todo Router", () => {
  const mockSession = {
    user: { id: "user-123", email: "test@example.com", name: "Test User" },
  };

  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
  });

  it("should create a todo", async () => {
    const caller = appRouter.createCaller({} as any);

    const todo = await caller.todos.create({
      title: "Test Todo",
      description: "Test Description",
      priority: "high",
    });

    expect(todo).toMatchObject({
      title: "Test Todo",
      description: "Test Description",
      priority: "high",
      status: "pending",
      isPersonal: true,
      userId: "user-123",
    });
  });

  it("should list user todos", async () => {
    const caller = appRouter.createCaller({} as any);

    // Create some todos first
    await caller.todos.create({ title: "Todo 1" });
    await caller.todos.create({ title: "Todo 2" });

    const todos = await caller.todos.list();

    expect(todos.length).toBeGreaterThanOrEqual(2);
    expect(todos.every((t) => t.userId === "user-123")).toBe(true);
  });

  it("should throw unauthorized when no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const caller = appRouter.createCaller({} as any);

    await expect(caller.todos.list()).rejects.toThrow("UNAUTHORIZED");
  });
});
```

4. Run tests
```bash
npm test tests/routers/todos.test.ts
```

Expected: Tests pass

5. Commit
```bash
git add server/routers/todos.ts server/routers/_app.ts tests/routers/
git commit -m "feat: add todo tRPC router with CRUD operations"
```

**Definition of Done:**
- [ ] All CRUD operations work (list, get, create, update, delete)
- [ ] Authorization checks prevent unauthorized access
- [ ] Unit tests pass for todo router
- [ ] TypeScript types correctly inferred
- [ ] Tech lead review approved

---

*[Continued in next sections...]*

**REMAINING PHASES TO DOCUMENT:**
- Phase 3 (continued): Todo UI Components
- Phase 4: Team Collaboration
- Phase 5: Calendar Integration
- Phase 6: AI Features
- Phase 7: PWA Features
- Phase 8: Testing & E2E

**NOTE:** This is a partial plan. The tech lead will create detailed designs for each remaining phase as the team progresses. Each phase will follow the same pattern:
1. Tech lead designs the feature
2. Team lead creates task list from design
3. Developers implement with DoD checklists
4. Tech lead reviews code
5. Status reporter monitors PR

---

## Execution Strategy

Since this is a swarm team project, execution will be:

1. **Team lead** (you reading this) will:
   - Create swarm team with tech-lead + 3 developers
   - Break each phase into TaskList items
   - Assign tasks to developers based on domain
   - Monitor progress and unblock issues

2. **Tech lead** (opus) will:
   - Create detailed designs for each phase
   - Review all code before merge
   - Guide developers on technical questions

3. **Developers** (haiku) will:
   - Claim tasks from TaskList
   - Implement with verification at each step
   - Request tech lead review before pushing
   - Run tests and ensure quality

4. **Status reporter** (haiku) will:
   - Monitor PRs for review comments
   - Check CI/CD status
   - Report back to team lead

**Critical Success Factors:**
1. ✅ Incremental verification (don't wait until end)
2. ✅ Tech lead review before pushing
3. ✅ DoD checklists with executable commands
4. ✅ Evidence-based completion (paste test output)
5. ✅ Frequent commits with clear messages

**Expected Timeline:**
- Phase 1: ~2-3 hours (parallel setup tasks)
- Phase 2: ~3-4 hours (auth is foundational)
- Phase 3: ~4-5 hours (core features)
- Phase 4-8: ~10-15 hours total
- **Total: 20-25 hours of swarm work**

Good luck! 🚀
