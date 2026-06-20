import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geocodePlace } from "@/lib/geocode";
import type { ExtractedData } from "../extract/route";

async function resolvePlace(p: { city: string; country: string; orderIndex: number; visitDate?: string; notes?: string }, i: number) {
  const geo = await geocodePlace(p.city, p.country);
  return {
    name: p.city,
    city: p.city,
    country: p.country,
    latitude: geo?.lat ?? 0,
    longitude: geo?.lng ?? 0,
    orderIndex: p.orderIndex ?? i,
    visitDate: p.visitDate ? new Date(p.visitDate) : null,
    notes: p.notes ?? null,
  };
}

export async function POST(req: NextRequest) {
  const body: ExtractedData & { tripId?: string } = await req.json();
  const userId = "demo-user";

  try {
    if (body.tripId) {
      // Merge into existing trip
      const trip = await prisma.trip.update({
        where: { id: body.tripId },
        data: {
          ...(body.summary && { summary: body.summary }),
          ...(body.companions?.length && { companions: body.companions }),
          places: body.places?.length ? {
            create: await Promise.all(
              body.places.map((p, i) => resolvePlace({ ...p, orderIndex: 100 + i }, i))
            ),
          } : undefined,
          itineraryItems: body.itineraryItems?.length ? {
            create: body.itineraryItems.map((item) => ({
              date: new Date(item.date),
              title: item.title,
              description: item.description ?? null,
              transportMode: item.transportMode as never ?? null,
            })),
          } : undefined,
          costItems: body.costItems?.length ? {
            create: body.costItems.map((c) => ({
              category: c.category as never,
              description: c.description,
              amount: c.amount,
              currency: c.currency,
            })),
          } : undefined,
        },
        include: { places: true, itineraryItems: true, costItems: true, media: true },
      });
      return NextResponse.json(trip);
    }

    // Create new trip from extracted data
    const trip = await prisma.trip.create({
      data: {
        userId,
        title: body.title ?? "Imported Trip",
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : new Date(),
        tripType: (body.tripType as never) ?? "other",
        primaryCountry: body.primaryCountry ?? null,
        summary: body.summary ?? null,
        totalCost: body.costItems?.reduce((s, c) => s + c.amount, 0) ?? null,
        currency: body.currency ?? "USD",
        companions: body.companions ?? [],
        places: body.places?.length ? {
          create: await Promise.all(body.places.map((p, i) => resolvePlace(p, i))),
        } : undefined,
        itineraryItems: body.itineraryItems?.length ? {
          create: body.itineraryItems.map((item) => ({
            date: new Date(item.date),
            title: item.title,
            description: item.description ?? null,
            transportMode: item.transportMode as never ?? null,
          })),
        } : undefined,
        costItems: body.costItems?.length ? {
          create: body.costItems.map((c) => ({
            category: c.category as never,
            description: c.description,
            amount: c.amount,
            currency: c.currency,
          })),
        } : undefined,
      },
      include: { places: true, itineraryItems: true, costItems: true, media: true },
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
