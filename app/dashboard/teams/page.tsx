import { TeamList } from "@/components/teams/TeamList";

export default function TeamsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <TeamList />
      </div>
    </div>
  );
}
