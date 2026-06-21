import { NextRequest, NextResponse } from "next/server";
import { getGoogleToken } from "@/lib/google-photos";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

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

    const existingIds = new Set(trip.media.map((m: { sourceId: string | null }) => m.sourceId ?? ""));
    // Use public blob store (BLOB2_*) — public blobs are directly accessible by browsers
    const blobToken = process.env.BLOB2_READ_WRITE_TOKEN;
    const hasBlobToken = !!blobToken;

    const imported: string[] = [];
    const errors: string[] = [];

    for (const photo of photos) {
      if (!photo.baseUrl || existingIds.has(photo.id)) continue;

      try {
        let fileUrl: string;

        if (hasBlobToken) {
          // Google Photos lh3 URLs require the OAuth token — always send it
          const photoRes = await fetch(`${photo.baseUrl}=w2048-h2048`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(30000),
          });

          if (photoRes.ok) {
            try {
              const blob = await photoRes.blob();
              const ext = photo.mimeType.includes("png") ? "png" : "jpg";
              const { url } = await put(`photos/${tripId}/${photo.id}.${ext}`, blob, {
                access: "public",
                contentType: photo.mimeType,
                token: blobToken,
              } as Parameters<typeof put>[2]);
              fileUrl = url;
            } catch (blobErr) {
              const msg = `Blob upload failed: ${blobErr instanceof Error ? blobErr.message : String(blobErr)}`;
              errors.push(msg);
              console.error(msg);
              fileUrl = `${photo.baseUrl}=w2048-h2048`;
            }
          } else {
            const errText = await photoRes.text().catch(() => "");
            const msg = `Download failed ${photoRes.status}: ${errText.substring(0, 100)}`;
            errors.push(msg);
            console.error(`Photo ${photo.id} ${msg}`);
            fileUrl = `${photo.baseUrl}=w2048-h2048`;
          }
        } else {
          fileUrl = `${photo.baseUrl}=w2048-h2048`;
        }

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
        const msg = `Save failed: ${e instanceof Error ? e.message : String(e)}`;
        errors.push(msg);
        console.error("Failed to save photo", photo.id, e);
      }
    }

    return NextResponse.json({
      selected: photos.length,
      imported: imported.length,
      errors: errors.slice(0, 3),
      message: imported.length > 0
        ? `${imported.length}/${photos.length} photos imported${hasBlobToken ? " permanently" : " (temporary)"}`
        : errors.length > 0
        ? `Import failed: ${errors[0]}`
        : `No photos found in picker session`,
    });
  } catch (err) {
    console.error("Picker import error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
