"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchTrip } from "@/lib/api";
import { MOCK_TRIPS } from "@/lib/mock-data";
import { Trip, TRIP_TYPE_COLORS, TRIP_TYPE_LABELS, type CostCategory } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, MapPin, Calendar, Users, DollarSign,
  Camera, Route, List, Plane, Train, Bus, Car, Ship, PersonStanding, Loader2, Trash2, Sparkles
} from "lucide-react";
import Image from "next/image";
import { deleteTrip } from "@/lib/api";

type StoryboardData = {
  tripSummary: string;
  dayByDay: { date: string; title: string; story: string }[];
  foodHighlights: string[];
  sightsVisited: string[];
  bestMemories: string[];
  travelTips: string[];
  suggestedCaptions: { description: string; caption: string }[];
};

const TRANSPORT_ICONS: Record<string, React.ElementType> = {
  flight: Plane, train: Train, bus: Bus, car: Car, ferry: Ship, walk: PersonStanding,
};

const COST_CATEGORY_ICONS: Record<string, string> = {
  flights: "✈️", hotels: "🏨", transport: "🚌", food: "🍜",
  attractions: "🎡", shopping: "🛍️", insurance: "🛡️", other: "📦",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSessionId, setPickerSessionId] = useState<string | null>(null);
  const [pickerPolling, setPickerPolling] = useState(false);
  const [pickerResult, setPickerResult] = useState<{ imported: number; selected: number; message?: string } | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    fetch("/api/google-photos/status").then(r => r.json()).then(d => setGoogleConnected(d.connected));
  }, []);

  useEffect(() => {
    fetchTrip(id)
      .then(setTrip)
      .catch(() => {
        const mock = MOCK_TRIPS.find((t) => t.id === id) ?? null;
        setTrip(mock);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const openGooglePicker = async () => {
    setPickerLoading(true);
    setPickerResult(null);
    try {
      const res = await fetch("/api/google-photos/picker-session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start picker");
      setPickerSessionId(data.sessionId);

      // Open Google's picker in a new tab
      window.open(data.pickerUri, "_blank");

      // Start polling for completion
      setPickerPolling(true);
      const sessionId = data.sessionId;
      const poll = async () => {
        try {
          const pollRes = await fetch(`/api/google-photos/picker-session?sessionId=${sessionId}`);
          const pollData = await pollRes.json();
          if (pollData.mediaItemsSet) {
            setPickerPolling(false);
            // Import the selected photos
            const importRes = await fetch("/api/google-photos/picker-import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tripId: id, sessionId }),
            });
            const importData = await importRes.json();
            if (!importRes.ok) throw new Error(importData.error ?? "Import failed");
            setPickerResult(importData);
            setPickerSessionId(null);
            if (importData.imported > 0) fetchTrip(id).then(setTrip).catch(() => {});
          } else {
            // Keep polling every 3 seconds
            setTimeout(poll, 3000);
          }
        } catch (e) {
          setPickerPolling(false);
          setPickerResult({ imported: 0, selected: 0, message: e instanceof Error ? e.message : "Import failed" });
        }
      };
      setTimeout(poll, 3000);
    } catch (e) {
      setPickerResult({ imported: 0, selected: 0, message: e instanceof Error ? e.message : "Failed to open picker" });
    } finally {
      setPickerLoading(false);
    }
  };

  const generateStory = async () => {
    setStoryLoading(true);
    setStoryError(null);
    try {
      const res = await fetch("/api/ai/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Generation failed");
      }
      setStoryboard(await res.json());
    } catch (e) {
      setStoryError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setStoryLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this trip?")) return;
    await deleteTrip(id);
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Trip not found</p>
          <button onClick={() => router.push("/dashboard")} className="text-blue-400 hover:text-blue-300">
            ← Back to map
          </button>
        </div>
      </div>
    );
  }

  const color = TRIP_TYPE_COLORS[trip.tripType];
  const totalCost = trip.costItems.reduce((sum, c) => sum + c.amount, 0);
  const byCategory = trip.costItems.reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + c.amount;
    return acc;
  }, {});
  const nights = Math.max(1, Math.ceil(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
  ));
  const itineraryByDate = trip.itineraryItems.reduce<Record<string, typeof trip.itineraryItems>>((acc, item) => {
    const date = item.date.split("T")[0];
    acc[date] = [...(acc[date] ?? []), item];
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero */}
      <div className="relative h-64 bg-gray-900 overflow-hidden">
        {trip.media[0] && (
          <Image src={trip.media[0].fileUrl} alt={trip.title} fill className="object-cover opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
        <div className="absolute inset-0 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="flex items-center gap-1 text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <button onClick={handleDelete} className="p-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
                {TRIP_TYPE_LABELS[trip.tripType]}
              </span>
              <span className="text-white/40 text-xs">{formatDate(trip.startDate)} — {formatDate(trip.endDate)}</span>
            </div>
            <h1 className="text-3xl font-bold text-white">{trip.title}</h1>
            {trip.companions.length > 0 && (
              <p className="text-white/60 text-sm mt-1">with {trip.companions.join(", ")}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b border-white/10 bg-black/30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex gap-6 overflow-x-auto">
          <div className="flex items-center gap-2 text-white/70 text-sm flex-shrink-0">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>{nights} nights</span>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-sm flex-shrink-0">
            <MapPin className="w-4 h-4 text-green-400" />
            <span>{trip.places.length} places</span>
          </div>
          {trip.companions.length > 0 && (
            <div className="flex items-center gap-2 text-white/70 text-sm flex-shrink-0">
              <Users className="w-4 h-4 text-yellow-400" />
              <span>{trip.companions.length + 1} travellers</span>
            </div>
          )}
          {totalCost > 0 && (
            <div className="flex items-center gap-2 text-white/70 text-sm flex-shrink-0">
              <DollarSign className="w-4 h-4 text-purple-400" />
              <span>{formatCurrency(totalCost, trip.currency)}</span>
            </div>
          )}
        </div>
      </div>

      {trip.summary && (
        <div className="max-w-4xl mx-auto px-6 py-6">
          <p className="text-white/70 text-base leading-relaxed italic">"{trip.summary}"</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 pb-12">
        <Tabs defaultValue="gallery">
          <TabsList className="bg-white/5 border border-white/10 mb-6 flex-wrap">
            <TabsTrigger value="gallery" className="data-[state=active]:bg-white/10">
              <Camera className="w-3.5 h-3.5 mr-1.5" /> Gallery
            </TabsTrigger>
            <TabsTrigger value="itinerary" className="data-[state=active]:bg-white/10">
              <List className="w-3.5 h-3.5 mr-1.5" /> Itinerary
            </TabsTrigger>
            <TabsTrigger value="route" className="data-[state=active]:bg-white/10">
              <Route className="w-3.5 h-3.5 mr-1.5" /> Route
            </TabsTrigger>
            <TabsTrigger value="costs" className="data-[state=active]:bg-white/10">
              <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Costs
            </TabsTrigger>
            <TabsTrigger value="story" className="data-[state=active]:bg-white/10">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Story
            </TabsTrigger>
          </TabsList>

          {/* Gallery */}
          <TabsContent value="gallery">
            {/* Google Photos picker bar */}
            <div className="mb-4 flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📸</span>
                <div>
                  <p className="text-sm font-medium text-white">Google Photos</p>
                  <p className="text-xs text-white/40">
                    {pickerPolling
                      ? "Waiting for you to pick photos in Google… close the picker when done"
                      : googleConnected
                      ? "Pick photos from your Google Photos to add to this trip"
                      : "Connect Google Photos in Settings"}
                  </p>
                </div>
              </div>
              {googleConnected ? (
                <button
                  onClick={openGooglePicker}
                  disabled={pickerLoading || pickerPolling}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium text-white flex-shrink-0"
                >
                  {(pickerLoading || pickerPolling) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>↓</span>}
                  {pickerLoading ? "Opening…" : pickerPolling ? "Waiting…" : "Pick Photos"}
                </button>
              ) : (
                <a href="/settings" className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0">
                  Connect →
                </a>
              )}
            </div>

            {pickerResult && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm border ${
                pickerResult.imported > 0
                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                  : "bg-white/5 border-white/10 text-white/50"
              }`}>
                {pickerResult.message ?? `${pickerResult.selected} photos selected → ${pickerResult.imported} imported`}
              </div>
            )}

            <PhotoUpload tripId={trip.id} media={trip.media} onUploaded={() => fetchTrip(id).then(setTrip).catch(() => {})} />
          </TabsContent>

          {/* Itinerary */}
          <TabsContent value="itinerary">
            <div className="space-y-4">
              {Object.entries(itineraryByDate).sort().map(([date, items]) => (
                <div key={date}>
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">{formatDate(date)}</p>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const Icon = item.transportMode ? TRANSPORT_ICONS[item.transportMode] : null;
                      return (
                        <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            {Icon && <div className="mt-0.5 p-1.5 bg-white/10 rounded-lg"><Icon className="w-3.5 h-3.5 text-white/60" /></div>}
                            <div className="flex-1">
                              <p className="text-white font-medium text-sm">{item.title}</p>
                              {item.description && <p className="text-white/50 text-xs mt-1">{item.description}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {trip.itineraryItems.length === 0 && (
                <div className="text-center py-16 text-white/30"><List className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No itinerary added yet</p></div>
              )}
            </div>
          </TabsContent>

          {/* Route */}
          <TabsContent value="route">
            <div className="space-y-2">
              {[...trip.places].sort((a, b) => a.orderIndex - b.orderIndex).map((place, i) => (
                <div key={place.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: color }}>{i + 1}</div>
                    {i < trip.places.length - 1 && <div className="w-0.5 h-8 bg-white/10 mt-1" />}
                  </div>
                  <div className="pb-6">
                    <p className="text-white font-medium">{place.name}</p>
                    <p className="text-white/40 text-xs">{place.city}, {place.country}</p>
                    {place.visitDate && <p className="text-white/30 text-xs mt-0.5">{formatDate(place.visitDate)}</p>}
                  </div>
                </div>
              ))}
              {trip.places.length === 0 && (
                <div className="text-center py-16 text-white/30"><Route className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No places added yet</p></div>
              )}
            </div>
          </TabsContent>

          {/* Costs */}
          <TabsContent value="costs">
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex justify-between items-center">
                <div>
                  <p className="text-white/50 text-sm">Total Trip Cost</p>
                  <p className="text-white text-3xl font-bold">{formatCurrency(totalCost, trip.currency)}</p>
                </div>
                {trip.companions.length > 0 && (
                  <div className="text-right">
                    <p className="text-white/50 text-xs">Per person</p>
                    <p className="text-white text-lg font-semibold">{formatCurrency(totalCost / (trip.companions.length + 1), trip.currency)}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(byCategory).map(([cat, amount]) => (
                  <div key={cat} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{COST_CATEGORY_ICONS[cat]}</span>
                      <span className="text-white/60 text-xs capitalize">{cat}</span>
                    </div>
                    <p className="text-white font-semibold">{formatCurrency(amount, trip.currency)}</p>
                    <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(amount / totalCost) * 100}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-white/30 text-xs mt-1">{Math.round((amount / totalCost) * 100)}% of total</p>
                  </div>
                ))}
              </div>
              {totalCost > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                  <p className="text-white/60 text-sm">Cost per day</p>
                  <p className="text-white font-semibold">{formatCurrency(totalCost / nights, trip.currency)}</p>
                </div>
              )}
              {trip.costItems.length === 0 && (
                <div className="text-center py-16 text-white/30"><DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No costs recorded yet</p></div>
              )}
            </div>
          </TabsContent>

          {/* AI Story */}
          <TabsContent value="story">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">AI Travel Story</h3>
                  <p className="text-sm text-white/50">Let AI craft a vivid journal entry from your trip data.</p>
                </div>
                <button
                  onClick={generateStory}
                  disabled={storyLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {storyLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {storyLoading ? "Generating..." : storyboard ? "Regenerate" : "Generate Story"}
                </button>
              </div>

              {storyError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                  {storyError}
                </div>
              )}

              {!storyboard && !storyLoading && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                  <Sparkles className="w-12 h-12 text-purple-400/50 mx-auto mb-4" />
                  <p className="text-white/40">Click &quot;Generate Story&quot; to create an AI-crafted travel journal from your trip details.</p>
                </div>
              )}

              {storyLoading && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                  <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
                  <p className="text-white/40">Crafting your travel story...</p>
                </div>
              )}

              {storyboard && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">Trip Summary</h4>
                    <div className="space-y-3">
                      {storyboard.tripSummary.split("\n\n").map((para, i) => (
                        <p key={i} className="text-white/80 leading-relaxed">{para}</p>
                      ))}
                    </div>
                  </div>

                  {/* Day by day */}
                  {storyboard.dayByDay.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-4">Day by Day</h4>
                      <div className="space-y-4">
                        {storyboard.dayByDay.map((day, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-300">
                              {i + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{day.title}</p>
                              <p className="text-white/60 text-sm mt-0.5">{day.story}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grid: food + sights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {storyboard.foodHighlights.length > 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                        <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">🍜 Food Highlights</h4>
                        <ul className="space-y-1.5">
                          {storyboard.foodHighlights.map((f, i) => (
                            <li key={i} className="text-white/70 text-sm">• {f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {storyboard.sightsVisited.length > 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                        <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">🏛️ Sights &amp; Experiences</h4>
                        <ul className="space-y-1.5">
                          {storyboard.sightsVisited.map((s, i) => (
                            <li key={i} className="text-white/70 text-sm">• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Best memories */}
                  {storyboard.bestMemories.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">✨ Best Memories</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {storyboard.bestMemories.map((m, i) => (
                          <div key={i} className="bg-white/5 rounded-lg p-3 text-sm text-white/70 italic">
                            &ldquo;{m}&rdquo;
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Travel tips */}
                  {storyboard.travelTips.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                      <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">💡 Travel Tips</h4>
                      <ul className="space-y-2">
                        {storyboard.travelTips.map((tip, i) => (
                          <li key={i} className="text-white/70 text-sm flex gap-2">
                            <span className="text-purple-400 font-bold">{i + 1}.</span> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested captions */}
                  {storyboard.suggestedCaptions.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                      <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">📸 Suggested Captions</h4>
                      <div className="space-y-3">
                        {storyboard.suggestedCaptions.map((c, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <span className="text-white/30 text-xs mt-0.5 flex-shrink-0">{c.description}</span>
                            <span className="text-white/70 text-sm italic">&ldquo;{c.caption}&rdquo;</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PhotoUpload({ tripId, media, onUploaded }: {
  tripId: string;
  media: Trip["media"];
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("tripId", tripId);
      if (caption) form.append("caption", caption);
      await fetch("/api/upload", { method: "POST", body: form });
      setCaption("");
      onUploaded();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-white/20 transition-colors">
        <input
          id="photo-upload"
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <label htmlFor="photo-upload" className="cursor-pointer block">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-white/50 text-sm">Uploading…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Camera className="w-8 h-8 text-white/30" />
              <p className="text-white/50 text-sm">Click to add a photo or video</p>
              <p className="text-white/30 text-xs">JPG, PNG, MP4 up to 50MB</p>
            </div>
          )}
        </label>
        {!uploading && (
          <input
            type="text"
            placeholder="Optional caption…"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="mt-3 w-full max-w-xs mx-auto block bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-white/30"
            onClick={(e) => e.preventDefault()}
          />
        )}
      </div>

      {/* Gallery grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {media.map((m) => (
          <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer">
            <Image
              src={m.thumbnailUrl ?? m.fileUrl}
              alt={m.caption ?? "Travel photo"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized={m.fileUrl.startsWith("/")}
            />
            {m.caption && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <p className="text-white text-xs p-3 translate-y-full group-hover:translate-y-0 transition-transform">{m.caption}</p>
              </div>
            )}
          </div>
        ))}
        {media.length === 0 && !uploading && (
          <div className="col-span-3 text-center py-8 text-white/30">
            <p className="text-sm">No photos yet — upload one above</p>
          </div>
        )}
      </div>
    </div>
  );
}
