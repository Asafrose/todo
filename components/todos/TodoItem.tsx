"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { Todo } from "@prisma/client";

interface TodoItemProps {
  todo: Todo;
  onDelete?: () => void;
  onUpdate?: () => void;
}

export function TodoItem({ todo, onDelete, onUpdate }: TodoItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const utils = trpc.useUtils();

  const toggleMutation = trpc.todos.toggleCompletion.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
      onUpdate?.();
    },
  });

  const deleteMutation = trpc.todos.delete.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
      onDelete?.();
    },
  });

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await toggleMutation.mutateAsync({ id: todo.id });
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this todo?")) return;

    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ id: todo.id });
    } finally {
      setIsDeleting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <input
        type="checkbox"
        checked={todo.status === "completed"}
        onChange={handleToggle}
        disabled={isToggling}
        className="mt-1 w-5 h-5 text-blue-600 rounded cursor-pointer"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3
            className={`text-sm font-medium ${
              todo.status === "completed"
                ? "line-through text-gray-500"
                : "text-gray-900"
            }`}
          >
            {todo.title}
          </h3>
          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(todo.priority)}`}>
            {todo.priority}
          </span>
        </div>

        {todo.description && (
          <p
            className={`text-sm mb-2 ${
              todo.status === "completed" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {todo.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500">
          {todo.dueDate && (
            <span>
              Due: {new Date(todo.dueDate).toLocaleDateString()}
            </span>
          )}
          {todo.tags && todo.tags.length > 0 && (
            <div className="flex gap-1">
              {todo.tags.map((tag) => (
                <span key={tag} className="bg-gray-100 px-2 py-1 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors p-1"
        title="Delete todo"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
