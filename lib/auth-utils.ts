import { auth } from "./auth";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth();
  if (!session) {
    redirect("/auth/signin");
  }
  return session;
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}
