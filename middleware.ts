import { auth } from "./lib/auth";

export default auth((req) => {
  // This middleware runs on every request
  // The auth() function automatically handles session verification
});

export const config = {
  matcher: [
    // Protected routes
    "/dashboard/:path*",
    "/api/todos/:path*",
    "/api/teams/:path*",
  ],
};
