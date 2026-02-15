"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface InviteMemberFormProps {
  teamId: string;
  onSuccess?: () => void;
}

export function InviteMemberForm({ teamId, onSuccess }: InviteMemberFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [invites, setInvites] = useState<any[]>([]);

  const utils = trpc.useUtils();

  const createInviteMutation = trpc.teams.createInvite.useMutation({
    onSuccess: (invite) => {
      setEmail("");
      setRole("member");
      setInvites([...invites, invite]);
      utils.teams.getById.invalidate({ teamId });
      onSuccess?.();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      alert("Please enter an email address");
      return;
    }

    try {
      await createInviteMutation.mutateAsync({
        teamId,
        email: email.trim(),
        role: role as "owner" | "member" | "viewer",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    } catch (error) {
      console.error("Failed to send invite:", error);
      alert("Failed to send invite");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Invite Members</h3>
        <p className="text-sm text-gray-600 mt-1">
          Invite team members by email. They'll receive an invitation link.
        </p>
      </div>

      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
        >
          + Send Invite
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createInviteMutation.isPending || !email.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md transition-colors font-medium"
            >
              {createInviteMutation.isPending ? "Sending..." : "Send Invite"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setEmail("");
                setRole("member");
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {invites.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Pending Invitations</h4>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div key={invite.id} className="text-sm p-2 bg-gray-50 rounded">
                {invite.email} - {invite.role}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
