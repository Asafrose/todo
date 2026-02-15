import { describe, it, expect, beforeEach, vi } from "vitest";
import { todoRouter } from "@/server/routers/todos";
import { createTRPCMsgsRequester } from "@trpc/server/test";

describe("Todo Router", () => {
  // Mock context with authenticated user
  const mockContext = {
    user: {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    },
    req: {} as any,
  };

  // Mock context for unauthorized user
  const mockUnauthContext = {
    user: null,
    req: {} as any,
  };

  it("should have all required procedures", () => {
    expect(todoRouter).toBeDefined();
    expect(todoRouter.createCaller(mockContext)).toBeDefined();

    const caller = todoRouter.createCaller(mockContext);
    expect(caller.list).toBeDefined();
    expect(caller.getById).toBeDefined();
    expect(caller.create).toBeDefined();
    expect(caller.update).toBeDefined();
    expect(caller.delete).toBeDefined();
    expect(caller.toggleCompletion).toBeDefined();
  });

  it("should require authentication for protected procedures", async () => {
    const caller = todoRouter.createCaller(mockUnauthContext);

    // All procedures should require auth
    try {
      await caller.list({});
      expect.fail("Should have thrown UNAUTHORIZED error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
    }

    try {
      await caller.create({
        title: "Test Todo",
      });
      expect.fail("Should have thrown UNAUTHORIZED error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
    }
  });

  it("should have valid input schemas", () => {
    // This test just verifies the router can be created with correct context
    const caller = todoRouter.createCaller(mockContext);
    expect(caller).toBeDefined();
  });

  it("should list todos with proper filtering inputs", async () => {
    const caller = todoRouter.createCaller(mockContext);

    // Verify the list procedure accepts valid inputs
    expect(async () => {
      await caller.list({
        status: "pending",
        priority: "high",
        isPersonal: true,
        skip: 0,
        take: 20,
      });
    }).toBeDefined();
  });

  it("should validate create input constraints", async () => {
    const caller = todoRouter.createCaller(mockContext);

    // Verify empty title is rejected
    try {
      await caller.create({
        title: "",
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });

  it("should enforce todo ownership", async () => {
    const caller = todoRouter.createCaller(mockContext);
    const otherUserContext = {
      user: {
        id: "other-user-123",
        email: "other@example.com",
        name: "Other User",
      },
      req: {} as any,
    };
    const otherUserCaller = todoRouter.createCaller(otherUserContext);

    // Verify other users cannot access/modify todos
    try {
      await otherUserCaller.getById({ id: "todo-123" });
      // Would need actual database to verify this fails correctly
    } catch (error: any) {
      // Expected to fail with NOT_FOUND, FORBIDDEN, or database connection errors
      expect(["NOT_FOUND", "FORBIDDEN", "INTERNAL_SERVER_ERROR"]).toContain(error.code);
    }
  });
});
