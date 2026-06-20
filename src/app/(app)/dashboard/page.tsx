"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchTrips } from "@/lib/api";
import { MOCK_TRIPS, MOCK_WISHLIST } from "@/lib/mock-data";
import { Trip, WishlistDestination } from "@/types";
import { MapPin, Calendar, Loader2 } from "lucide-react";

const TravelMap = dynamic(
  () => import("@/components/map/travel-map").then((m) => m.TravelMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-900 animate-pulse" /> }
);

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Santorini: { lat: 36.3932, lng: 25.4615 },
  "New York": { lat: 40.7128, lng: -74.006 },
  "Cape Town": { lat: -33.9249, lng: 18.4241 },
};

export default function DashboardPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wishlistMapCoords = MOCK_WISHLIST.map((w) => ({
    lat: CITY_COORDS[w.destinationCity]?.lat ?? 0,
    lng: CITY_COORDS[w.destinationCity]?.lng ?? 0,
    label: `${w.destinationCity}, ${w.destinationCountry}`,
  }));

  const loadTrips = async () => {
    try {
      const data = await fetchTrips();
      setTrips(data.length > 0 ? data : MOCK_TRIPS);
      setError(null);
    } catch {
      setTrips(MOCK_TRIPS);
    } finally {
      setLoading(false);
    }
  };

  const seedData = async () => {
    setSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      await loadTrips();
    } catch {
      setError("Seeding failed");
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      <div className="flex-1 relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "#222222" }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#C89B73" }} />
          </div>
        ) : (
          <TravelMap
            trips={trips}
            wishlistCoords={wishlistMapCoords}
            onTripClick={(id) => router.push(`/trips/${id}`)}
          />
        )}

        {/* Seed button — shown only when no DB trips */}
        {!loading && trips === MOCK_TRIPS && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000]">
            <button
              onClick={seedData}
              disabled={seeding}
              className="flex items-center gap-2 disabled:opacity-60 text-sm font-medium px-4 py-2 rounded-full shadow-lg transition-colors"
              style={{ background: "#C89B73", color: "#222222" }}
            >
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {seeding ? "Seeding demo data…" : "Load demo trips into database"}
            </button>
          </div>
        )}
      </div>

      {/* Trip cards strip */}
      <div className="backdrop-blur-md border-t p-3"
        style={{ background: "rgba(34,34,34,0.92)", borderColor: "rgba(200,155,115,0.15)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(248,245,240,0.35)", fontWeight: 500 }}>
              Recent Trips
            </p>
            <button
              onClick={() => router.push("/trips/new")}
              className="text-xs transition-colors"
              style={{ color: "#C89B73" }}
            >
              + Add Trip
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {trips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => router.push(`/trips/${trip.id}`)}
                className="flex-shrink-0 rounded-xl p-3 text-left transition-all min-w-[200px] group"
                style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.15)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(200,155,115,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(248,245,240,0.05)")}
              >
                <p className="text-sm font-medium line-clamp-1 mb-1 transition-colors"
                  style={{ color: "var(--ivory)", fontWeight: 500 }}>
                  {trip.title}
                </p>
                <div className="flex items-center gap-1 text-xs" style={{ color: "rgba(248,245,240,0.4)" }}>
                  <MapPin className="w-3 h-3" />
                  <span>{trip.primaryCountry}</span>
                  <span className="mx-1">·</span>
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(trip.startDate).getFullYear()}</span>
                </div>
              </button>
            ))}
            {trips.length === 0 && (
              <p className="text-sm py-2" style={{ color: "rgba(248,245,240,0.3)" }}>No trips yet. Add your first trip!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
