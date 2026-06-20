import { NextResponse } from "next/server";
import { getGoogleToken } from "@/lib/google-photos";

export const maxDuration = 30;

// Creates a Google Photos Picker session and returns the picker URL + session ID
export async function POST() {
  const token = await getGoogleToken("demo-user");
  if (!token) return NextResponse.json({ error: "Google Photos not connected" }, { status: 401 });

  const res = await fetch("https://photospicker.googleapis.com/v1/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Picker session error:", res.status, err);
    return NextResponse.json({ error: `Picker API ${res.status}: ${err}` }, { status: res.status });
  }

  const session = await res.json();
  // session.id, session.pickerUri, session.mediaItemsSet, session.expireTime
  return NextResponse.json({
    sessionId: session.id,
    pickerUri: session.pickerUri,
    expireTime: session.expireTime,
  });
}

// Poll a session to check if user has finished picking
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const token = await getGoogleToken("demo-user");
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  const res = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `Picker API ${res.status}: ${err}` }, { status: res.status });
  }

  const session = await res.json();
  return NextResponse.json({ mediaItemsSet: session.mediaItemsSet ?? false });
}
