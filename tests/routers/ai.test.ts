import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "@/server/routers/_app";

// Mock NextAuth - need to mock entire module with default export
vi.mock("next-auth", () => {
  return {
    default: vi.fn(() => ({
      handlers: { get: vi.fn(), post: vi.fn() },
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })),
    getServerSession: vi.fn(),
  };
});

// Mock AI client
vi.mock("@/lib/ai/client", () => ({
  aiClient: {
    generateText: vi.fn(async (prompt: string) => {
      // Return JSON for NLP parsing requests, regular text for briefings
      if (prompt.includes("Convert the following user input")) {
        return {
          content: JSON.stringify({
            title: "Buy milk",
            description: null,
            priority: "medium",
            dueDate: "2026-02-16T15:00:00Z",
            tags: [],
          }),
          model: "mistral:7b",
          usage: { promptTokens: 100, completionTokens: 30 },
        };
      }
      // Default briefing response
      return {
        content: "Good morning! You have 3 todos today. Focus on high-priority items first.",
        model: "llama3.1:8b",
        usage: { promptTokens: 150, completionTokens: 50 },
      };
    }),
  },
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    todo: {
      findMany: vi.fn(async () => [
        {
          id: "todo-1",
          title: "Review PR",
          priority: "high",
          status: "pending",
          dueDate: new Date(),
        },
        {
          id: "todo-2",
          title: "Write documentation",
          priority: "medium",
          status: "pending",
          dueDate: new Date(),
        },
      ]),
    },
  },
}));

describe("AI Router", () => {
  it("should generate daily briefing", async () => {
    const mockCtx = {
      user: { id: "user-123", email: "test@example.com", name: "Test User" },
    };
    const caller = appRouter.createCaller(mockCtx);

    const result = await caller.ai.dailyBriefing();

    expect(result).toHaveProperty("briefing");
    expect(result).toHaveProperty("model");
    expect(result).toHaveProperty("todosProcessed");
    expect(result.todosProcessed).toBeGreaterThan(0);
  });

  it("should throw unauthorized error when not authenticated", async () => {
    const mockCtx = { user: null };
    const caller = appRouter.createCaller(mockCtx);

    await expect(caller.ai.dailyBriefing()).rejects.toThrow("Not authenticated");
  });

  it("should parse natural language todo", async () => {
    const mockCtx = {
      user: { id: "user-123", email: "test@example.com", name: "Test User" },
    };
    const caller = appRouter.createCaller(mockCtx);

    const result = await caller.ai.parseTodo({
      text: "Buy milk tomorrow at 3pm",
    });

    expect(result).toHaveProperty("parsed");
    expect(result).toHaveProperty("count");
    expect(Array.isArray(result.parsed)).toBe(true);
  });

  it("should handle multiple todos in NLP parsing", async () => {
    const mockCtx = {
      user: { id: "user-123", email: "test@example.com", name: "Test User" },
    };
    const caller = appRouter.createCaller(mockCtx);

    const result = await caller.ai.parseTodo({
      text: `
- Buy groceries
- Call dentist
- Review code
      `,
    });

    expect(result.count).toBeGreaterThan(0);
  });
});
