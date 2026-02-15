import { createTRPCRouter } from "../trpc";
import { exampleRouter } from "./example";
import { todoRouter } from "./todos";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  todos: todoRouter,
});

export type AppRouter = typeof appRouter;
