import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geocodePlace } from "@/lib/geocode";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? "demo-user";

  try {
    const trips = await prisma.trip.findMany({
      where: { userId },
      include: {
        places: { orderBy: { orderIndex: "asc" } },
        media: true,
        itineraryItems: { orderBy: { date: "asc" } },
        costItems: true,
      },
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(trips);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title, startDate, endDate, tripType, primaryCountry,
      summary, totalCost, currency, companions,
      places = [], costItems = [],
    } = body;

    const userId = body.userId ?? "demo-user";

    const trip = await prisma.trip.create({
      data: {
        userId,
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        tripType,
        primaryCountry,
        summary,
        totalCost: totalCost ? parseFloat(totalCost) : null,
        currency: currency ?? "USD",
        companions: companions ?? [],
        places: {
          create: await Promise.all(
            places.map(async (p: { city: string; country: string }, i: number) => {
              const geo = await geocodePlace(p.city, p.country);
              return {
                name: p.city,
                city: p.city,
                country: p.country,
                latitude: geo?.lat ?? 0,
                longitude: geo?.lng ?? 0,
                orderIndex: i,
              };
            })
          ),
        },
        costItems: {
          create: costItems.map((c: { category: string; description: string; amount: number; currency: string }) => ({
            category: c.category,
            description: c.description,
            amount: parseFloat(String(c.amount)),
            currency: c.currency ?? "USD",
          })),
        },
      },
      include: {
        places: true,
        media: true,
        itineraryItems: true,
        costItems: true,
      },
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}
