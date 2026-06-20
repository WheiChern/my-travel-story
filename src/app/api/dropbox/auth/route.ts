import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const appKey = process.env.DROPBOX_APP_KEY;
  if (!appKey) {
    return NextResponse.json({ error: "DROPBOX_APP_KEY not configured" }, { status: 500 });
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = process.env.DROPBOX_REDIRECT_URI!;

  const params = new URLSearchParams({
    client_id: appKey,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    token_access_type: "offline",
  });

  const authUrl = `https://www.dropbox.com/oauth2/authorize?${params}`;

  // Store state in cookie for CSRF check
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("dropbox_oauth_state", state, { httpOnly: true, maxAge: 600 });
  return response;
}
