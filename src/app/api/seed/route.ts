import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

export async function POST() {
  try {
    // Ensure demo user exists
    await prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      update: {},
      create: {
        id: DEMO_USER_ID,
        email: "demo@travelmap.app",
        name: "Demo User",
      },
    });

    // Clear existing demo trips
    await prisma.trip.deleteMany({ where: { userId: DEMO_USER_ID } });
    await prisma.wishlistDestination.deleteMany({ where: { userId: DEMO_USER_ID } });

    // Seed trips
    const japan = await prisma.trip.create({
      data: {
        id: "trip-1",
        userId: DEMO_USER_ID,
        title: "Japan Family Trip",
        startDate: new Date("2024-12-15"),
        endDate: new Date("2024-12-28"),
        tripType: "family",
        primaryCountry: "Japan",
        summary: "A magical winter family trip through Tokyo, Kyoto and Osaka, filled with temple visits, ramen shops, Christmas lights and slow walks through old streets.",
        totalCost: 8500,
        currency: "USD",
        companions: ["Mom", "Dad", "Sister"],
        places: {
          create: [
            { name: "Shinjuku", city: "Tokyo", country: "Japan", latitude: 35.6938, longitude: 139.7036, visitDate: new Date("2024-12-15"), orderIndex: 0 },
            { name: "Senso-ji Temple", city: "Tokyo", country: "Japan", latitude: 35.7148, longitude: 139.7967, visitDate: new Date("2024-12-16"), orderIndex: 1 },
            { name: "Fushimi Inari", city: "Kyoto", country: "Japan", latitude: 34.9671, longitude: 135.7727, visitDate: new Date("2024-12-20"), orderIndex: 2 },
            { name: "Dotonbori", city: "Osaka", country: "Japan", latitude: 34.6687, longitude: 135.5013, visitDate: new Date("2024-12-24"), orderIndex: 3 },
          ],
        },
        media: {
          create: [
            { source: "manual_upload", fileUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800", thumbnailUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400", mediaType: "photo", takenAt: new Date("2024-12-16"), caption: "Senso-ji at dawn", peopleTags: [] },
            { source: "manual_upload", fileUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800", thumbnailUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400", mediaType: "photo", takenAt: new Date("2024-12-20"), caption: "The thousand torii gates", peopleTags: ["Mom", "Dad"] },
            { source: "manual_upload", fileUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800", thumbnailUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400", mediaType: "photo", takenAt: new Date("2024-12-22"), caption: "Kyoto bamboo grove", peopleTags: [] },
          ],
        },
        itineraryItems: {
          create: [
            { date: new Date("2024-12-15"), title: "Arrive in Tokyo", description: "Flew into Narita. Checked into hotel in Shinjuku.", transportMode: "flight" },
            { date: new Date("2024-12-16"), title: "Asakusa & Senso-ji", description: "Visited Senso-ji Temple, Tokyo Skytree, had tempura lunch.", transportMode: "walk" },
            { date: new Date("2024-12-19"), title: "Shinkansen to Kyoto", description: "Bullet train to Kyoto. Evening walk in Gion.", transportMode: "train" },
            { date: new Date("2024-12-20"), title: "Fushimi Inari & Arashiyama", description: "Early morning at Fushimi Inari, then bamboo grove.", transportMode: "walk" },
          ],
        },
        costItems: {
          create: [
            { category: "flights", description: "Return flights x4", amount: 3200, currency: "USD" },
            { category: "hotels", description: "13 nights accommodation", amount: 2600, currency: "USD" },
            { category: "food", description: "Food & dining", amount: 1200, currency: "USD" },
            { category: "transport", description: "JR Pass x4", amount: 800, currency: "USD" },
            { category: "attractions", description: "Entrance fees & activities", amount: 400, currency: "USD" },
            { category: "shopping", description: "Souvenirs & shopping", amount: 300, currency: "USD" },
          ],
        },
      },
    });

    await prisma.trip.create({
      data: {
        id: "trip-2",
        userId: DEMO_USER_ID,
        title: "Solo Backpack Through Southeast Asia",
        startDate: new Date("2023-06-01"),
        endDate: new Date("2023-06-30"),
        tripType: "solo",
        primaryCountry: "Thailand",
        summary: "A month-long solo adventure across Thailand, Vietnam and Cambodia. Street food, temples, beaches and beautiful chaos.",
        totalCost: 3200,
        currency: "USD",
        companions: [],
        places: {
          create: [
            { name: "Khao San Road", city: "Bangkok", country: "Thailand", latitude: 13.7583, longitude: 100.4975, visitDate: new Date("2023-06-01"), orderIndex: 0 },
            { name: "Old Quarter", city: "Hanoi", country: "Vietnam", latitude: 21.0285, longitude: 105.8542, visitDate: new Date("2023-06-12"), orderIndex: 1 },
            { name: "Angkor Wat", city: "Siem Reap", country: "Cambodia", latitude: 13.4125, longitude: 103.8670, visitDate: new Date("2023-06-22"), orderIndex: 2 },
          ],
        },
        media: {
          create: [
            { source: "manual_upload", fileUrl: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800", thumbnailUrl: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400", mediaType: "photo", takenAt: new Date("2023-06-22"), caption: "Sunrise at Angkor Wat", peopleTags: [] },
          ],
        },
        itineraryItems: {
          create: [
            { date: new Date("2023-06-01"), title: "Arrived in Bangkok", description: "Street food crawl on Khao San Road.", transportMode: "flight" },
          ],
        },
        costItems: {
          create: [
            { category: "flights", description: "Flights", amount: 900, currency: "USD" },
            { category: "hotels", description: "Hostels & guesthouses", amount: 600, currency: "USD" },
            { category: "food", description: "Street food & restaurants", amount: 500, currency: "USD" },
            { category: "transport", description: "Buses & trains", amount: 400, currency: "USD" },
            { category: "attractions", description: "Entry fees", amount: 300, currency: "USD" },
            { category: "other", description: "Visa & misc", amount: 500, currency: "USD" },
          ],
        },
      },
    });

    await prisma.trip.create({
      data: {
        id: "trip-3",
        userId: DEMO_USER_ID,
        title: "Paris with My Love",
        startDate: new Date("2024-02-10"),
        endDate: new Date("2024-02-16"),
        tripType: "special_someone",
        primaryCountry: "France",
        summary: "A romantic Valentine's week in Paris. The Eiffel Tower, Montmartre, Seine river cruise and too many croissants.",
        totalCost: 4200,
        currency: "USD",
        companions: ["Sarah"],
        places: {
          create: [
            { name: "Eiffel Tower", city: "Paris", country: "France", latitude: 48.8584, longitude: 2.2945, visitDate: new Date("2024-02-11"), orderIndex: 0 },
            { name: "Montmartre", city: "Paris", country: "France", latitude: 48.8867, longitude: 2.3431, visitDate: new Date("2024-02-13"), orderIndex: 1 },
          ],
        },
        media: {
          create: [
            { source: "manual_upload", fileUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800", thumbnailUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400", mediaType: "photo", takenAt: new Date("2024-02-14"), caption: "Valentine's Day in Paris", peopleTags: ["Sarah"] },
          ],
        },
        itineraryItems: { create: [] },
        costItems: {
          create: [
            { category: "flights", description: "Flights x2", amount: 1200, currency: "USD" },
            { category: "hotels", description: "6 nights boutique hotel", amount: 1800, currency: "USD" },
            { category: "food", description: "Dining & cafes", amount: 800, currency: "USD" },
            { category: "attractions", description: "Museum & tours", amount: 400, currency: "USD" },
          ],
        },
      },
    });

    await prisma.trip.create({
      data: {
        id: "trip-4",
        userId: DEMO_USER_ID,
        title: "Bali with the Squad",
        startDate: new Date("2023-12-20"),
        endDate: new Date("2023-12-31"),
        tripType: "friends",
        primaryCountry: "Indonesia",
        summary: "New Year's in Bali with six friends. Temples, rice terraces, surf lessons and a rooftop countdown.",
        totalCost: 2800,
        currency: "USD",
        companions: ["Alex", "James", "Maria", "Tom", "Priya"],
        places: {
          create: [
            { name: "Seminyak Beach", city: "Bali", country: "Indonesia", latitude: -8.6911, longitude: 115.1668, visitDate: new Date("2023-12-20"), orderIndex: 0 },
            { name: "Tegallalang Rice Terrace", city: "Ubud", country: "Indonesia", latitude: -8.4312, longitude: 115.2781, visitDate: new Date("2023-12-24"), orderIndex: 1 },
          ],
        },
        media: {
          create: [
            { source: "manual_upload", fileUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800", thumbnailUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400", mediaType: "photo", takenAt: new Date("2023-12-24"), caption: "Rice terraces at golden hour", peopleTags: ["Alex", "James"] },
          ],
        },
        itineraryItems: { create: [] },
        costItems: {
          create: [
            { category: "flights", description: "Flights", amount: 800, currency: "USD" },
            { category: "hotels", description: "Villa rental (split 6 ways)", amount: 1000, currency: "USD" },
            { category: "food", description: "Food & drinks", amount: 600, currency: "USD" },
            { category: "attractions", description: "Activities", amount: 400, currency: "USD" },
          ],
        },
      },
    });

    // Seed wishlist
    await prisma.wishlistDestination.createMany({
      data: [
        { id: "wish-1", userId: DEMO_USER_ID, destinationCity: "Santorini", destinationCountry: "Greece", originCity: "Singapore", preferredStartDate: new Date("2025-08-01"), preferredEndDate: new Date("2025-08-14"), cabinClass: "economy", maxPrice: 1200, currency: "USD", notes: "Dream summer destination", alertEnabled: true },
        { id: "wish-2", userId: DEMO_USER_ID, destinationCity: "New York", destinationCountry: "USA", originCity: "Singapore", cabinClass: "economy", maxPrice: 900, currency: "USD", alertEnabled: true },
        { id: "wish-3", userId: DEMO_USER_ID, destinationCity: "Cape Town", destinationCountry: "South Africa", originCity: "Singapore", cabinClass: "economy", maxPrice: 1500, currency: "USD", notes: "Would love to do a safari nearby", alertEnabled: false },
      ],
    });

    return NextResponse.json({ success: true, message: "Demo data seeded!" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
