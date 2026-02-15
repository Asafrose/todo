"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { TeamMembersList } from "@/components/teams/TeamMembersList";
import { InviteMemberForm } from "@/components/teams/InviteMemberForm";
import { TodoList } from "@/components/todos/TodoList";

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [refetchCount, setRefetchCount] = useState(0);

  const {
    data: team,
    isLoading,
    error,
  } = trpc.teams.getById.useQuery({ teamId });

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">Failed to load team</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600">Team not found</p>
        </div>
      </div>
    );
  }

  const currentUserMember = team.members.find(
    (m) => m.userId === "current-user-id" // TODO: Get from session
  );
  const isOwner = currentUserMember?.role === "owner";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/dashboard/teams" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Teams
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
          {team.description && (
            <p className="text-gray-600 mt-2">{team.description}</p>
          )}
        </div>

        <div className="space-y-8">
          {/* Team Members Section */}
          <TeamMembersList
            teamId={teamId}
            members={team.members}
            isOwner={isOwner}
            onUpdate={() => setRefetchCount((c) => c + 1)}
          />

          {/* Invite Members Section */}
          {isOwner && (
            <InviteMemberForm
              teamId={teamId}
              onSuccess={() => setRefetchCount((c) => c + 1)}
            />
          )}

          {/* Team Todos Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Todos</h3>
            <p className="text-sm text-gray-600 mb-4">
              Todos for this team. Coming soon: Team-specific todo management.
            </p>
            <div className="p-4 bg-gray-50 rounded text-gray-600 text-sm">
              Team todos feature in development...
            </div>
          </div>

          {/* Settings Link */}
          {isOwner && (
            <div>
              <Link
                href={`/dashboard/teams/${teamId}/settings`}
                className="inline-block px-4 py-2 text-blue-600 hover:text-blue-800"
              >
                Team Settings →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
