"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { TeamMember, User } from "@prisma/client";

interface TeamMembersListProps {
  teamId: string;
  members: (TeamMember & { user: User })[];
  isOwner: boolean;
  onUpdate: () => void;
}

export function TeamMembersList({
  teamId,
  members,
  isOwner,
  onUpdate,
}: TeamMembersListProps) {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const removeMutation = trpc.teams.removeMember.useMutation({
    onSuccess: () => {
      utils.teams.getById.invalidate({ teamId });
      onUpdate();
    },
  });

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from the team?")) return;

    setRemovingUserId(userId);
    try {
      await removeMutation.mutateAsync({
        teamId,
        userId,
      });
    } finally {
      setRemovingUserId(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800";
      case "member":
        return "bg-blue-100 text-blue-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
      </div>

      <div className="divide-y divide-gray-200">
        {members.map((member) => (
          <div
            key={member.id}
            className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div>
              <p className="font-medium text-gray-900">{member.user.name || member.user.email}</p>
              <p className="text-sm text-gray-500">{member.user.email}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(member.role)}`}>
                {member.role}
              </span>

              {isOwner && member.role !== "owner" && (
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  disabled={removingUserId === member.userId}
                  className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
