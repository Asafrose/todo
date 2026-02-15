import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

// Input schemas with validation
const createTodoInput = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  tags: z.array(z.string()).default([]),
  isPersonal: z.boolean().default(true),
});

const updateTodoInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  dueDate: z.date().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["pending", "completed", "archived"]).optional(),
  tags: z.array(z.string()).optional(),
  isPersonal: z.boolean().optional(),
});

const listTodosInput = z.object({
  status: z.enum(["pending", "completed", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  isPersonal: z.boolean().optional(),
  skip: z.number().default(0),
  take: z.number().max(100).default(20),
});

export const todoRouter = createTRPCRouter({
  // List todos for the current user
  list: protectedProcedure
    .input(listTodosInput)
    .query(async ({ ctx, input }) => {
      const where: Prisma.TodoWhereInput = {
        userId: ctx.user.id,
      };

      if (input.status) where.status = input.status;
      if (input.priority) where.priority = input.priority;
      if (input.isPersonal !== undefined) where.isPersonal = input.isPersonal;

      // Priority sort order: high (0) → medium (1) → low (2)
      const priorityOrder = { high: 0, medium: 1, low: 2 };

      const todos = await prisma.todo.findMany({
        where,
        skip: input.skip,
        take: input.take,
      });

      // Sort in memory: priority desc (high first), then by dueDate asc, then by createdAt desc
      return todos.sort((a, b) => {
        const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
        if (priorityDiff !== 0) return priorityDiff;

        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;

        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }),

  // Get a single todo by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const todo = await prisma.todo.findUnique({
        where: { id: input.id },
      });

      if (!todo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });
      }

      // Verify ownership
      if (todo.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to access this todo",
        });
      }

      return todo;
    }),

  // Create a new todo
  create: protectedProcedure
    .input(createTodoInput)
    .mutation(async ({ ctx, input }) => {
      const todo = await prisma.todo.create({
        data: {
          ...input,
          userId: ctx.user.id,
        },
      });

      return todo;
    }),

  // Update an existing todo
  update: protectedProcedure
    .input(updateTodoInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // First, verify the todo exists and belongs to the user
      const existingTodo = await prisma.todo.findUnique({
        where: { id },
      });

      if (!existingTodo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });
      }

      if (existingTodo.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this todo",
        });
      }

      // Update only the provided fields
      const updatedTodo = await prisma.todo.update({
        where: { id },
        data: Object.fromEntries(
          Object.entries(updateData).filter(([, value]) => value !== undefined)
        ),
      });

      return updatedTodo;
    }),

  // Delete a todo
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const todo = await prisma.todo.findUnique({
        where: { id: input.id },
      });

      if (!todo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });
      }

      if (todo.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this todo",
        });
      }

      await prisma.todo.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Toggle completion status
  toggleCompletion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const todo = await prisma.todo.findUnique({
        where: { id: input.id },
      });

      if (!todo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });
      }

      if (todo.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this todo",
        });
      }

      const newStatus = todo.status === "completed" ? "pending" : "completed";

      const updatedTodo = await prisma.todo.update({
        where: { id: input.id },
        data: { status: newStatus },
      });

      return updatedTodo;
    }),
});
