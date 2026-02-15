import { TodoList } from "@/components/todos/TodoList";

export default function TodosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Todos</h1>
          <p className="text-gray-600">Manage your personal tasks and stay organized</p>
        </div>

        <TodoList />
      </div>
    </div>
  );
}
