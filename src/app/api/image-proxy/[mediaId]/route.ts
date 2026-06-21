import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGoogleToken } from "@/lib/google-photos";

export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) return new NextResponse("Not found", { status: 404 });

  const fileUrl = media.fileUrl;

  // Public blob URLs — redirect directly, browser fetches without auth
  if (fileUrl.includes("public.blob.vercel-storage.com")) {
    return NextResponse.redirect(fileUrl);
  }

  // lh3 Google Photos URLs — fetch server-side with OAuth token and stream back
  if (fileUrl.includes("lh3.googleusercontent.com")) {
    const token = await getGoogleToken("demo-user");
    if (!token) return new NextResponse("No Google token", { status: 503 });

    const res = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
    }).catch(() => null);

    if (!res?.ok) return new NextResponse("Image unavailable", { status: 503 });

    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("Content-Type") ?? "image/jpeg");
    headers.set("Cache-Control", "public, max-age=3600");
    return new NextResponse(res.body, { status: 200, headers });
  }

  return NextResponse.redirect(fileUrl);
}
