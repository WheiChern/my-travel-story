import { NextRequest, NextResponse } from "next/server";
import { getGoogleToken } from "@/lib/google-photos";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

// Debug endpoint: returns raw Google Photos API response for a trip's date range
export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get("tripId");

  const token = await getGoogleToken("demo-user");
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  // Verify token has correct scopes by hitting userinfo
  const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/tokeninfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const tokenInfo = await userinfoRes.json();

  if (!tripId) {
    // Just return token info
    return NextResponse.json({ tokenInfo });
  }

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { places: true } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  endDate.setDate(endDate.getDate() + 1);

  const body = {
    pageSize: 10,
    filters: {
      dateFilter: {
        ranges: [{
          startDate: { year: startDate.getFullYear(), month: startDate.getMonth() + 1, day: startDate.getDate() },
          endDate: { year: endDate.getFullYear(), month: endDate.getMonth() + 1, day: endDate.getDate() },
        }],
      },
      mediaTypeFilter: { mediaTypes: ["PHOTO"] },
    },
  };

  const res = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const rawText = await res.text();
  let rawJson: unknown;
  try { rawJson = JSON.parse(rawText); } catch { rawJson = rawText; }

  // Also try plain list (no filter) to isolate whether it's the API access or date filter
  const listRes = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=1", {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  const listText = await listRes.text();
  let listJson: unknown;
  try { listJson = JSON.parse(listText); } catch { listJson = listText; }

  return NextResponse.json({
    tokenInfo,
    tripDates: {
      start: body.filters.dateFilter.ranges[0].startDate,
      end: body.filters.dateFilter.ranges[0].endDate,
    },
    searchApiStatus: res.status,
    searchApiResponse: rawJson,
    listApiStatus: listRes.status,
    listApiResponse: listJson,
  });
}
