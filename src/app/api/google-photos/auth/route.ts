import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 501 });
  }

  const { searchParams, origin } = new URL(req.url);
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? `${origin}/api/google-photos/callback`,
    response_type: "code",
    scope: "openid email https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
    access_type: "offline",
    prompt: "consent",
    state: returnTo,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
