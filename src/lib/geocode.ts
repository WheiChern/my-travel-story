interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

const cache = new Map<string, GeoResult | null>();

export async function geocodePlace(city: string, country: string): Promise<GeoResult | null> {
  const key = `${city},${country}`.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  const query = encodeURIComponent(`${city}, ${country}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=0`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TravelMap/1.0 (travel-map-app)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) { cache.set(key, null); return null; }

    const result: GeoResult = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
    cache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

export async function geocodePlacesBatch(
  places: Array<{ id: string; city: string; country: string }>
): Promise<Array<{ id: string; lat: number; lng: number }>> {
  const results: Array<{ id: string; lat: number; lng: number }> = [];

  for (const place of places) {
    // Nominatim rate-limit: 1 req/sec
    await new Promise((r) => setTimeout(r, 1100));
    const geo = await geocodePlace(place.city, place.country);
    if (geo) {
      results.push({ id: place.id, lat: geo.lat, lng: geo.lng });
    }
  }

  return results;
}
