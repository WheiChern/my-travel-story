import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? "demo-user";
  try {
    const wishlist = await prisma.wishlistDestination.findMany({
      where: { userId },
      include: { fareAlerts: { orderBy: { checkedAt: "desc" }, take: 5 } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(wishlist);
  } catch {
    return NextResponse.json({ error: "Failed to fetch wishlist" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId ?? "demo-user";
    const item = await prisma.wishlistDestination.create({
      data: {
        userId,
        destinationCity: body.destinationCity,
        destinationCountry: body.destinationCountry,
        originCity: body.originCity,
        preferredStartDate: body.preferredStartDate ? new Date(body.preferredStartDate) : null,
        preferredEndDate: body.preferredEndDate ? new Date(body.preferredEndDate) : null,
        cabinClass: body.cabinClass ?? "economy",
        maxPrice: body.maxPrice ? parseFloat(body.maxPrice) : null,
        currency: body.currency ?? "USD",
        notes: body.notes,
        alertEnabled: body.alertEnabled ?? true,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create wishlist item" }, { status: 500 });
  }
}
