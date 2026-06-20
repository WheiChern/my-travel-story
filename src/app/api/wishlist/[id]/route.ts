import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const item = await prisma.wishlistDestination.update({
      where: { id },
      data: {
        ...(body.alertEnabled !== undefined && { alertEnabled: body.alertEnabled }),
        ...(body.maxPrice !== undefined && { maxPrice: body.maxPrice }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.wishlistDestination.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
