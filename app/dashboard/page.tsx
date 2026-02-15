import { requireAuth } from "@/lib/auth-utils";
import { signOut } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold text-gray-900">Todo App</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user?.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome, {session.user?.name || session.user?.email}!
        </h2>
        <p className="mt-2 text-gray-600">Your todos will appear here soon.</p>
      </main>
    </div>
  );
}
