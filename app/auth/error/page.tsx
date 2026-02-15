"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Authentication Error</h1>
        <p className="mt-2 text-sm text-gray-600">
          {error === "Callback" && "The authentication callback failed."}
          {error === "OAuthSignin" && "Error signing in with OAuth provider."}
          {error === "OAuthCallback" && "Error during OAuth callback."}
          {error === "EmailSignInError" && "Error signing in with email."}
          {error === "CredentialsSignin" && "Invalid credentials provided."}
          {!error && "An unexpected error occurred during authentication."}
        </p>
        <div className="mt-6">
          <a
            href="/auth/signin"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to Sign In
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
