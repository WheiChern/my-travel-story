import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        places: { orderBy: { orderIndex: "asc" } },
        media: { orderBy: { takenAt: "asc" } },
        itineraryItems: { orderBy: { date: "asc" } },
        costItems: true,
      },
    });
    if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(trip);
  } catch {
    return NextResponse.json({ error: "Failed to fetch trip" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const trip = await prisma.trip.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.summary !== undefined && { summary: body.summary }),
        ...(body.tripType !== undefined && { tripType: body.tripType }),
        ...(body.companions !== undefined && { companions: body.companions }),
        ...(body.totalCost !== undefined && { totalCost: body.totalCost }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
        ...(body.currency !== undefined && { currency: body.currency }),
      },
      include: {
        places: { orderBy: { orderIndex: "asc" } },
        media: true,
        itineraryItems: { orderBy: { date: "asc" } },
        costItems: true,
      },
    });
    return NextResponse.json(trip);
  } catch {
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.trip.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 });
  }
}
