import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "@/server/routers/_app";
import { prisma } from "@/lib/prisma";
import * as calendarLib from "@/lib/calendar";

// Mock calendar library
vi.mock("@/lib/calendar", () => ({
  getAuthorizationUrl: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  storeCalendarToken: vi.fn(),
  getCalendarToken: vi.fn(),
  deleteCalendarToken: vi.fn(),
  getValidAccessToken: vi.fn(),
  createCalendarClient: vi.fn(),
  tokenNeedsRefresh: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

describe("Calendar Router", () => {
  const mockUser = { id: "user-123", email: "test@example.com", name: "Test User" };
  const mockContext = { user: mockUser };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAuthorizationUrl", () => {
    it("should return a valid authorization URL", async () => {
      const mockUrl =
        "https://accounts.google.com/o/oauth2/v2/auth?...";
      vi.mocked(calendarLib.getAuthorizationUrl).mockReturnValue(mockUrl);

      const caller = appRouter.createCaller(mockContext as any);
      const result = await caller.calendar.getAuthorizationUrl();

      expect(result).toHaveProperty("url");
      expect(result.url).toBe(mockUrl);
    });
  });

  describe("connectCalendar", () => {
    it("should exchange code for token and store it", async () => {
      const mockTokens = {
        access_token: "access-token-123",
        refresh_token: "refresh-token-123",
        expiry_date: 9999999999000,
      };

      const mockStoredToken = {
        id: "token-123",
        userId: "user-123",
        provider: "google",
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(calendarLib.exchangeCodeForToken).mockResolvedValue(mockTokens as any);
      vi.mocked(calendarLib.storeCalendarToken).mockResolvedValue(mockStoredToken);

      const caller = appRouter.createCaller(mockContext as any);
      const result = await caller.calendar.connectCalendar({
        code: "auth-code-123",
        provider: "google",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("provider", "google");
      expect(calendarLib.exchangeCodeForToken).toHaveBeenCalledWith("auth-code-123");
    });

    it("should throw UNAUTHORIZED if no user", async () => {
      const caller = appRouter.createCaller({ user: null } as any);

      await expect(
        caller.calendar.connectCalendar({
          code: "auth-code-123",
          provider: "google",
        })
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("isConnected", () => {
    it("should return connected status", async () => {
      const mockToken = {
        id: "token-123",
        userId: "user-123",
        provider: "google",
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(calendarLib.getCalendarToken).mockResolvedValue(mockToken);

      const caller = appRouter.createCaller(mockContext as any);
      const result = await caller.calendar.isConnected({ provider: "google" });

      expect(result).toEqual({ connected: true });
      expect(calendarLib.getCalendarToken).toHaveBeenCalledWith("user-123", "google");
    });

    it("should return false when not connected", async () => {
      vi.mocked(calendarLib.getCalendarToken).mockResolvedValue(null);

      const caller = appRouter.createCaller(mockContext as any);
      const result = await caller.calendar.isConnected({ provider: "google" });

      expect(result).toEqual({ connected: false });
    });
  });

  describe("disconnect", () => {
    it("should delete calendar token and clear synced events", async () => {
      const mockToken = {
        id: "token-123",
        userId: "user-123",
        provider: "google",
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(calendarLib.getCalendarToken).mockResolvedValue(mockToken);
      vi.mocked(calendarLib.deleteCalendarToken).mockResolvedValue(mockToken);

      const caller = appRouter.createCaller(mockContext as any);
      const result = await caller.calendar.disconnect({ provider: "google" });

      expect(result).toEqual({ success: true });
      expect(calendarLib.deleteCalendarToken).toHaveBeenCalledWith("user-123", "google");
    });

    it("should throw NOT_FOUND if calendar not connected", async () => {
      vi.mocked(calendarLib.getCalendarToken).mockResolvedValue(null);

      const caller = appRouter.createCaller(mockContext as any);

      await expect(
        caller.calendar.disconnect({ provider: "google" })
      ).rejects.toThrow("NOT_FOUND");
    });
  });
});
