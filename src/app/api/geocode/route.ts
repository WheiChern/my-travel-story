import { NextRequest, NextResponse } from "next/server";
import { geocodePlace, geocodePlacesBatch } from "@/lib/geocode";
import { prisma } from "@/lib/prisma";

// Single lookup: GET /api/geocode?city=Tokyo&country=Japan
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") ?? "";
  const country = searchParams.get("country") ?? "";
  if (!city) return NextResponse.json({ error: "city required" }, { status: 400 });

  const result = await geocodePlace(city, country);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}

// Batch update all places in a trip that have lat/lng = 0
// POST /api/geocode  body: { tripId }
export async function POST(req: NextRequest) {
  const { tripId } = await req.json();
  if (!tripId) return NextResponse.json({ error: "tripId required" }, { status: 400 });

  const places = await prisma.place.findMany({
    where: { tripId, OR: [{ latitude: 0 }, { longitude: 0 }] },
    select: { id: true, city: true, country: true },
  });

  if (!places.length) return NextResponse.json({ updated: 0 });

  const geoResults = await geocodePlacesBatch(places);

  await Promise.all(
    geoResults.map(({ id, lat, lng }) =>
      prisma.place.update({ where: { id }, data: { latitude: lat, longitude: lng } })
    )
  );

  return NextResponse.json({ updated: geoResults.length, total: places.length });
}
