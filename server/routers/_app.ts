import { createTRPCRouter } from "../trpc";
import { exampleRouter } from "./example";
import { todoRouter } from "./todos";
import { teamRouter } from "./teams";
import { aiRouter } from "./ai";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  todos: todoRouter,
  teams: teamRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
