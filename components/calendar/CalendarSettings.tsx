"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CalendarSettings() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Query to check if calendar is connected
  const { data: isConnected, refetch: refetchConnected } =
    trpc.calendar.isConnected.useQuery({
      provider: "google",
    });

  // Query to get authorization URL
  const { data: authUrl } = trpc.calendar.getAuthorizationUrl.useQuery();

  // Mutation to disconnect calendar
  const disconnectMutation = trpc.calendar.disconnect.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      refetchConnected();
    },
    onError: (error) => {
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    },
  });

  const handleConnect = () => {
    if (!authUrl?.url) {
      setError("Failed to get authorization URL");
      return;
    }

    setIsConnecting(true);
    // Redirect to Google OAuth
    window.location.href = authUrl.url;
  };

  const handleDisconnect = () => {
    if (confirm("Are you sure you want to disconnect Google Calendar?")) {
      disconnectMutation.mutate({ provider: "google" });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Google Calendar Integration</CardTitle>
        <CardDescription>
          Connect your Google Calendar to sync todos and manage events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
            Calendar settings updated successfully
          </div>
        )}

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">
              Status: {isConnected?.connected ? "Connected" : "Not Connected"}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {isConnected?.connected
                ? "Your Google Calendar is synced with your todos"
                : "Connect your Google Calendar to get started"}
            </p>
          </div>

          {isConnected?.connected ? (
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect"}
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-600 space-y-2 p-3 bg-gray-50 rounded">
          <p className="font-medium">Permissions requested:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>View and manage your calendar</li>
            <li>Create and edit events on your calendar</li>
            <li>Delete events from your calendar</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
