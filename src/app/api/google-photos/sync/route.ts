import { NextRequest, NextResponse } from "next/server";
import { getGoogleToken } from "@/lib/google-photos";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export const maxDuration = 120;

// This route is a legacy fallback — the primary import path is picker-import.
// It downloads photos by baseUrl (must be provided externally) and stores them in Blob.
export async function POST(req: NextRequest) {
  try {
    const { tripId, photos } = await req.json() as {
      tripId: string;
      photos: Array<{ id: string; baseUrl: string; mimeType: string; createTime?: string }>;
    };

    if (!tripId || !Array.isArray(photos) || !photos.length) {
      return NextResponse.json({ error: "tripId and photos array required" }, { status: 400 });
    }

    const token = await getGoogleToken("demo-user");
    if (!token) return NextResponse.json({ error: "Google Photos not connected" }, { status: 401 });

    const blobToken = process.env.BLOB2_READ_WRITE_TOKEN;
    if (!blobToken) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });

    const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { media: true } });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const existingIds = new Set(trip.media.map((m: { sourceId: string | null }) => m.sourceId ?? ""));
    const imported: string[] = [];
    const errors: string[] = [];

    for (const photo of photos.slice(0, 50)) {
      if (existingIds.has(photo.id)) continue;
      try {
        const photoRes = await fetch(`${photo.baseUrl}=w2048-h2048`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(30000),
        });
        if (!photoRes.ok) { errors.push(`Download failed ${photoRes.status} for ${photo.id}`); continue; }

        const blob = await photoRes.blob();
        const ext = (photo.mimeType ?? "").includes("png") ? "png" : "jpg";
        const { url } = await put(`photos/${tripId}/${photo.id}.${ext}`, blob, {
          access: "public",
          contentType: photo.mimeType ?? "image/jpeg",
          token: blobToken,
        } as Parameters<typeof put>[2]);

        await prisma.media.create({
          data: {
            tripId,
            sourceId: photo.id,
            fileUrl: url,
            source: "google_photos",
            mediaType: "photo",
            takenAt: photo.createTime ? new Date(photo.createTime) : null,
          },
        });
        imported.push(photo.id);
      } catch (e) {
        errors.push(String(e));
      }
    }

    return NextResponse.json({ imported: imported.length, errors: errors.slice(0, 3) });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
