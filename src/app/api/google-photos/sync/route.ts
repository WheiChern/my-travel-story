import { NextRequest, NextResponse } from "next/server";
import { getGoogleToken, searchPhotosByDateRange, downloadGooglePhoto, type GooglePhoto } from "@/lib/google-photos";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { tripId } = await req.json();
    if (!tripId) return NextResponse.json({ error: "tripId required" }, { status: 400 });

    const token = await getGoogleToken("demo-user");
    if (!token) return NextResponse.json({ error: "Google Photos not connected" }, { status: 401 });

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { places: true, media: true },
    });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    // 1. Fetch all photos within the trip's date range
    const allPhotos = await searchPhotosByDateRange(token, trip.startDate, trip.endDate);
    if (!allPhotos.length) {
      return NextResponse.json({ imported: 0, message: "No photos found for this date range in Google Photos." });
    }

    // 2. Use Claude to filter photos by relevance to the trip's places + people
    const relevant = await filterRelevantPhotos(allPhotos, trip);

    // 3. Skip photos already imported (by filename)
    const existingFilenames = new Set(trip.media.map((m) => m.filename ?? ""));
    const toImport = relevant.filter((p) => !existingFilenames.has(p.filename));

    if (!toImport.length) {
      return NextResponse.json({ imported: 0, message: "All relevant photos are already imported." });
    }

    // 4. Download and save photos
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const imported: string[] = [];
    for (const photo of toImport.slice(0, 50)) { // cap at 50 per sync
      try {
        const buffer = await downloadGooglePhoto(photo.baseUrl);
        const filename = `google_${photo.id}_${photo.filename}`;
        const filePath = path.join(uploadsDir, filename);
        await writeFile(filePath, buffer);

        await prisma.media.create({
          data: {
            tripId,
            filename,
            url: `/uploads/${filename}`,
            mimeType: photo.mimeType,
            source: "upload",
            mediaType: "photo",
            takenAt: photo.creationTime ? new Date(photo.creationTime) : null,
            caption: photo.description ?? null,
          },
        });

        imported.push(filename);
      } catch {
        // skip failed individual photo
      }
    }

    return NextResponse.json({
      found: allPhotos.length,
      relevant: relevant.length,
      imported: imported.length,
      capped: toImport.length > 50,
    });
  } catch (err) {
    console.error("Google Photos sync error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function filterRelevantPhotos(photos: GooglePhoto[], trip: {
  title: string;
  startDate: Date;
  endDate: Date;
  places: Array<{ city: string; country: string }>;
  companions: string[];
}): Promise<GooglePhoto[]> {
  // If ≤20 photos, skip AI filtering — just take them all
  if (photos.length <= 20) return photos;

  // Build a photo index for Claude to evaluate
  // Send thumbnails (up to 10) to Claude for context, then ask it to estimate relevance
  const destinations = trip.places.map((p) => `${p.city}, ${p.country}`).join(" / ");
  const companions = trip.companions.join(", ") || "not specified";

  const prompt = `You are filtering a list of photos from Google Photos to find ones relevant to a specific trip.

Trip: "${trip.title}"
Destinations: ${destinations}
Travel companions: ${companions}
Date range: ${trip.startDate.toDateString()} to ${trip.endDate.toDateString()}

Here are ${photos.length} photos taken during this date range. Evaluate each by filename and return the indices (0-based) of photos that are likely relevant to this trip (i.e., taken at the destination, NOT photos of home, work, or unrelated activities).

Photo filenames:
${photos.map((p, i) => `${i}: ${p.filename}`).join("\n")}

Return ONLY a JSON array of relevant indices, e.g. [0, 2, 5]. Be inclusive — include anything that could plausibly be from this trip.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    const match = text.match(/\[[\d,\s]*\]/);
    if (!match) return photos; // if parsing fails, return all

    const indices: number[] = JSON.parse(match[0]);
    return indices
      .filter((i) => i >= 0 && i < photos.length)
      .map((i) => photos[i]);
  } catch {
    return photos; // on error, return all photos
  }
}
