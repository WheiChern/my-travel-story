import { prisma } from "./prisma";

interface DropboxTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  accountId: string;
}

export async function getDropboxToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.authProvider) return null;

  let parsed: { dropbox?: DropboxTokens };
  try {
    parsed = JSON.parse(user.authProvider);
  } catch {
    return null;
  }

  const dropbox = parsed.dropbox;
  if (!dropbox) return null;

  // Refresh if expired (with 5 min buffer)
  if (Date.now() > dropbox.expiresAt - 5 * 60 * 1000) {
    const refreshed = await refreshDropboxToken(dropbox.refreshToken);
    if (!refreshed) return null;
    dropbox.accessToken = refreshed.accessToken;
    dropbox.expiresAt = refreshed.expiresAt;
    await prisma.user.update({
      where: { id: userId },
      data: { authProvider: JSON.stringify({ dropbox }) },
    });
  }

  return dropbox.accessToken;
}

async function refreshDropboxToken(refreshToken: string) {
  const appKey = process.env.DROPBOX_APP_KEY!;
  const appSecret = process.env.DROPBOX_APP_SECRET!;

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    expiresAt: Date.now() + (data.expires_in ?? 14400) * 1000,
  };
}

export async function downloadDropboxFile(userId: string, path: string): Promise<Buffer | null> {
  const token = await getDropboxToken(userId);
  if (!token) return null;

  const res = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({ path }),
    },
  });

  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}
