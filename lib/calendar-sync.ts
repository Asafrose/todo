import { createCalendarClient, getValidAccessToken } from "./calendar";
import { prisma } from "./prisma";
import type { Todo } from "@prisma/client";

/**
 * Create a Google Calendar event from a todo
 */
export async function createCalendarEventFromTodo(
  userId: string,
  todo: Todo
): Promise<string | null> {
  if (!todo.dueDate) {
    return null; // Cannot create calendar event without a due date
  }

  const accessToken = await getValidAccessToken(userId, "google");

  if (!accessToken) {
    return null; // Calendar not connected
  }

  try {
    const calendar = createCalendarClient(accessToken);

    // Create event with todo due date as both start and end time
    const dueDate = new Date(todo.dueDate);
    const endDate = new Date(dueDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `[${todo.priority?.toUpperCase()}] ${todo.title}`,
        description: todo.description || `Todo ID: ${todo.id}`,
        start: {
          dateTime: dueDate.toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: "UTC",
        },
        extendedProperties: {
          private: {
            todoId: todo.id,
            status: todo.status,
          },
        },
      },
    });

    return response.data.id || null;
  } catch (error) {
    console.error("Failed to create calendar event from todo:", error);
    return null;
  }
}

/**
 * Update a Google Calendar event from a todo
 */
export async function updateCalendarEventFromTodo(
  userId: string,
  todo: Todo,
  eventId: string
): Promise<boolean> {
  if (!todo.dueDate) {
    return false;
  }

  const accessToken = await getValidAccessToken(userId, "google");

  if (!accessToken) {
    return false;
  }

  try {
    const calendar = createCalendarClient(accessToken);

    const dueDate = new Date(todo.dueDate);
    const endDate = new Date(dueDate.getTime() + 60 * 60 * 1000);

    await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: {
        summary: `[${todo.priority?.toUpperCase()}] ${todo.title}`,
        description: todo.description || `Todo ID: ${todo.id}`,
        start: {
          dateTime: dueDate.toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: "UTC",
        },
        extendedProperties: {
          private: {
            todoId: todo.id,
            status: todo.status,
          },
        },
      },
    });

    return true;
  } catch (error) {
    console.error("Failed to update calendar event from todo:", error);
    return false;
  }
}

/**
 * Delete a Google Calendar event
 */
export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const accessToken = await getValidAccessToken(userId, "google");

  if (!accessToken) {
    return false;
  }

  try {
    const calendar = createCalendarClient(accessToken);

    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });

    return true;
  } catch (error) {
    console.error("Failed to delete calendar event:", error);
    return false;
  }
}

/**
 * Sync todo changes to calendar
 * Handles create, update, and delete operations
 */
export async function syncTodoToCalendar(
  userId: string,
  todo: Todo,
  operation: "create" | "update" | "delete"
): Promise<void> {
  try {
    if (operation === "create") {
      // Create new calendar event
      const eventId = await createCalendarEventFromTodo(userId, todo);

      if (eventId) {
        // Store the calendar event ID in the todo
        await prisma.todo.update({
          where: { id: todo.id },
          data: { calendarEventId: eventId },
        });
      }
    } else if (operation === "update") {
      if (todo.calendarEventId) {
        // Update existing calendar event
        await updateCalendarEventFromTodo(userId, todo, todo.calendarEventId);
      } else if (todo.dueDate) {
        // Create new calendar event if one doesn't exist
        const eventId = await createCalendarEventFromTodo(userId, todo);

        if (eventId) {
          await prisma.todo.update({
            where: { id: todo.id },
            data: { calendarEventId: eventId },
          });
        }
      }
    } else if (operation === "delete") {
      if (todo.calendarEventId) {
        // Delete calendar event
        await deleteCalendarEvent(userId, todo.calendarEventId);
      }
    }
  } catch (error) {
    console.error(`Failed to sync todo (${operation}):`, error);
    // Don't throw - sync failures shouldn't prevent todo operations
  }
}

/**
 * Fetch all calendar events and update todos
 * Used for reverse sync (calendar → todos)
 */
export async function syncCalendarToTodos(userId: string): Promise<number> {
  const accessToken = await getValidAccessToken(userId, "google");

  if (!accessToken) {
    return 0;
  }

  try {
    const calendar = createCalendarClient(accessToken);

    // Get today's date and 30 days from now for the sync window
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: thirtyDaysFromNow.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    let syncedCount = 0;
    const events = response.data.items || [];

    for (const event of events) {
      if (!event.id || !event.extendedProperties?.private?.todoId) {
        continue; // Skip events not created from todos
      }

      const todoId = event.extendedProperties.private.todoId;
      const status = event.extendedProperties.private.status || "pending";

      // Check if corresponding todo exists
      const todo = await prisma.todo.findUnique({
        where: { id: todoId },
      });

      if (!todo) {
        // Todo was deleted, remove the calendar event
        try {
          await calendar.events.delete({
            calendarId: "primary",
            eventId: event.id,
          });
        } catch (error) {
          console.error("Failed to delete orphaned calendar event:", error);
        }
        continue;
      }

      // Update todo if calendar event is more recent (last-write-wins)
      if (
        todo.calendarEventId === event.id &&
        event.updated &&
        todo.updatedAt.getTime() < new Date(event.updated).getTime()
      ) {
        // Calendar event is more recent, update todo
        await prisma.todo.update({
          where: { id: todoId },
          data: {
            title: event.summary?.replace(/^\[.*?\]\s/, "") || todo.title,
            description: event.description || null,
            dueDate: event.start?.dateTime ? new Date(event.start.dateTime) : null,
            status: status as "pending" | "completed" | "archived",
          },
        });

        syncedCount++;
      }
    }

    return syncedCount;
  } catch (error) {
    console.error("Failed to sync calendar to todos:", error);
    return 0;
  }
}

/**
 * Auto-sync todos when calendar is connected
 * This is useful for initial sync after calendar connection
 */
export async function performInitialSync(userId: string): Promise<void> {
  try {
    // First, sync any local todos to calendar
    const todos = await prisma.todo.findMany({
      where: {
        userId,
        isPersonal: true,
        dueDate: { not: null },
        calendarEventId: null, // Only sync todos not yet synced
      },
    });

    for (const todo of todos) {
      await syncTodoToCalendar(userId, todo, "create");
    }

    // Then sync calendar events to todos
    await syncCalendarToTodos(userId);
  } catch (error) {
    console.error("Failed to perform initial sync:", error);
  }
}
