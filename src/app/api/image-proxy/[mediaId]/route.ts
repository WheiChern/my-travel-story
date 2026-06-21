import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) return new NextResponse("Not found", { status: 404 });

  // All URLs (public blob or lh3) redirect directly — browser fetches them
  return NextResponse.redirect(media.fileUrl);
}
