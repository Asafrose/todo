"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { TodoItem } from "./TodoItem";
import { TodoFilters } from "./TodoFilters";
import { CreateTodoForm } from "./CreateTodoForm";

export function TodoList() {
  const [status, setStatus] = useState<string | undefined>();
  const [priority, setPriority] = useState<string | undefined>();

  const {
    data: todos,
    isLoading,
    error,
  } = trpc.todos.list.useQuery({
    status: status as "pending" | "completed" | "archived" | undefined,
    priority: priority as "low" | "medium" | "high" | undefined,
    skip: 0,
    take: 50,
  });

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-medium">Failed to load todos</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CreateTodoForm onSuccess={() => {}} />

      <TodoFilters
        status={status}
        priority={priority}
        onStatusChange={setStatus}
        onPriorityChange={setPriority}
      />

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : todos && todos.length > 0 ? (
        <div className="space-y-2">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onUpdate={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      ) : (
        <div className="text-center p-8 text-gray-500">
          <p className="text-lg font-medium">No todos yet</p>
          <p className="text-sm">Create one to get started!</p>
        </div>
      )}
    </div>
  );
}
