"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";

export default function Home() {
  const [greeting, setGreeting] = useState<string>("Loading...");

  useEffect(() => {
    trpc.example.hello
      .query({ text: "World" })
      .then((data) => setGreeting(data.greeting))
      .catch((err) => setGreeting("Error"));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">{greeting}</h1>
    </main>
  );
}
