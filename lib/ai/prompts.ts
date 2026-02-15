export interface TodoItem {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: string;
  status: string;
  tags: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export function generateBriefingPrompt(todos: TodoItem[], events: CalendarEvent[]): string {
  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Filter today's todos
  const todayTodos = todos.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = (t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate)).toDateString();
    const today = new Date().toDateString();
    return dueDate === today && t.status !== "completed";
  });

  // Format todos by priority
  const highPriority = todayTodos.filter((t) => t.priority === "high");
  const mediumPriority = todayTodos.filter((t) => t.priority === "medium");
  const lowPriority = todayTodos.filter((t) => t.priority === "low");

  const todoSection = `
## Today's Todos (${todayDate})

High Priority:
${highPriority.map((t) => `- ${t.title}`).join("\n") || "None"}

Medium Priority:
${mediumPriority.map((t) => `- ${t.title}`).join("\n") || "None"}

Low Priority:
${lowPriority.map((t) => `- ${t.title}`).join("\n") || "None"}
`;

  const eventSection = `
## Calendar Events

${
    events.length > 0
      ? events
          .map((e) => {
            const start = new Date(e.startTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const end = new Date(e.endTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return `- ${start} - ${end}: ${e.title}`;
          })
          .join("\n")
      : "No events scheduled"
  }
`;

  return `You are a helpful assistant preparing a daily briefing. Generate a personalized morning briefing based on the following schedule for ${todayDate}.

${todoSection}

${eventSection}

Please provide:
1. A brief motivational greeting
2. Summary of today's priorities
3. Time management suggestions if there are scheduling conflicts
4. One actionable tip to be productive today

Keep the briefing concise (under 200 words) and uplifting in tone.`;
}

export function generateNLPParsingPrompt(userInput: string): string {
  return `You are a task parsing assistant. Convert the following user input into a structured todo item.

User input: "${userInput}"

Extract and return ONLY valid JSON (no markdown code block) with this structure:
{
  "title": "task title",
  "description": "optional description or null",
  "priority": "low|medium|high",
  "dueDate": "ISO 8601 date string or null (e.g., '2026-02-16T15:00:00Z')",
  "tags": ["tag1", "tag2"] or []
}

Rules:
- If no specific time is mentioned, use 23:59:59
- Parse relative dates like "tomorrow", "next Monday", "in 3 days"
- Default priority to "medium" if not specified
- Extract any tags mentioned with #hashtag or "tag:" prefix
- If input contains multiple tasks (separated by newlines or bullet points), return an array of objects

Examples:
- "Buy milk tomorrow at 3pm" -> {"title": "Buy milk", "priority": "medium", "dueDate": "2026-02-16T15:00:00Z"}
- "HIGH: Review PR by end of week #code-review" -> {"title": "Review PR", "priority": "high", "dueDate": "2026-02-21T23:59:59Z", "tags": ["code-review"]}
- "Call dentist" -> {"title": "Call dentist", "priority": "medium", "dueDate": null}`;
}
