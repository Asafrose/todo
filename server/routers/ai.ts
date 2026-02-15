import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { aiClient } from "@/lib/ai/client";
import { generateBriefingPrompt, generateNLPParsingPrompt } from "@/lib/ai/prompts";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";

// Helper to get current user from context (tRPC middleware can add this)
async function getCurrentUser(ctx: any): Promise<{ id: string; email: string }> {
  // For now, this is a simplified version - in a real app, middleware would handle this
  // The ctx.user would be populated by tRPC middleware with auth info
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return ctx.user;
}

export const aiRouter = createTRPCRouter({
  // Generate daily briefing for current user
  dailyBriefing: publicProcedure.query(async ({ ctx }) => {
    try {
      // Get current user - for now, mock it
      // In production, this would use proper session middleware
      const userId = "user-123"; // TODO: Get from proper auth context

      // Fetch today's todos
      const todos = await prisma.todo.findMany({
        where: {
          userId,
          status: { not: "archived" },
        },
      });

      // For now, mock calendar events (calendar integration in Phase 5)
      const events: any[] = [];

      // Generate briefing prompt
      const prompt = generateBriefingPrompt(todos, events);

      // Call AI client
      const result = await aiClient.generateText(prompt);

      return {
        briefing: result.content,
        model: result.model,
        todosProcessed: todos.length,
        eventsProcessed: events.length,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to generate briefing: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }),

  // Parse natural language into structured todo
  parseTodo: publicProcedure
    .input(z.object({ text: z.string().min(1).max(500) }))
    .mutation(async ({ input }) => {
      try {
        // Generate NLP prompt
        const prompt = generateNLPParsingPrompt(input.text);

        // Call AI to parse
        const result = await aiClient.generateText(prompt);

        // Parse the response (it should be JSON)
        let parsed;
        try {
          parsed = JSON.parse(result.content);
        } catch (e) {
          throw new Error(`AI response was not valid JSON: ${result.content}`);
        }

        // Handle both single and multiple todos
        const todos = Array.isArray(parsed) ? parsed : [parsed];

        // Validate and return
        const todoSchema = z.object({
          title: z.string().min(1).max(255),
          description: z.string().optional().nullable(),
          priority: z.enum(["low", "medium", "high"]).default("medium"),
          dueDate: z.string().datetime().optional().nullable(),
          tags: z.array(z.string()).default([]),
        });

        const validated = todos.map((t) => todoSchema.parse(t));

        return {
          parsed: validated,
          count: validated.length,
          model: result.model,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to parse todo: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }),
});
