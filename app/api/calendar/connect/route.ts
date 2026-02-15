import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeCodeForToken, storeCalendarToken } from "@/lib/calendar";

/**
 * POST /api/calendar/connect
 * Exchange Google OAuth code for calendar token
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code is required" },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForToken(code);

    if (!tokens.access_token) {
      return NextResponse.json(
        { error: "Failed to get access token" },
        { status: 400 }
      );
    }

    // Store tokens in database
    await storeCalendarToken(
      session.user.id,
      "google",
      tokens.access_token,
      tokens.refresh_token || undefined,
      tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined
    );

    return NextResponse.json({
      success: true,
      message: "Calendar connected successfully",
    });
  } catch (error) {
    console.error("Calendar connection error:", error);

    return NextResponse.json(
      { error: "Failed to connect calendar" },
      { status: 500 }
    );
  }
}
