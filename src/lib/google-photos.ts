import { prisma } from "./prisma";

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface GooglePhoto {
  id: string;
  filename: string;
  mimeType: string;
  baseUrl: string;
  creationTime: string;
  width?: number;
  height?: number;
  description?: string;
}

export async function getGoogleToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.authProvider) return null;

  let parsed: { google?: GoogleTokens; dropbox?: unknown };
  try { parsed = JSON.parse(user.authProvider); } catch { return null; }

  const google = parsed.google;
  if (!google?.accessToken) return null;

  if (Date.now() > google.expiresAt - 5 * 60 * 1000) {
    const refreshed = await refreshGoogleToken(google.refreshToken);
    if (!refreshed) return null;
    google.accessToken = refreshed.accessToken;
    google.expiresAt = refreshed.expiresAt;
    await prisma.user.update({
      where: { id: userId },
      data: { authProvider: JSON.stringify({ ...parsed, google }) },
    });
  }

  return google.accessToken;
}

export async function saveGoogleTokens(userId: string, tokens: GoogleTokens) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  let existing: Record<string, unknown> = {};
  if (user?.authProvider) {
    try { existing = JSON.parse(user.authProvider); } catch { /* ignore */ }
  }
  const authProvider = JSON.stringify({ ...existing, google: tokens });
  await prisma.user.upsert({
    where: { id: userId },
    update: { authProvider },
    create: { id: userId, email: `${userId}@demo.local`, authProvider },
  });
}

async function refreshGoogleToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

export async function searchPhotosByDateRange(
  accessToken: string,
  startDate: Date,
  endDate: Date,
): Promise<GooglePhoto[]> {
  const photos: GooglePhoto[] = [];
  let pageToken: string | undefined;

  // Pad end date by 1 day to be inclusive
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1);

  do {
    const body: Record<string, unknown> = {
      pageSize: 100,
      filters: {
        dateFilter: {
          ranges: [{
            startDate: { year: startDate.getFullYear(), month: startDate.getMonth() + 1, day: startDate.getDate() },
            endDate: { year: end.getFullYear(), month: end.getMonth() + 1, day: end.getDate() },
          }],
        },
        mediaTypeFilter: { mediaTypes: ["PHOTO"] },
      },
    };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Google Photos API error:", res.status, errText);
      throw new Error(`Google Photos API ${res.status}: ${errText}`);
    }
    const data = await res.json();

    for (const item of data.mediaItems ?? []) {
      photos.push({
        id: item.id,
        filename: item.filename,
        mimeType: item.mimeType,
        baseUrl: item.baseUrl,
        creationTime: item.mediaMetadata?.creationTime ?? "",
        width: item.mediaMetadata?.width,
        height: item.mediaMetadata?.height,
        description: item.description,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken && photos.length < 500);

  return photos;
}

export async function downloadGooglePhoto(baseUrl: string, accessToken: string): Promise<Buffer> {
  const res = await fetch(`${baseUrl}=d`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to download photo: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
