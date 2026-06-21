import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { tripId } = await req.json();
  if (!tripId) return NextResponse.json({ error: "tripId required" }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 501 });
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      places: { orderBy: { orderIndex: "asc" } },
      media: true,
      itineraryItems: { orderBy: { date: "asc" } },
      costItems: true,
    },
  });

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const totalCost = trip.costItems.reduce((s: number, c: { amount: number }) => s + c.amount, 0);
  const nights = Math.ceil(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const prompt = `You are a travel writer crafting a vivid, personal travel journal entry.

Trip: "${trip.title}"
Type: ${trip.tripType}
Dates: ${trip.startDate.toDateString()} to ${trip.endDate.toDateString()} (${nights} nights)
${trip.companions.length ? `Companions: ${trip.companions.join(", ")}` : "Solo trip"}
Countries: ${trip.places.map((p: { country: string }) => p.country).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(", ")}
Cities/Places: ${trip.places.map((p: { name: string; city: string }) => `${p.name} (${p.city})`).join(", ")}

Itinerary:
${trip.itineraryItems.map((i: { date: Date; title: string; description?: string | null }) => `- ${new Date(i.date).toDateString()}: ${i.title}${i.description ? " — " + i.description : ""}`).join("\n") || "No itinerary recorded"}

Media captions: ${trip.media.map((m: { caption?: string | null }) => m.caption).filter(Boolean).join("; ") || "None"}

Total cost: $${totalCost.toLocaleString()} ${trip.currency} across ${trip.costItems.length} categories

Write a storyboard response as JSON with exactly these fields:
{
  "tripSummary": "2-3 paragraph vivid summary of the trip as a travel journal entry. Mention specific places, food, moments. Write in first person.",
  "dayByDay": [
    { "date": "YYYY-MM-DD", "title": "Day X: Short title", "story": "2-3 sentence story for this day" }
  ],
  "foodHighlights": ["3-5 specific food/dining highlights based on the destination culture"],
  "sightsVisited": ["3-6 key sights or experiences based on the places visited"],
  "bestMemories": ["3-4 evocative memory snippets in first person"],
  "travelTips": ["2-3 practical tips for this destination based on the trip"],
  "suggestedCaptions": [
    { "description": "What the photo might show", "caption": "Short evocative caption" }
  ]
}

Base the day-by-day on the actual itinerary dates above. If no itinerary, generate logical days based on the trip length and places.
Return ONLY valid JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });

    const storyboard = JSON.parse(jsonMatch[1].trim());

    // Save the summary back to the trip
    await prisma.trip.update({
      where: { id: tripId },
      data: { summary: storyboard.tripSummary?.split("\n\n")[0] ?? trip.summary },
    });

    return NextResponse.json(storyboard);
  } catch (error) {
    console.error("Storyboard error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
