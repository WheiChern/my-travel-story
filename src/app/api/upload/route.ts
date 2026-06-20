import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || ".jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const fileUrl = `/uploads/${filename}`;
    const isVideo = file.type.startsWith("video/");

    const media = await prisma.media.create({
      data: {
        tripId,
        placeId: placeId || null,
        source: "manual_upload",
        fileUrl,
        thumbnailUrl: isVideo ? null : fileUrl,
        mediaType: isVideo ? "video" : "photo",
        caption: caption || null,
        peopleTags: [],
      },
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

