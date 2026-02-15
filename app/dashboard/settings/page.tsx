import { requireAuth } from "@/lib/auth-utils";
import { CalendarSettings } from "@/components/calendar/CalendarSettings";

export default async function SettingsPage() {
  const session = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">Settings</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user.email}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="max-w-2xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Account Settings</h2>
            <p className="text-gray-600">Manage your account and integrations</p>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-4">Integrations</h3>
              <CalendarSettings />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
