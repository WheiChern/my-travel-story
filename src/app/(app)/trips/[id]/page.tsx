"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchTrip } from "@/lib/api";
import { MOCK_TRIPS } from "@/lib/mock-data";
import { Trip, TRIP_TYPE_COLORS, TRIP_TYPE_LABELS, type CostCategory } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, MapPin, Calendar, Users, DollarSign,
  Camera, Route, List, Plane, Train, Bus, Car, Ship, PersonStanding,
  Loader2, Trash2, Sparkles, Edit2, Check, X, Video, Upload, Image as ImageIcon,
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
  const [editingStory, setEditingStory] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerPolling, setPickerPolling] = useState(false);
  const [pickerResult, setPickerResult] = useState<{ imported: number; selected: number; message?: string } | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    fetch("/api/google-photos/status").then(r => r.json()).then(d => setGoogleConnected(d.connected));
  }, []);

  useEffect(() => {
    fetchTrip(id)
      .then(setTrip)
      .catch(() => { setTrip(MOCK_TRIPS.find((t) => t.id === id) ?? null); })
      .finally(() => setLoading(false));
  }, [id]);

  const openGooglePicker = async () => {
    setPickerLoading(true);
    setPickerResult(null);
    try {
      const res = await fetch("/api/google-photos/picker-session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start picker");
      window.open(data.pickerUri, "_blank");
      setPickerPolling(true);
      const sessionId = data.sessionId;
      const poll = async () => {
        try {
          const pollRes = await fetch(`/api/google-photos/picker-session?sessionId=${sessionId}`);
          const pollData = await pollRes.json();
          if (pollData.mediaItemsSet) {
            setPickerPolling(false);
            const importRes = await fetch("/api/google-photos/picker-import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tripId: id, sessionId }),
            });
            const importData = await importRes.json();
            if (!importRes.ok) throw new Error(importData.error ?? "Import failed");
            setPickerResult(importData);
            if (importData.imported > 0) fetchTrip(id).then(setTrip).catch(() => {});
          } else {
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
        throw new Error((err as { error?: string }).error ?? "Generation failed");
      }
      const data = await res.json() as StoryboardData;
      setStoryboard(data);
      setEditedSummary(data.tripSummary);
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#222222" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#C89B73" }} />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#222222" }}>
        <div className="text-center">
          <p className="text-xl mb-4" style={{ color: "#F8F5F0" }}>Trip not found</p>
          <button onClick={() => router.push("/dashboard")} style={{ color: "#C89B73" }}>← Back to map</button>
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
    <div className="min-h-screen" style={{ background: "#222222", color: "#F8F5F0" }}>
      {/* Hero */}
      <div className="relative h-56 overflow-hidden" style={{ background: "#2e2e2e" }}>
        {trip.media[0] && (
          <Image src={trip.media[0].fileUrl} alt={trip.title} fill className="object-cover opacity-40" unoptimized />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #222222 0%, rgba(34,34,34,0.5) 60%, transparent 100%)" }} />
        <div className="absolute inset-0 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: "rgba(248,245,240,0.7)" }}>
              <ArrowLeft className="w-4 h-4" /><span className="text-sm">Back</span>
            </button>
            <button onClick={handleDelete} className="p-2 rounded-lg transition-colors" style={{ background: "rgba(220,38,38,0.2)", color: "#f87171" }}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
                {TRIP_TYPE_LABELS[trip.tripType]}
              </span>
              <span className="text-xs" style={{ color: "rgba(248,245,240,0.4)" }}>{formatDate(trip.startDate)} — {formatDate(trip.endDate)}</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: "#F8F5F0" }}>{trip.title}</h1>
            {trip.companions.length > 0 && (
              <p className="text-sm mt-1" style={{ color: "rgba(248,245,240,0.5)" }}>with {trip.companions.join(", ")}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b" style={{ borderColor: "rgba(200,155,115,0.15)", background: "rgba(34,34,34,0.95)" }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex gap-6 overflow-x-auto">
          <div className="flex items-center gap-2 text-sm flex-shrink-0" style={{ color: "rgba(248,245,240,0.6)" }}>
            <Calendar className="w-4 h-4" style={{ color: "#C89B73" }} /><span>{nights} nights</span>
          </div>
          <div className="flex items-center gap-2 text-sm flex-shrink-0" style={{ color: "rgba(248,245,240,0.6)" }}>
            <MapPin className="w-4 h-4" style={{ color: "#C89B73" }} /><span>{trip.places.length} places</span>
          </div>
          {trip.companions.length > 0 && (
            <div className="flex items-center gap-2 text-sm flex-shrink-0" style={{ color: "rgba(248,245,240,0.6)" }}>
              <Users className="w-4 h-4" style={{ color: "#C89B73" }} /><span>{trip.companions.length + 1} travellers</span>
            </div>
          )}
          {totalCost > 0 && (
            <div className="flex items-center gap-2 text-sm flex-shrink-0" style={{ color: "rgba(248,245,240,0.6)" }}>
              <DollarSign className="w-4 h-4" style={{ color: "#C89B73" }} /><span>{formatCurrency(totalCost, trip.currency)}</span>
            </div>
          )}
        </div>
      </div>

      {trip.summary && (
        <div className="max-w-5xl mx-auto px-6 py-5">
          <p className="leading-relaxed italic text-base" style={{ color: "rgba(248,245,240,0.6)" }}>"{trip.summary}"</p>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 pb-16">
        <Tabs defaultValue="gallery">
          <TabsList className="mb-6 flex-wrap" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.15)" }}>
            {[
              { value: "gallery", icon: Camera, label: "Gallery" },
              { value: "itinerary", icon: List, label: "Itinerary" },
              { value: "route", icon: Route, label: "Route" },
              { value: "costs", icon: DollarSign, label: "Costs" },
              { value: "story", icon: Sparkles, label: "Story" },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger key={value} value={value}
                className="data-[state=active]:text-[#C89B73] data-[state=inactive]:text-[rgba(248,245,240,0.4)]"
                style={{ fontSize: "0.8rem" }}>
                <Icon className="w-3.5 h-3.5 mr-1.5" />{label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Gallery ── */}
          <TabsContent value="gallery">
            <div className="flex gap-5">
              {/* Left action sidebar */}
              <div className="w-44 flex-shrink-0 space-y-2">
                {/* Google Photos */}
                <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">📸</span>
                    <span className="text-xs font-medium" style={{ color: "#F8F5F0" }}>Google Photos</span>
                  </div>
                  {googleConnected ? (
                    <button
                      onClick={openGooglePicker}
                      disabled={pickerLoading || pickerPolling}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
                      style={{ background: "#C89B73", color: "#222222" }}
                    >
                      {(pickerLoading || pickerPolling) ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                      {pickerLoading ? "Opening…" : pickerPolling ? "Waiting…" : "Pick Photos"}
                    </button>
                  ) : (
                    <a href="/settings"
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ background: "rgba(200,155,115,0.15)", color: "#C89B73" }}>
                      Connect →
                    </a>
                  )}
                  {pickerResult && (
                    <p className="text-xs" style={{ color: pickerResult.imported > 0 ? "#86efac" : "rgba(248,245,240,0.4)" }}>
                      {pickerResult.message ?? `${pickerResult.imported} imported`}
                    </p>
                  )}
                </div>

                {/* Upload from device */}
                <div className="rounded-xl p-3" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Upload className="w-3.5 h-3.5" style={{ color: "#C89B73" }} />
                    <span className="text-xs font-medium" style={{ color: "#F8F5F0" }}>Upload</span>
                  </div>
                  <label htmlFor="sidebar-upload"
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-opacity hover:opacity-80"
                    style={{ background: "rgba(200,155,115,0.15)", color: "#C89B73" }}>
                    <Camera className="w-3 h-3" /> Add Photo
                  </label>
                  <input id="sidebar-upload" type="file" accept="image/*,video/*" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const form = new FormData();
                      form.append("file", file);
                      form.append("tripId", trip.id);
                      await fetch("/api/upload", { method: "POST", body: form });
                      fetchTrip(id).then(setTrip).catch(() => {});
                      e.target.value = "";
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: "rgba(248,245,240,0.3)" }}>JPG, PNG, MP4</p>
                </div>

                {/* AI Video */}
                <div className="rounded-xl p-3" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Video className="w-3.5 h-3.5" style={{ color: "#C89B73" }} />
                    <span className="text-xs font-medium" style={{ color: "#F8F5F0" }}>AI Video</span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: "rgba(248,245,240,0.4)" }}>
                    Auto slideshow from your photos with AI captions
                  </p>
                  <VideoGenerator photos={trip.media} tripTitle={trip.title} captions={storyboard?.suggestedCaptions} />
                </div>
              </div>

              {/* Photo grid */}
              <div className="flex-1">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {trip.media.map((m) => (
                    <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer">
                      <Image
                        src={m.fileUrl}
                        alt={m.caption ?? "Travel photo"}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23333'/%3E%3Ctext x='200' y='200' text-anchor='middle' fill='%23666' font-size='14'%3EPhoto expired%3C/text%3E%3C/svg%3E`;
                        }}
                      />
                      {m.caption && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end">
                          <p className="text-white text-xs p-3 translate-y-full group-hover:translate-y-0 transition-transform">{m.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {trip.media.length === 0 && (
                    <div className="col-span-3 text-center py-16" style={{ color: "rgba(248,245,240,0.25)" }}>
                      <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No photos yet — pick from Google Photos or upload above</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Itinerary ── */}
          <TabsContent value="itinerary">
            <div className="space-y-4">
              {Object.entries(itineraryByDate).sort().map(([date, items]) => (
                <div key={date}>
                  <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "rgba(248,245,240,0.35)" }}>{formatDate(date)}</p>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const Icon = item.transportMode ? TRANSPORT_ICONS[item.transportMode] : null;
                      return (
                        <div key={item.id} className="rounded-xl p-4" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                          <div className="flex items-start gap-3">
                            {Icon && <div className="mt-0.5 p-1.5 rounded-lg" style={{ background: "rgba(248,245,240,0.1)" }}><Icon className="w-3.5 h-3.5" style={{ color: "rgba(248,245,240,0.5)" }} /></div>}
                            <div className="flex-1">
                              <p className="font-medium text-sm" style={{ color: "#F8F5F0" }}>{item.title}</p>
                              {item.description && <p className="text-xs mt-1" style={{ color: "rgba(248,245,240,0.45)" }}>{item.description}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {trip.itineraryItems.length === 0 && (
                <div className="text-center py-16" style={{ color: "rgba(248,245,240,0.25)" }}>
                  <List className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No itinerary added yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Route ── */}
          <TabsContent value="route">
            <div className="space-y-2">
              {[...trip.places].sort((a, b) => a.orderIndex - b.orderIndex).map((place, i) => (
                <div key={place.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: color }}>{i + 1}</div>
                    {i < trip.places.length - 1 && <div className="w-0.5 h-8 mt-1" style={{ background: "rgba(248,245,240,0.1)" }} />}
                  </div>
                  <div className="pb-6">
                    <p className="font-medium" style={{ color: "#F8F5F0" }}>{place.name}</p>
                    <p className="text-xs" style={{ color: "rgba(248,245,240,0.4)" }}>{place.city}, {place.country}</p>
                    {place.visitDate && <p className="text-xs mt-0.5" style={{ color: "rgba(248,245,240,0.3)" }}>{formatDate(place.visitDate)}</p>}
                  </div>
                </div>
              ))}
              {trip.places.length === 0 && (
                <div className="text-center py-16" style={{ color: "rgba(248,245,240,0.25)" }}>
                  <Route className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No places added yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Costs ── */}
          <TabsContent value="costs">
            <div className="space-y-4">
              <div className="rounded-xl p-5 flex justify-between items-center" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.15)" }}>
                <div>
                  <p className="text-sm" style={{ color: "rgba(248,245,240,0.5)" }}>Total Trip Cost</p>
                  <p className="text-3xl font-bold" style={{ color: "#F8F5F0" }}>{formatCurrency(totalCost, trip.currency)}</p>
                </div>
                {trip.companions.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs" style={{ color: "rgba(248,245,240,0.5)" }}>Per person</p>
                    <p className="text-lg font-semibold" style={{ color: "#F8F5F0" }}>{formatCurrency(totalCost / (trip.companions.length + 1), trip.currency)}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(byCategory).map(([cat, amount]) => (
                  <div key={cat} className="rounded-xl p-4" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{COST_CATEGORY_ICONS[cat]}</span>
                      <span className="text-xs capitalize" style={{ color: "rgba(248,245,240,0.5)" }}>{cat}</span>
                    </div>
                    <p className="font-semibold" style={{ color: "#F8F5F0" }}>{formatCurrency(amount, trip.currency)}</p>
                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(248,245,240,0.1)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(amount / totalCost) * 100}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: "rgba(248,245,240,0.3)" }}>{Math.round((amount / totalCost) * 100)}% of total</p>
                  </div>
                ))}
              </div>
              {trip.costItems.length === 0 && (
                <div className="text-center py-16" style={{ color: "rgba(248,245,240,0.25)" }}>
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No costs recorded yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── AI Story ── */}
          <TabsContent value="story">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: "#F8F5F0" }}>AI Travel Story</h3>
                  <p className="text-sm" style={{ color: "rgba(248,245,240,0.45)" }}>Craft a vivid journal entry from your trip data.</p>
                </div>
                <button
                  onClick={generateStory}
                  disabled={storyLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
                  style={{ background: "#C89B73", color: "#222222" }}
                >
                  {storyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {storyLoading ? "Generating…" : storyboard ? "Regenerate" : "Generate Story"}
                </button>
              </div>

              {storyError && (
                <div className="rounded-lg p-4 text-sm" style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#f87171" }}>
                  {storyError}
                </div>
              )}

              {!storyboard && !storyLoading && (
                <div className="rounded-xl p-12 text-center" style={{ background: "rgba(248,245,240,0.04)", border: "1px solid rgba(200,155,115,0.12)" }}>
                  <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(200,155,115,0.4)" }} />
                  <p style={{ color: "rgba(248,245,240,0.35)" }}>Click "Generate Story" to create an AI-crafted travel journal from your trip details.</p>
                </div>
              )}

              {storyLoading && (
                <div className="rounded-xl p-12 text-center" style={{ background: "rgba(248,245,240,0.04)", border: "1px solid rgba(200,155,115,0.12)" }}>
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: "#C89B73" }} />
                  <p style={{ color: "rgba(248,245,240,0.4)" }}>Crafting your travel story…</p>
                </div>
              )}

              {storyboard && (
                <div className="space-y-5">
                  {/* Editable summary */}
                  <div className="rounded-xl p-6" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.15)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#C89B73" }}>Trip Summary</h4>
                      {!editingStory ? (
                        <button onClick={() => { setEditingStory(true); setEditedSummary(storyboard.tripSummary); }}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-opacity hover:opacity-70"
                          style={{ color: "rgba(248,245,240,0.4)", background: "rgba(248,245,240,0.06)" }}>
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => { setStoryboard({ ...storyboard, tripSummary: editedSummary }); setEditingStory(false); }}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ background: "rgba(200,155,115,0.2)", color: "#C89B73" }}>
                            <Check className="w-3 h-3" /> Save
                          </button>
                          <button onClick={() => setEditingStory(false)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ background: "rgba(248,245,240,0.06)", color: "rgba(248,245,240,0.4)" }}>
                            <X className="w-3 h-3" /> Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    {editingStory ? (
                      <textarea
                        value={editedSummary}
                        onChange={(e) => setEditedSummary(e.target.value)}
                        rows={8}
                        className="w-full rounded-lg px-3 py-2 text-sm leading-relaxed resize-y focus:outline-none"
                        style={{ background: "rgba(248,245,240,0.06)", border: "1px solid rgba(200,155,115,0.2)", color: "#F8F5F0" }}
                      />
                    ) : (
                      <div className="space-y-3">
                        {storyboard.tripSummary.split("\n\n").map((para, i) => (
                          <p key={i} className="leading-relaxed" style={{ color: "rgba(248,245,240,0.75)" }}>{para}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Day by day */}
                  {storyboard.dayByDay.length > 0 && (
                    <div className="rounded-xl p-6" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                      <h4 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#C89B73" }}>Day by Day</h4>
                      <div className="space-y-4">
                        {storyboard.dayByDay.map((day, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(200,155,115,0.2)", color: "#C89B73" }}>{i + 1}</div>
                            <div>
                              <p className="font-medium text-sm" style={{ color: "#F8F5F0" }}>{day.title}</p>
                              <p className="text-sm mt-0.5" style={{ color: "rgba(248,245,240,0.55)" }}>{day.story}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Food + sights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {storyboard.foodHighlights.length > 0 && (
                      <div className="rounded-xl p-5" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                        <h4 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#C89B73" }}>🍜 Food Highlights</h4>
                        <ul className="space-y-1.5">
                          {storyboard.foodHighlights.map((f, i) => (
                            <li key={i} className="text-sm" style={{ color: "rgba(248,245,240,0.65)" }}>• {f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {storyboard.sightsVisited.length > 0 && (
                      <div className="rounded-xl p-5" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                        <h4 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#C89B73" }}>🏛️ Sights & Experiences</h4>
                        <ul className="space-y-1.5">
                          {storyboard.sightsVisited.map((s, i) => (
                            <li key={i} className="text-sm" style={{ color: "rgba(248,245,240,0.65)" }}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Best memories */}
                  {storyboard.bestMemories.length > 0 && (
                    <div className="rounded-xl p-6" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                      <h4 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#C89B73" }}>✨ Best Memories</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {storyboard.bestMemories.map((m, i) => (
                          <div key={i} className="rounded-lg p-3 text-sm italic" style={{ background: "rgba(200,155,115,0.08)", color: "rgba(248,245,240,0.65)" }}>
                            "{m}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Travel tips */}
                  {storyboard.travelTips.length > 0 && (
                    <div className="rounded-xl p-5" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                      <h4 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#C89B73" }}>💡 Travel Tips</h4>
                      <ul className="space-y-2">
                        {storyboard.travelTips.map((tip, i) => (
                          <li key={i} className="text-sm flex gap-2" style={{ color: "rgba(248,245,240,0.65)" }}>
                            <span className="font-bold flex-shrink-0" style={{ color: "#C89B73" }}>{i + 1}.</span> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested captions */}
                  {storyboard.suggestedCaptions.length > 0 && (
                    <div className="rounded-xl p-5" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                      <h4 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#C89B73" }}>📸 Suggested Captions</h4>
                      <div className="space-y-3">
                        {storyboard.suggestedCaptions.map((c, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: "rgba(248,245,240,0.3)" }}>{c.description}</span>
                            <span className="text-sm italic" style={{ color: "rgba(248,245,240,0.65)" }}>"{c.caption}"</span>
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

function VideoGenerator({ photos, tripTitle, captions }: {
  photos: Trip["media"];
  tripTitle: string;
  captions?: { description: string; caption: string }[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const generateVideo = async () => {
    if (!photos.length) return;
    setGenerating(true);
    setProgress(0);
    setVideoUrl(null);

    try {
      const canvas = canvasRef.current!;
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
        videoBitsPerSecond: 4_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const finished = new Promise<string>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          resolve(URL.createObjectURL(blob));
        };
      });

      recorder.start();

      const SLIDE_DURATION = 3000; // ms per photo
      const FADE_DURATION = 500;

      for (let i = 0; i < photos.length; i++) {
        setProgress(Math.round(((i + 1) / photos.length) * 100));
        const photo = photos[i];
        const caption = captions?.[i % (captions.length || 1)]?.caption ?? `${tripTitle} — Photo ${i + 1}`;

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new window.Image();
          el.crossOrigin = "anonymous";
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = photo.fileUrl;
        }).catch(() => null);

        const start = Date.now();
        while (Date.now() - start < SLIDE_DURATION) {
          const elapsed = Date.now() - start;
          let alpha = 1;
          if (elapsed < FADE_DURATION) alpha = elapsed / FADE_DURATION;
          else if (elapsed > SLIDE_DURATION - FADE_DURATION) alpha = (SLIDE_DURATION - elapsed) / FADE_DURATION;

          ctx.fillStyle = "#111111";
          ctx.fillRect(0, 0, 1080, 1080);

          if (img) {
            ctx.globalAlpha = alpha;
            const aspect = img.naturalWidth / img.naturalHeight;
            let dx = 0, dy = 0, dw = 1080, dh = 1080;
            if (aspect > 1) { dh = 1080 / aspect; dy = (1080 - dh) / 2; }
            else { dw = 1080 * aspect; dx = (1080 - dw) / 2; }
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.globalAlpha = 1;
          }

          // Caption overlay
          ctx.globalAlpha = alpha;
          const grad = ctx.createLinearGradient(0, 820, 0, 1080);
          grad.addColorStop(0, "rgba(0,0,0,0)");
          grad.addColorStop(1, "rgba(0,0,0,0.75)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 820, 1080, 260);

          // Trip title
          ctx.fillStyle = "#C89B73";
          ctx.font = "bold 28px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(tripTitle.toUpperCase(), 540, 920);

          // Caption
          ctx.fillStyle = "#ffffff";
          ctx.font = "italic 36px serif";
          const words = caption.split(" ");
          let line = "";
          let y = 975;
          const lines: string[] = [];
          for (const w of words) {
            const test = line + w + " ";
            if (ctx.measureText(test).width > 900 && line) { lines.push(line.trim()); line = w + " "; }
            else line = test;
          }
          if (line) lines.push(line.trim());
          const lineH = 44;
          lines.slice(0, 2).forEach((l, li) => ctx.fillText(l, 540, y + li * lineH));

          ctx.globalAlpha = 1;
          await new Promise(r => setTimeout(r, 1000 / 30));
        }
      }

      // Hold last frame briefly
      await new Promise(r => setTimeout(r, 500));
      recorder.stop();
      const url = await finished;
      setVideoUrl(url);
    } catch (err) {
      console.error("Video generation error:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} className="hidden" />
      {!generating && !videoUrl && (
        <button
          onClick={generateVideo}
          disabled={photos.length === 0}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: "rgba(200,155,115,0.15)", color: "#C89B73" }}
        >
          <Video className="w-3 h-3" /> Generate
        </button>
      )}
      {generating && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(248,245,240,0.1)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "#C89B73" }} />
          </div>
          <p className="text-xs text-center" style={{ color: "rgba(248,245,240,0.4)" }}>{progress}%</p>
        </div>
      )}
      {videoUrl && (
        <div className="space-y-2">
          <video src={videoUrl} controls className="w-full rounded-lg" style={{ maxHeight: "160px" }} />
          <a href={videoUrl} download={`${tripTitle.replace(/\s+/g, "-")}.webm`}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: "#C89B73", color: "#222222" }}>
            ↓ Download
          </a>
          <button onClick={() => setVideoUrl(null)}
            className="w-full text-xs py-1 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: "rgba(248,245,240,0.35)", background: "rgba(248,245,240,0.05)" }}>
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
