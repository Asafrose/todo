import { auth } from "./lib/auth";

// Auth middleware: automatically redirects unauthenticated users to sign-in
// The auth() wrapper handles session verification and protection for matched routes
export default auth((req) => {
  // Callback intentionally empty - auth() wrapper handles all authentication logic
});

export const config = {
  matcher: [
    // Protected routes
    "/dashboard/:path*",
    "/api/todos/:path*",
    "/api/teams/:path*",
  ],
};
