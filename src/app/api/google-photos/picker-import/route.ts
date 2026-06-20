import { NextRequest, NextResponse } from "next/server";
import { getGoogleToken } from "@/lib/google-photos";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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
    const photos: Array<{ id: string; filename: string; mimeType: string; baseUrl: string; createTime: string }> = [];
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
          filename: item.mediaFile?.filename ?? item.id,
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
    const existingFilenames = new Set(trip.media.map((m) => m.sourceId ?? ""));

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const imported: string[] = [];
    for (const photo of photos) {
      if (!photo.baseUrl) continue;
      if (existingFilenames.has(photo.id)) continue;

      try {
        // =d downloads full resolution; Picker API requires auth header
        const dlRes = await fetch(`${photo.baseUrl}=d`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(30000),
        });
        if (!dlRes.ok) {
          console.error(`Download failed for ${photo.filename}: ${dlRes.status} ${await dlRes.text()}`);
          continue;
        }
        const buffer = Buffer.from(await dlRes.arrayBuffer());
        const filename = `google_${photo.id}_${photo.filename}`;
        await writeFile(path.join(uploadsDir, filename), buffer);

        await prisma.media.create({
          data: {
            tripId,
            sourceId: photo.id,
            fileUrl: `/uploads/${filename}`,
            source: "google_photos",
            mediaType: "photo",
            takenAt: photo.createTime ? new Date(photo.createTime) : null,
          },
        });

        imported.push(filename);
      } catch {
        // skip individual failures
      }
    }

    return NextResponse.json({ selected: photos.length, imported: imported.length });
  } catch (err) {
    console.error("Picker import error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
