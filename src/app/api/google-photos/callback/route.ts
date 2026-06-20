import { NextRequest, NextResponse } from "next/server";
import { saveGoogleTokens } from "@/lib/google-photos";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect("http://localhost:3000/settings?google=error");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/google-photos/callback",
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    return NextResponse.redirect("http://localhost:3000/settings?google=error");
  }

  const data = await res.json();
  console.log("Google OAuth token response scopes:", data.scope);
  await saveGoogleTokens("demo-user", {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  });

  return NextResponse.redirect("http://localhost:3000/settings?google=connected");
}
