import { createTRPCRouter } from "../trpc";
import { exampleRouter } from "./example";
import { todoRouter } from "./todos";
import { teamRouter } from "./teams";
import { aiRouter } from "./ai";
import { calendarRouter } from "./calendar";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  todos: todoRouter,
  teams: teamRouter,
  ai: aiRouter,
  calendar: calendarRouter,
});

export type AppRouter = typeof appRouter;
