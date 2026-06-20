"use client";

import { useEffect, useRef, useState } from "react";
import { Trip, TripType, TRIP_TYPE_COLORS, TRIP_TYPE_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";

interface TravelMapProps {
  trips: Trip[];
  wishlistCoords?: Array<{ lat: number; lng: number; label: string }>;
  onTripClick?: (tripId: string) => void;
  selectedTripType?: TripType | null;
}

const TRIP_TYPE_EMOJI: Record<TripType, string> = {
  family: "👨‍👩‍👧",
  solo: "🧳",
  special_someone: "💕",
  friends: "🎉",
  business: "💼",
  other: "✈️",
};

export function TravelMap({ trips, wishlistCoords = [], onTripClick, selectedTripType }: TravelMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const [activeFilter, setActiveFilter] = useState<TripType | null>(selectedTripType ?? null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Clear any stale Leaflet state from previous mount (React 18 strict mode)
    const container = mapRef.current as unknown as Record<string, unknown>;
    if (container._leaflet_id) {
      delete container._leaflet_id;
    }

    import("leaflet").then((L) => {
      // Bail if component unmounted while import was in flight
      if (!mapRef.current || mapInstanceRef.current) return;

      // Fix default icon issue with webpack
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxBounds: [[-90, -180], [90, 180]],
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      renderMarkers(L, map, trips, wishlistCoords, activeFilter, onTripClick);
    });

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      if (mapRef.current) {
        // Clear Leaflet's internal ID so re-mount doesn't throw "already initialized"
        delete (mapRef.current as unknown as Record<string, unknown>)._leaflet_id;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      const map = mapInstanceRef.current!;
      map.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker || layer instanceof L.Polyline || layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });
      renderMarkers(L, map, trips, wishlistCoords, activeFilter, onTripClick);
    });
  }, [trips, activeFilter, wishlistCoords]);

  return (
    <div className="relative w-full h-full">
      {/* Legend & Filters */}
      <div className="absolute top-4 left-4 z-[1000] backdrop-blur-md rounded-xl p-3 space-y-2"
        style={{ background: "rgba(34,34,34,0.85)", border: "1px solid rgba(200,155,115,0.15)" }}>
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "rgba(248,245,240,0.35)" }}>Filter</p>
        <div className="flex flex-col gap-1.5">
          {(Object.entries(TRIP_TYPE_COLORS) as [TripType, string][]).map(([type, color]) => (
            <button
              key={type}
              onClick={() => setActiveFilter(activeFilter === type ? null : type)}
              className={`flex items-center gap-2 text-xs px-2 py-1 rounded-md transition-all ${
                activeFilter === null || activeFilter === type ? "opacity-100" : "opacity-30"
              } hover:opacity-100`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span style={{ color: "#F8F5F0" }}>{TRIP_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 z-[1000] backdrop-blur-md rounded-xl p-3 space-y-1"
        style={{ background: "rgba(34,34,34,0.85)", border: "1px solid rgba(200,155,115,0.15)" }}>
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "rgba(248,245,240,0.35)" }}>Journey</p>
        <p className="text-sm" style={{ color: "#F8F5F0" }}>
          <span className="font-semibold" style={{ color: "#C89B73" }}>{trips.length}</span> trips
        </p>
        <p className="text-sm" style={{ color: "#F8F5F0" }}>
          <span className="font-semibold" style={{ color: "#C89B73" }}>
            {new Set(trips.flatMap(t => t.places.map(p => p.country))).size}
          </span> countries
        </p>
        <p className="text-sm" style={{ color: "#F8F5F0" }}>
          <span className="font-semibold" style={{ color: "#C89B73" }}>
            {new Set(trips.flatMap(t => t.places.map(p => p.city))).size}
          </span> cities
        </p>
      </div>

      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}

function renderMarkers(
  L: typeof import("leaflet"),
  map: import("leaflet").Map,
  trips: Trip[],
  wishlistCoords: Array<{ lat: number; lng: number; label: string }>,
  activeFilter: TripType | null,
  onTripClick?: (tripId: string) => void
) {
  const filteredTrips = activeFilter ? trips.filter(t => t.tripType === activeFilter) : trips;

  // Draw route lines between places within each trip
  filteredTrips.forEach((trip) => {
    const sortedPlaces = [...trip.places].sort((a, b) => a.orderIndex - b.orderIndex);
    if (sortedPlaces.length > 1) {
      const coords = sortedPlaces.map(p => [p.latitude, p.longitude] as [number, number]);
      L.polyline(coords, {
        color: TRIP_TYPE_COLORS[trip.tripType],
        weight: 2,
        opacity: 0.5,
        dashArray: "6, 4",
      }).addTo(map);
    }
  });

  // Draw place markers
  filteredTrips.forEach((trip) => {
    trip.places.forEach((place) => {
      const color = TRIP_TYPE_COLORS[trip.tripType];
      const marker = L.circleMarker([place.latitude, place.longitude], {
        radius: 8,
        fillColor: color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 160px;">
          <p style="font-weight: 700; font-size: 14px; margin: 0 0 4px">${place.city}, ${place.country}</p>
          <p style="color: #888; font-size: 12px; margin: 0 0 8px">${trip.title}</p>
          <button
            onclick="window.dispatchEvent(new CustomEvent('openTrip', {detail: '${trip.id}'}))"
            style="background: #C89B73; color: #222; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;"
          >View Trip</button>
        </div>
      `);
    });
  });

  // Wishlist markers (star shape via divIcon)
  wishlistCoords.forEach(({ lat, lng, label }) => {
    const icon = L.divIcon({
      className: "",
      html: `<div style="background:#C89B73;border:2px solid #F8F5F0;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:9px">★</div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(`<b>Wishlist:</b> ${label}`);
  });

  // Listen for popup button clicks
  window.addEventListener("openTrip", ((e: CustomEvent) => {
    onTripClick?.(e.detail);
  }) as EventListener, { once: false });
}
