import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "@/server/routers/_app";
import { getServerSession } from "next-auth";

// Mock NextAuth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock AI client
vi.mock("@/lib/ai/client", () => ({
  aiClient: {
    generateText: vi.fn(async (prompt) => ({
      content: "Good morning! You have 3 todos today. Focus on high-priority items first.",
      model: "llama3.1:8b",
      usage: { promptTokens: 150, completionTokens: 50 },
    })),
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
  const mockSession = {
    user: { id: "user-123", email: "test@example.com", name: "Test User" },
  };

  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
  });

  it("should generate daily briefing", async () => {
    const caller = appRouter.createCaller({} as any);

    const result = await caller.ai.dailyBriefing();

    expect(result).toHaveProperty("briefing");
    expect(result).toHaveProperty("model");
    expect(result).toHaveProperty("todosProcessed");
    expect(result.todosProcessed).toBeGreaterThan(0);
  });

  it("should throw unauthorized error when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const caller = appRouter.createCaller({} as any);

    await expect(caller.ai.dailyBriefing()).rejects.toThrow("UNAUTHORIZED");
  });

  it("should parse natural language todo", async () => {
    const caller = appRouter.createCaller({} as any);

    const result = await caller.ai.parseTodo({
      text: "Buy milk tomorrow at 3pm",
    });

    expect(result).toHaveProperty("parsed");
    expect(result).toHaveProperty("count");
    expect(Array.isArray(result.parsed)).toBe(true);
  });

  it("should handle multiple todos in NLP parsing", async () => {
    const caller = appRouter.createCaller({} as any);

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
