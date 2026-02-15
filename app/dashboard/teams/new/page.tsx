import { CreateTeamForm } from "@/components/teams/CreateTeamForm";

export default function CreateTeamPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <CreateTeamForm />
      </div>
    </div>
  );
}
