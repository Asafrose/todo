"use client";

interface TodoFiltersProps {
  status?: string;
  priority?: string;
  onStatusChange: (status?: string) => void;
  onPriorityChange: (priority?: string) => void;
}

export function TodoFilters({
  status,
  priority,
  onStatusChange,
  onPriorityChange,
}: TodoFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          value={status || ""}
          onChange={(e) => onStatusChange(e.target.value || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Priority
        </label>
        <select
          value={priority || ""}
          onChange={(e) => onPriorityChange(e.target.value || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="flex items-end">
        <button
          onClick={() => {
            onStatusChange(undefined);
            onPriorityChange(undefined);
          }}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
