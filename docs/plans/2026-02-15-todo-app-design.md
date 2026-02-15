# Todo App with Calendar Sync & AI - Design Document

**Date:** 2026-02-15
**Status:** Approved
**Type:** Greenfield Full-Stack Application

## Overview

A comprehensive todo application with calendar synchronization, PWA capabilities, team collaboration, and AI-powered features for daily briefings and natural language task creation.

## Architecture

**Pattern:** Monorepo with Next.js 15 full-stack application
**Deployment:** Vercel (frontend + API) + Supabase (database + realtime)
**Mobile Strategy:** Progressive Web App (PWA) with native-like experience

## Local Mode Support

The application must support **full local operation** without external dependencies for auth or AI:

### Local Authentication
- **Method:** Email/password with bcrypt hashing (no OAuth required)
- **Fallback Strategy:**
  - Cloud mode: Google/Apple OAuth via NextAuth.js
  - Local mode: Credentials provider with local user table
- **Configuration:** Environment variable `AUTH_MODE=local|cloud`

### Local AI
- **Provider:** Ollama with local LLM (llama3.1 or mistral)
- **Fallback Strategy:**
  - Cloud mode: OpenAI GPT-4
  - Local mode: Ollama REST API on localhost:11434
- **Configuration:** Environment variable `AI_MODE=local|cloud`
- **Models:**
  - Daily briefings: llama3.1:8b (faster, good for summaries)
  - NLP parsing: mistral:7b (better structured output)

### Local Database
- **Default:** PostgreSQL (can run via Docker)
- **Alternative:** SQLite for true single-file portability
- **Configuration:** `DATABASE_URL` in `.env`

### Local Calendar Sync
- **Limitation:** OAuth-based calendar sync requires cloud APIs
- **Workaround:**
  - Export/import .ics files
  - WebDAV support for self-hosted calendars (CalDAV)
  - Skip calendar sync entirely in local mode

### Quick Start Script
```bash
npm run dev:local
# Starts: Next.js dev server + Ollama + PostgreSQL (Docker)
```

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** React Context + TanStack Query for server state
- **PWA:** next-pwa with service workers and push notifications

### Backend
- **API Layer:** Next.js API routes with tRPC for end-to-end type safety
- **Database:** PostgreSQL (hosted on Supabase)
- **ORM:** Prisma with type-safe queries
- **Realtime:** Supabase Realtime for live collaboration
- **Caching:** Redis (Upstash) for rate limiting and session storage

### Authentication
- **Provider:** NextAuth.js v5
- **Cloud Mode:**
  - Google OAuth 2.0
  - Apple Sign In
- **Local Mode:**
  - Email/password with bcrypt (Credentials provider)
  - No external OAuth dependencies
- **Session:** JWT with secure httpOnly cookies
- **Authorization:** Role-based (owner, member, viewer)

### External Integrations
- **Calendar Sync:**
  - Cloud mode: Google Calendar API (bidirectional sync)
  - Cloud mode: Apple EventKit (via iOS PWA)
  - Local mode: .ics export/import, CalDAV support
- **AI/ML:**
  - Cloud mode: OpenAI GPT-4
  - Local mode: Ollama (llama3.1:8b, mistral:7b)
- **Push Notifications:** Web Push API + Supabase Edge Functions

### Testing
- **Unit Tests:** Vitest + React Testing Library
- **Integration Tests:** Vitest + Supertest for API routes
- **E2E Tests:** Playwright for critical user flows
- **Coverage Target:** 80% minimum

## Core Features

### 1. Todo Management
- Create, read, update, delete todos
- Rich text descriptions with markdown support
- Due dates, priorities, tags, and subtasks
- Recurring todos (daily, weekly, custom)
- Attachments and file uploads

### 2. Personal vs Team Todos
- **Personal:** Private todos visible only to user
- **Team:** Shared todos with:
  - Team creation and management
  - Member invitation via email/link
  - Role-based permissions (owner, member, viewer)
  - Activity feed and notifications
  - Real-time updates via Supabase Realtime

### 3. Calendar Synchronization
- **Google Calendar:**
  - OAuth 2.0 authentication
  - Bidirectional sync (todos ↔️ calendar events)
  - Conflict resolution with last-write-wins
  - Webhook notifications for real-time updates

- **iOS Calendar:**
  - PWA integration using Web Share Target API
  - EventKit access via native bridge
  - Read/write calendar events

### 4. Progressive Web App (PWA)
- **Offline Support:** Service workers with cache-first strategy
- **Install Prompt:** Native app-like installation on mobile/desktop
- **Push Notifications:**
  - Task reminders
  - Team activity updates
  - Daily briefing alerts
- **Native Features:**
  - Share Target API for quick todo creation
  - Badge API for unread count
  - Background Sync for offline actions

### 5. Invitation System
- **Email Invitations:** Send invite links via email
- **Magic Links:** One-time token-based team join
- **Invite Management:** Resend, revoke, and track invitations
- **Onboarding:** Guided setup for new team members

## AI-Powered Features

### 1. Daily Briefings
**Endpoint:** `POST /api/ai/daily-briefing`

**Functionality:**
- Aggregates today's todos + calendar events
- Uses GPT-4 to generate personalized summary
- Highlights priorities and time conflicts
- Suggests task reordering or rescheduling
- Can be triggered manually or via scheduled job (8am daily)

**Output Format:**
```
Good morning! Here's your day:

📅 Calendar (3 events):
- 9:00 AM: Team standup
- 2:00 PM: Client call with Acme Corp
- 4:00 PM: Code review session

✅ Todos (5 tasks):
HIGH PRIORITY:
- Finish DAY-123 PR review (due today)
- Prepare Q1 budget proposal

LATER TODAY:
- Update documentation
- Review Sarah's design mockups
- Buy groceries

⚠️ Conflicts: Your 2pm call overlaps with "Prepare budget" task (est. 2 hours). Consider moving it to morning.

💡 Suggestion: Start with PR review (30 min) before standup.
```

### 2. Natural Language Todo Creation
**Endpoint:** `POST /api/ai/parse-todo`

**Functionality:**
- Parses free-form text into structured todo
- Extracts: title, due date, time, priority, tags
- Uses GPT-4 with function calling for structured output
- Handles ambiguous dates ("next Monday", "in 3 days")
- Supports batch creation from multi-line input

**Examples:**
- Input: `"Buy milk tomorrow at 3pm"`
  - Output: `{ title: "Buy milk", due: "2026-02-16T15:00:00Z", priority: "medium" }`

- Input: `"HIGH: Review DAY-456 PR by end of week, tag: code-review"`
  - Output: `{ title: "Review DAY-456 PR", due: "2026-02-21T23:59:59Z", priority: "high", tags: ["code-review"] }`

- Input: `"Call dentist\nFinish report\nPick up dry cleaning"`
  - Output: `[{ title: "Call dentist", ... }, { title: "Finish report", ... }, ...]`

## Data Model

### User
```prisma
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

  todos         Todo[]
  teamMembers   TeamMember[]
  calendarTokens CalendarToken[]
}
```

### Todo
```prisma
model Todo {
  id          String    @id @default(cuid())
  title       String
  description String?
  dueDate     DateTime?
  priority    String    @default("medium") // "low" | "medium" | "high"
  status      String    @default("pending") // "pending" | "completed" | "archived"
  tags        String[]
  isPersonal  Boolean   @default(true)

  userId      String
  user        User      @relation(fields: [userId], references: [id])
  teamId      String?
  team        Team?     @relation(fields: [teamId], references: [id])

  calendarEventId String? // Synced Google/Apple event ID

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### Team
```prisma
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
```

### TeamMember
```prisma
model TeamMember {
  id        String   @id @default(cuid())
  role      String   @default("member") // "owner" | "member" | "viewer"

  userId    String
  user      User     @relation(fields: [userId], references: [id])
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id])

  createdAt DateTime @default(now())

  @@unique([userId, teamId])
}
```

### TeamInvite
```prisma
model TeamInvite {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  role      String   @default("member")
  status    String   @default("pending") // "pending" | "accepted" | "revoked"

  teamId    String
  team      Team     @relation(fields: [teamId], references: [id])
  invitedBy String

  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

### CalendarToken
```prisma
model CalendarToken {
  id           String   @id @default(cuid())
  provider     String   // "google" | "apple"
  accessToken  String   @db.Text
  refreshToken String?  @db.Text
  expiresAt    DateTime?

  userId       String
  user         User     @relation(fields: [userId], references: [id])

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([userId, provider])
}
```

## Testing Strategy

### Unit Tests (Vitest)
- **Business Logic:**
  - Todo CRUD operations
  - Team permission checks
  - Calendar sync logic
  - AI parsing utilities
- **Coverage:** 80% minimum
- **Mocking:** Database calls, external APIs

### Integration Tests (Vitest + Supertest)
- **API Routes:**
  - Todo endpoints with authentication
  - Team invite flow
  - Calendar sync endpoints
  - AI endpoints (with mocked OpenAI)
- **Database:** Use test database with seed data
- **Coverage:** All critical paths

### E2E Tests (Playwright)
- **Critical Flows:**
  1. User sign up with Google OAuth
  2. Create personal todo
  3. Create team and invite member
  4. Accept team invite
  5. Create team todo with real-time update
  6. Sync todo to Google Calendar
  7. Install PWA and enable notifications
  8. Create todo from natural language
  9. Request daily briefing
- **Environments:** Desktop Chrome, Mobile Safari
- **Data:** Isolated test accounts and teams

## Security Considerations

1. **Authentication:**
   - Secure OAuth 2.0 flow with PKCE
   - httpOnly cookies for JWT storage
   - CSRF protection with SameSite cookies

2. **Authorization:**
   - Row-level security in database
   - API route guards for team access
   - Invite token expiration (7 days)

3. **Data Protection:**
   - Encrypted calendar tokens at rest
   - HTTPS only in production
   - Rate limiting on AI endpoints (10 req/min per user)

4. **API Security:**
   - tRPC for type-safe APIs
   - Input validation with Zod schemas
   - SQL injection prevention via Prisma

## Deployment

### Infrastructure
- **Frontend + API:** Vercel (serverless functions)
- **Database:** Supabase (PostgreSQL + Realtime)
- **Redis:** Upstash (rate limiting, caching)
- **File Storage:** Vercel Blob (attachments)

### CI/CD
- **Pipeline:** GitHub Actions
- **Steps:**
  1. Install dependencies
  2. Run linting (ESLint, Prettier)
  3. Type checking (tsc)
  4. Unit + integration tests
  5. Build Next.js app
  6. Deploy to Vercel (preview for PRs, production for main)
  7. Run E2E tests against deployed preview

### Monitoring
- **Error Tracking:** Sentry
- **Analytics:** Vercel Analytics
- **Logs:** Vercel Logs + Supabase Logs

## Success Criteria

1. **Functionality:**
   - ✅ Users can create personal and team todos
   - ✅ Todos sync bidirectionally with Google Calendar
   - ✅ PWA installs on iOS/Android with notifications
   - ✅ Team invites work via email/link
   - ✅ Daily briefing provides useful summaries
   - ✅ Natural language parsing creates accurate todos

2. **Performance:**
   - Lighthouse PWA score > 90
   - First Contentful Paint < 1.5s
   - Time to Interactive < 3s
   - Real-time updates < 500ms latency

3. **Quality:**
   - Test coverage > 80%
   - Zero critical security vulnerabilities
   - TypeScript strict mode with no errors
   - Mobile-responsive on all screen sizes

4. **User Experience:**
   - Intuitive onboarding flow
   - Offline mode works seamlessly
   - Notifications arrive reliably
   - Calendar sync feels "magical" (just works)

## Open Questions / Future Enhancements

- **Integrations:** Slack, Linear, GitHub issues?
- **AI Features:** Smart task prioritization, time blocking suggestions?
- **Collaboration:** Comments, mentions, task assignments?
- **Analytics:** Personal productivity insights?
- **Mobile App:** React Native or keep PWA-only?

---

**Next Steps:**
1. Create implementation plan
2. Set up monorepo structure
3. Spawn swarm team with specialized workers
4. Begin parallel development
