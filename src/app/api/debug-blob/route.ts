import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getGoogleToken } from "@/lib/google-photos";

export const maxDuration = 30;

export async function GET() {
  const env = {
    BLOB2_STORE_ID: process.env.BLOB2_STORE_ID ?? null,
    BLOB2_READ_WRITE_TOKEN: process.env.BLOB2_READ_WRITE_TOKEN ? "SET" : null,
  };

  const testUrl = "https://lh3.googleusercontent.com/ppa/AP5hRzJ5CCChnN1Kr3D-pZgRBxzJKpjY5qbDi-mhn2EQ9vZ7g7mqozARRml-Pi5vq_imM4ot-4EPVQ=w2048-h2048";

  try {
    const googleToken = await getGoogleToken("demo-user");

    // Test 1: without auth
    const dlNoAuth = await fetch(testUrl, { signal: AbortSignal.timeout(10000) });

    // Test 2: with Google OAuth token
    const dlWithAuth = googleToken
      ? await fetch(testUrl, { headers: { Authorization: `Bearer ${googleToken}` }, signal: AbortSignal.timeout(10000) })
      : null;

    if (dlWithAuth?.ok) {
      const blob = await dlWithAuth.blob();
      const { url } = await put("debug-test/photo-test.jpg", blob, {
        access: "public",
        allowOverwrite: true,
        token: process.env.BLOB2_READ_WRITE_TOKEN,
      } as Parameters<typeof put>[2]);
      return NextResponse.json({ success: true, url, blobSize: blob.size, env });
    }

    return NextResponse.json({
      success: false,
      noAuthStatus: dlNoAuth.status,
      withAuthStatus: dlWithAuth?.status ?? "no_google_token",
      hasGoogleToken: !!googleToken,
      env,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e), env });
  }
}
