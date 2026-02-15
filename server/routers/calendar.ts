import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  storeCalendarToken,
  getCalendarToken,
  deleteCalendarToken,
  getValidAccessToken,
  createCalendarClient,
} from "@/lib/calendar";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";

export const calendarRouter = createTRPCRouter({
  // Get Google Calendar authorization URL
  getAuthorizationUrl: protectedProcedure.query(() => {
    const url = getAuthorizationUrl();
    return { url };
  }),

  // Exchange authorization code for tokens and store them
  connectCalendar: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1),
        provider: z.enum(["google"]).default("google"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        const tokens = await exchangeCodeForToken(input.code);

        if (!tokens.access_token) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to get access token",
          });
        }

        const calendarToken = await storeCalendarToken(
          ctx.user.id,
          input.provider,
          tokens.access_token,
          tokens.refresh_token || undefined,
          tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined
        );

        return {
          success: true,
          provider: calendarToken.provider,
          connectedAt: calendarToken.createdAt,
        };
      } catch (error) {
        console.error("Calendar connection error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect calendar",
        });
      }
    }),

  // Check if calendar is connected
  isConnected: protectedProcedure
    .input(z.object({ provider: z.enum(["google"]).default("google") }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const token = await getCalendarToken(ctx.user.id, input.provider);
      return { connected: !!token };
    }),

  // Get connected calendar providers
  listConnected: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const tokens = await prisma.calendarToken.findMany({
      where: { userId: ctx.user.id },
      select: { provider: true, createdAt: true, updatedAt: true },
    });

    return tokens;
  }),

  // Disconnect calendar
  disconnect: protectedProcedure
    .input(z.object({ provider: z.enum(["google"]).default("google") }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const token = await getCalendarToken(ctx.user.id, input.provider);
      if (!token) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar not connected",
        });
      }

      // Delete all synced calendar events for todos
      await prisma.todo.updateMany({
        where: {
          userId: ctx.user.id,
          calendarEventId: { not: null },
        },
        data: {
          calendarEventId: null,
        },
      });

      await deleteCalendarToken(ctx.user.id, input.provider);

      return { success: true };
    }),

  // List user's Google Calendar events
  listEvents: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["google"]).default("google"),
        maxResults: z.number().min(1).max(250).default(10),
        timeMin: z.string().optional(),
        timeMax: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const accessToken = await getValidAccessToken(ctx.user.id, input.provider);

      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Calendar not connected or token expired",
        });
      }

      try {
        const calendar = createCalendarClient(accessToken);

        const response = await calendar.events.list({
          calendarId: "primary",
          maxResults: input.maxResults,
          singleEvents: true,
          orderBy: "startTime",
          timeMin: input.timeMin,
          timeMax: input.timeMax,
        });

        return {
          events: response.data.items || [],
          nextPageToken: response.data.nextPageToken,
        };
      } catch (error) {
        console.error("Failed to list calendar events:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list calendar events",
        });
      }
    }),

  // Get calendar event details
  getEvent: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["google"]).default("google"),
        eventId: z.string().min(1),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const accessToken = await getValidAccessToken(ctx.user.id, input.provider);

      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Calendar not connected or token expired",
        });
      }

      try {
        const calendar = createCalendarClient(accessToken);

        const response = await calendar.events.get({
          calendarId: "primary",
          eventId: input.eventId,
        });

        return response.data;
      } catch (error) {
        console.error("Failed to get calendar event:", error);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar event not found",
        });
      }
    }),

  // Create an event on Google Calendar
  createEvent: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["google"]).default("google"),
        title: z.string().min(1),
        description: z.string().optional(),
        startTime: z.string(), // ISO 8601 format
        endTime: z.string(), // ISO 8601 format
        timeZone: z.string().default("UTC"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const accessToken = await getValidAccessToken(ctx.user.id, input.provider);

      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Calendar not connected or token expired",
        });
      }

      try {
        const calendar = createCalendarClient(accessToken);

        const response = await calendar.events.insert({
          calendarId: "primary",
          requestBody: {
            summary: input.title,
            description: input.description,
            start: {
              dateTime: input.startTime,
              timeZone: input.timeZone,
            },
            end: {
              dateTime: input.endTime,
              timeZone: input.timeZone,
            },
          },
        });

        return {
          eventId: response.data.id,
          htmlLink: response.data.htmlLink,
        };
      } catch (error) {
        console.error("Failed to create calendar event:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create calendar event",
        });
      }
    }),

  // Update an event on Google Calendar
  updateEvent: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["google"]).default("google"),
        eventId: z.string().min(1),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        timeZone: z.string().default("UTC"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const accessToken = await getValidAccessToken(ctx.user.id, input.provider);

      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Calendar not connected or token expired",
        });
      }

      try {
        const calendar = createCalendarClient(accessToken);

        // Get current event first
        const currentEvent = await calendar.events.get({
          calendarId: "primary",
          eventId: input.eventId,
        });

        // Update only provided fields
        const updateData: any = {
          summary: input.title || currentEvent.data.summary,
          description: input.description || currentEvent.data.description,
        };

        if (input.startTime) {
          updateData.start = {
            dateTime: input.startTime,
            timeZone: input.timeZone,
          };
        }

        if (input.endTime) {
          updateData.end = {
            dateTime: input.endTime,
            timeZone: input.timeZone,
          };
        }

        const response = await calendar.events.update({
          calendarId: "primary",
          eventId: input.eventId,
          requestBody: updateData,
        });

        return {
          eventId: response.data.id,
          htmlLink: response.data.htmlLink,
        };
      } catch (error) {
        console.error("Failed to update calendar event:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update calendar event",
        });
      }
    }),

  // Delete an event from Google Calendar
  deleteEvent: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["google"]).default("google"),
        eventId: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const accessToken = await getValidAccessToken(ctx.user.id, input.provider);

      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Calendar not connected or token expired",
        });
      }

      try {
        const calendar = createCalendarClient(accessToken);

        await calendar.events.delete({
          calendarId: "primary",
          eventId: input.eventId,
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to delete calendar event:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete calendar event",
        });
      }
    }),
});
