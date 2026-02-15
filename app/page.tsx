"use client";

import { trpc } from "@/lib/trpc/client";

export default function Home() {
  const hello = trpc.example.hello.useQuery({ text: "World" });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">
        {hello.data ? hello.data.greeting : "Loading..."}
      </h1>
    </main>
  );
}
