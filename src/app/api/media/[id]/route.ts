import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { caption } = await req.json();
    const media = await prisma.media.update({
      where: { id },
      data: { caption: caption ?? null },
    });
    return NextResponse.json(media);
  } catch {
    return NextResponse.json({ error: "Failed to update caption" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.media.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
