"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export default function TeamSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: team,
    isLoading,
    error,
  } = trpc.teams.getById.useQuery({ teamId });

  const utils = trpc.useUtils();

  const updateMutation = trpc.teams.update.useMutation({
    onSuccess: () => {
      utils.teams.getById.invalidate({ teamId });
    },
  });

  const deleteMutation = trpc.teams.delete.useMutation({
    onSuccess: () => {
      utils.teams.list.invalidate();
      router.push("/dashboard/teams");
    },
  });

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">Failed to load team settings</p>
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
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600">Team not found</p>
        </div>
      </div>
    );
  }

  const currentUserMember = team.members.find(
    (m) => m.userId === "current-user-id" // TODO: Get from session
  );
  const isOwner = currentUserMember?.role === "owner";

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
            <p className="font-medium">Access Denied</p>
            <p className="text-sm">Only team owners can manage settings.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this team? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ teamId });
    } catch (error) {
      console.error("Failed to delete team:", error);
      alert("Failed to delete team");
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href={`/dashboard/teams/${teamId}`}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Team
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Team Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Team Info Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Team Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  defaultValue={team.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-700 disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Team name cannot be changed yet. Coming soon.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  defaultValue={team.description || ""}
                  disabled
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-700 disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Description editing coming soon.
                </p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-4">
              Danger Zone
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Once you delete a team, there is no going back. Please be
                  certain.
                </p>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting || deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-md transition-colors font-medium"
                >
                  {isDeleting || deleteMutation.isPending
                    ? "Deleting..."
                    : "Delete Team"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
