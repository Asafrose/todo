"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { TeamCard } from "./TeamCard";

export function TeamList() {
  const {
    data: teams,
    isLoading,
    error,
  } = trpc.teams.list.useQuery();

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-medium">Failed to load teams</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">My Teams</h1>
        <Link
          href="/dashboard/teams/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
        >
          + Create Team
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => {
            const currentUserMember = team.members.find(
              (m) => m.userId === "current-user-id" // TODO: Get from session
            );
            const isOwner = currentUserMember?.role === "owner";

            return (
              <TeamCard
                key={team.id}
                team={team}
                isOwner={isOwner}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center p-8 text-gray-500">
          <p className="text-lg font-medium">No teams yet</p>
          <p className="text-sm mb-4">Create one to get started collaborating!</p>
          <Link
            href="/dashboard/teams/new"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Create Your First Team
          </Link>
        </div>
      )}
    </div>
  );
}
