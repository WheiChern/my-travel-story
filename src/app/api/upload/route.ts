import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const tripId = formData.get("tripId") as string;
    const caption = formData.get("caption") as string | null;
    const placeId = formData.get("placeId") as string | null;

    if (!file || !tripId) {
      return NextResponse.json({ error: "Missing file or tripId" }, { status: 400 });
    }

    const blobToken = process.env.BLOB2_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `uploads/${tripId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const isVideo = file.type.startsWith("video/");

    const { url } = await put(filename, file, {
      access: "public",
      contentType: file.type,
      token: blobToken,
    } as Parameters<typeof put>[2]);

    const media = await prisma.media.create({
      data: {
        tripId,
        placeId: placeId || null,
        source: "manual_upload",
        fileUrl: url,
        thumbnailUrl: isVideo ? null : url,
        mediaType: isVideo ? "video" : "photo",
        caption: caption || null,
        peopleTags: [],
      },
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
