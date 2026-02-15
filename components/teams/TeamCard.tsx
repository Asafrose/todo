"use client";

import Link from "next/link";
import type { Team, TeamMember } from "@prisma/client";

interface TeamCardProps {
  team: Team & { members: TeamMember[] };
  isOwner: boolean;
}

export function TeamCard({ team, isOwner }: TeamCardProps) {
  return (
    <Link
      href={`/dashboard/teams/${team.id}`}
      className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
        {team.description && (
          <p className="text-sm text-gray-600 mt-1">{team.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{team.members.length} member{team.members.length !== 1 ? "s" : ""}</span>
        {isOwner && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
            Owner
          </span>
        )}
      </div>
    </Link>
  );
}
