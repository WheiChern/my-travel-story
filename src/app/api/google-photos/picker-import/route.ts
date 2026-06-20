import { NextRequest, NextResponse } from "next/server";
import { getGoogleToken } from "@/lib/google-photos";
import { prisma } from "@/lib/prisma";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { tripId, sessionId } = await req.json();
    if (!tripId || !sessionId) {
      return NextResponse.json({ error: "tripId and sessionId required" }, { status: 400 });
    }

    const token = await getGoogleToken("demo-user");
    if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { media: true },
    });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    // Fetch all picked media items from the session
    const photos: Array<{ id: string; mimeType: string; baseUrl: string; createTime: string }> = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`https://photospicker.googleapis.com/v1/mediaItems`);
      url.searchParams.set("sessionId", sessionId);
      url.searchParams.set("pageSize", "100");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Picker items API ${res.status}: ${err}` }, { status: res.status });
      }

      const data = await res.json();
      for (const item of data.mediaItems ?? []) {
        photos.push({
          id: item.id,
          mimeType: item.mediaFile?.mimeType ?? "image/jpeg",
          baseUrl: item.mediaFile?.baseUrl ?? "",
          createTime: item.createTime ?? "",
        });
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    if (!photos.length) {
      return NextResponse.json({ imported: 0, message: "No photos selected in picker." });
    }

    // Skip already-imported photos
    const existingIds = new Set(trip.media.map((m) => m.sourceId ?? ""));

    const imported: string[] = [];
    for (const photo of photos) {
      if (!photo.baseUrl || existingIds.has(photo.id)) continue;

      try {
        // Store the baseUrl with =w2048-h2048 for a high-res display URL.
        // Google Picker baseUrls are valid for ~60 minutes without auth.
        const fileUrl = `${photo.baseUrl}=w2048-h2048`;

        await prisma.media.create({
          data: {
            tripId,
            sourceId: photo.id,
            fileUrl,
            source: "google_photos",
            mediaType: "photo",
            takenAt: photo.createTime ? new Date(photo.createTime) : null,
          },
        });

        imported.push(photo.id);
      } catch (e) {
        console.error("Failed to save photo", photo.id, e);
      }
    }

    return NextResponse.json({ selected: photos.length, imported: imported.length });
  } catch (err) {
    console.error("Picker import error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
