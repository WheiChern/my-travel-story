"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Place = {
  id: string;
  name: string;
  city: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  visitDate?: string | null;
  orderIndex: number;
};

function makeIcon(index: number, color: string) {
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};
      border:2px solid rgba(248,245,240,0.9);
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:700;color:#fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
    ">${index + 1}</div>`,
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [32, 32] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 10);
    }
  }, [map, positions]);
  return null;
}

export default function RouteMap({ places, color }: { places: Place[]; color: string }) {
  const sorted = [...places].sort((a, b) => a.orderIndex - b.orderIndex);
  const withCoords = sorted.filter(p => p.latitude != null && p.longitude != null);
  const positions: [number, number][] = withCoords.map(p => [p.latitude!, p.longitude!]);

  if (!withCoords.length) {
    return (
      <div className="flex items-center justify-center h-full rounded-2xl"
        style={{ background: "rgba(248,245,240,0.04)", border: "1px solid rgba(200,155,115,0.12)" }}>
        <p className="text-sm" style={{ color: "rgba(248,245,240,0.3)" }}>No coordinates available</p>
      </div>
    );
  }

  const center: [number, number] = positions[0];

  return (
    <MapContainer
      center={center}
      zoom={5}
      style={{ height: "100%", width: "100%", borderRadius: 16, background: "#1a1a1a" }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
      />
      <FitBounds positions={positions} />

      {/* Route line */}
      <Polyline
        positions={positions}
        pathOptions={{ color, weight: 2.5, opacity: 0.7, dashArray: "6 4" }}
      />

      {/* Markers */}
      {withCoords.map((place, i) => (
        <Marker
          key={place.id}
          position={[place.latitude!, place.longitude!]}
          icon={makeIcon(i, color)}
        >
          <Popup>
            <div style={{ minWidth: 120 }}>
              <strong style={{ fontSize: 13 }}>{place.name}</strong><br />
              <span style={{ fontSize: 11, color: "#666" }}>{place.city}, {place.country}</span>
              {place.visitDate && (
                <><br /><span style={{ fontSize: 11, color: "#999" }}>
                  {new Date(place.visitDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span></>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
