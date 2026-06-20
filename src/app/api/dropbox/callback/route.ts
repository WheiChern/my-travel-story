import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = req.cookies.get("dropbox_oauth_state")?.value;

  if (!code || state !== storedState) {
    return NextResponse.redirect(new URL("/settings?error=dropbox_auth_failed", req.url));
  }

  const appKey = process.env.DROPBOX_APP_KEY!;
  const appSecret = process.env.DROPBOX_APP_SECRET!;
  const redirectUri = process.env.DROPBOX_REDIRECT_URI!;

  const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/settings?error=dropbox_token_failed", req.url));
  }

  const tokens = await tokenRes.json();

  // Store token against the demo user (in production, use session userId)
  await prisma.user.update({
    where: { id: "demo-user" },
    data: {
      // Store in authProvider field as JSON for now
      // TODO: add a dedicated DropboxToken table in a future migration
      authProvider: JSON.stringify({
        dropbox: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: Date.now() + (tokens.expires_in ?? 14400) * 1000,
          accountId: tokens.account_id,
        },
      }),
    },
  });

  const response = NextResponse.redirect(new URL("/import?dropbox=connected", req.url));
  response.cookies.delete("dropbox_oauth_state");
  return response;
}
