import { Suspense } from "react";
import { SignInForm } from "@/components/auth/SignInForm";

function SignInFormFallback() {
  return (
    <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <div className="h-8 bg-gray-200 rounded mb-4" />
      <div className="space-y-4">
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Suspense fallback={<SignInFormFallback />}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
