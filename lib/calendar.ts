import { google } from "googleapis";
import { prisma } from "./prisma";

// Google Calendar API client setup
export function createCalendarClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );

  oauth2Client.setCredentials({ access_token: accessToken });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

// Get OAuth2 client for authorization flow
export function getGoogleOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );
}

// Get authorization URL for calendar consent
export function getAuthorizationUrl() {
  const oauth2Client = getGoogleOAuth2Client();

  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Force consent screen to get refresh token
  });
}

// Exchange authorization code for tokens
export async function exchangeCodeForToken(code: string) {
  const oauth2Client = getGoogleOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  return tokens;
}

// Refresh access token if needed
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getGoogleOAuth2Client();

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  return credentials;
}

// Store calendar token for user
export async function storeCalendarToken(
  userId: string,
  provider: string,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: number
) {
  return prisma.calendarToken.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      accessToken,
      refreshToken: refreshToken || null,
      expiresAt: expiresAt ? new Date(expiresAt * 1000) : null,
    },
    update: {
      accessToken,
      refreshToken: refreshToken || undefined,
      expiresAt: expiresAt ? new Date(expiresAt * 1000) : undefined,
      updatedAt: new Date(),
    },
  });
}

// Get user's calendar token
export async function getCalendarToken(userId: string, provider: string) {
  return prisma.calendarToken.findUnique({
    where: { userId_provider: { userId, provider } },
  });
}

// Check if token needs refresh (expires within 5 minutes)
export function tokenNeedsRefresh(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  return expiresAt <= fiveMinutesFromNow;
}

// Get valid access token (refresh if needed)
export async function getValidAccessToken(
  userId: string,
  provider: string
): Promise<string | null> {
  const token = await getCalendarToken(userId, provider);

  if (!token) return null;

  // Check if token needs refresh
  if (tokenNeedsRefresh(token.expiresAt)) {
    if (!token.refreshToken) {
      // No refresh token, need to re-authenticate
      return null;
    }

    try {
      const newCredentials = await refreshAccessToken(token.refreshToken);
      await storeCalendarToken(
        userId,
        provider,
        newCredentials.access_token!,
        newCredentials.refresh_token || token.refreshToken,
        newCredentials.expiry_date ? Math.floor(newCredentials.expiry_date / 1000) : undefined
      );

      return newCredentials.access_token!;
    } catch (error) {
      console.error("Failed to refresh calendar token:", error);
      return null;
    }
  }

  return token.accessToken;
}

// Delete calendar token
export async function deleteCalendarToken(userId: string, provider: string) {
  return prisma.calendarToken.delete({
    where: { userId_provider: { userId, provider } },
  });
}
