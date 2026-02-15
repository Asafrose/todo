"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

export function CreateTodoForm() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");

  const utils = trpc.useUtils();

  const createMutation = trpc.todos.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setTags("");
      setIsExpanded(false);
      utils.todos.list.invalidate();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority as "low" | "medium" | "high",
        dueDate: dueDate ? new Date(dueDate) : undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
    } catch (error) {
      console.error("Failed to create todo:", error);
      alert("Failed to create todo");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full px-4 py-2 text-left text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
        >
          + Add a new todo
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Todo title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                placeholder="work, urgent"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md transition-colors font-medium"
            >
              {createMutation.isPending ? "Creating..." : "Create Todo"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setTitle("");
                setDescription("");
                setPriority("medium");
                setDueDate("");
                setTags("");
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
