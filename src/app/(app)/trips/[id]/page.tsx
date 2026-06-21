"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchTrip } from "@/lib/api";
import { MOCK_TRIPS } from "@/lib/mock-data";
import { Trip, TRIP_TYPE_COLORS, TRIP_TYPE_LABELS } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, MapPin, Calendar, Users, DollarSign,
  Camera, Route, List, Plane, Train, Bus, Car, Ship, PersonStanding,
  Loader2, Trash2, Sparkles, Edit2, Check, X, Video, Upload,
  Play, Pause, Download, ImageIcon, RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { deleteTrip } from "@/lib/api";
import dynamic from "next/dynamic";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false, loading: () => (
  <div className="flex items-center justify-center h-full rounded-2xl" style={{ background: "rgba(248,245,240,0.04)", border: "1px solid rgba(200,155,115,0.12)" }}>
    <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#C89B73" }} />
  </div>
) });

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

// ── Sidebar nav items ──────────────────────────────────────────────────────
type SidePanel = "google" | "upload" | "video";

const SIDEBAR_ITEMS: { id: SidePanel; icon: React.ElementType; label: string }[] = [
  { id: "google",  icon: ImageIcon, label: "Google Photos" },
  { id: "upload",  icon: Upload,    label: "Upload" },
  { id: "video",   icon: Video,     label: "Edit Video" },
];

// ── CSS-based slideshow player (no canvas/CORS issues) ────────────────────
function SlideshowPlayer({ photos, tripTitle, captions, speed = 4 }: {
  photos: Trip["media"];
  tripTitle: string;
  captions?: { description: string; caption: string }[];
  speed?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback((dir: 1 | -1 = 1) => {
    setTransitioning(true);
    setTimeout(() => {
      setIdx(i => (i + dir + photos.length) % photos.length);
      setTransitioning(false);
    }, 400);
  }, [photos.length]);

  useEffect(() => {
    if (!playing || photos.length <= 1) return;
    timerRef.current = setTimeout(() => advance(1), speed * 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [idx, playing, speed, photos.length, advance]);

  if (!photos.length) {
    return (
      <div className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-3"
        style={{ background: "#1a1a1a", border: "1px solid rgba(200,155,115,0.12)", minHeight: 400 }}>
        <Camera className="w-12 h-12 opacity-20" style={{ color: "#C89B73" }} />
        <p className="text-sm" style={{ color: "rgba(248,245,240,0.3)" }}>Pick or upload photos to create your video</p>
      </div>
    );
  }

  const caption = captions?.[idx % Math.max(1, captions.length)]?.caption
    ?? (photos[idx]?.caption ?? "");

  return (
    <div className="flex-1 flex flex-col gap-3">
      {/* Player */}
      <div className="relative rounded-2xl overflow-hidden select-none"
        style={{ background: "#111", aspectRatio: "16/10" }}>

        {/* Images — stack all, show only active */}
        {photos.map((photo, i) => {
          // Public blob URLs load directly; lh3 URLs need server-side proxy with OAuth token
          const src = photo.fileUrl.includes("lh3.googleusercontent.com")
            ? `/api/image-proxy/${photo.id}`
            : photo.fileUrl;
          return (
            <div key={photo.id}
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: i === idx ? (transitioning ? 0 : 1) : 0, zIndex: i === idx ? 1 : 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={photo.caption ?? `Photo ${i + 1}`}
                className="w-full h-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
          );
        })}

        {/* Bottom gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          zIndex: 2,
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)"
        }} />

        {/* Title + Caption */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-center pointer-events-none" style={{ zIndex: 3 }}>
          <p className="text-xs font-bold tracking-widest mb-1" style={{ color: "#C89B73", letterSpacing: "0.18em" }}>
            {tripTitle.toUpperCase()}
          </p>
          {caption && (
            <p className="text-sm italic leading-snug" style={{ color: "rgba(248,245,240,0.85)", maxWidth: 480, margin: "0 auto" }}>
              "{caption}"
            </p>
          )}
        </div>

        {/* Prev / Next arrows */}
        {photos.length > 1 && (
          <>
            <button onClick={() => advance(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-100 opacity-40"
              style={{ zIndex: 4, background: "rgba(34,34,34,0.7)", color: "#F8F5F0", fontSize: 18 }}>‹</button>
            <button onClick={() => advance(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-100 opacity-40"
              style={{ zIndex: 4, background: "rgba(34,34,34,0.7)", color: "#F8F5F0", fontSize: 18 }}>›</button>
          </>
        )}

        {/* Play/Pause */}
        <button onClick={() => setPlaying(p => !p)}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-100 opacity-50"
          style={{ zIndex: 4, background: "rgba(34,34,34,0.8)", color: "#F8F5F0" }}>
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Slide counter */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none" style={{ zIndex: 4 }}>
          {photos.slice(0, 20).map((_, di) => (
            <div key={di} className="rounded-full transition-all duration-300"
              style={{ width: di === idx ? 16 : 5, height: 5, background: di === idx ? "#C89B73" : "rgba(248,245,240,0.3)" }} />
          ))}
          {photos.length > 20 && <span className="text-xs" style={{ color: "rgba(248,245,240,0.4)" }}>+{photos.length - 20}</span>}
        </div>
      </div>

      {/* Photo count */}
      <p className="text-xs text-center" style={{ color: "rgba(248,245,240,0.3)" }}>
        {idx + 1} / {photos.length} photos
      </p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [editedSummary, setEditedSummary] = useState("");
  const [editingStory, setEditingStory] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerPolling, setPickerPolling] = useState(false);
  const [pickerResult, setPickerResult] = useState<{ imported: number; selected: number; message?: string } | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [activePanel, setActivePanel] = useState<SidePanel | null>(null);
  const [videoSpeed, setVideoSpeed] = useState(4);
  const [uploading, setUploading] = useState(false);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [savingCaption, setSavingCaption] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<StoryboardData>>({});
  const [editingTrip, setEditingTrip] = useState(false);
  const [tripDraft, setTripDraft] = useState<{ title: string; startDate: string; endDate: string; tripType: string; companions: string; currency: string; summary: string }>({ title: "", startDate: "", endDate: "", tripType: "", companions: "", currency: "", summary: "" });
  const [savingTrip, setSavingTrip] = useState(false);

  useEffect(() => {
    fetch("/api/google-photos/status").then(r => r.json()).then(d => setGoogleConnected(d.connected));
  }, []);

  useEffect(() => {
    fetchTrip(id)
      .then(t => {
        setTrip(t);
        const initial: Record<string, string> = {};
        t.media.forEach(m => { initial[m.id] = m.caption ?? ""; });
        setCaptions(initial);
      })
      .catch(() => setTrip(MOCK_TRIPS.find(t => t.id === id) ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  const saveCaption = async (mediaId: string) => {
    setSavingCaption(mediaId);
    try {
      await fetch(`/api/media/${mediaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: captions[mediaId] ?? "" }),
      });
      setTrip(t => t ? {
        ...t,
        media: t.media.map(m => m.id === mediaId ? { ...m, caption: captions[mediaId] ?? "" } : m),
      } : t);
    } finally {
      setSavingCaption(null);
    }
  };

  const openTripEdit = () => {
    if (!trip) return;
    setTripDraft({
      title: trip.title,
      startDate: trip.startDate.split("T")[0],
      endDate: trip.endDate.split("T")[0],
      tripType: trip.tripType,
      companions: trip.companions.join(", "),
      currency: trip.currency,
      summary: trip.summary ?? "",
    });
    setEditingTrip(true);
  };

  const saveTripEdit = async () => {
    if (!trip) return;
    setSavingTrip(true);
    try {
      const companions = tripDraft.companions.split(",").map(s => s.trim()).filter(Boolean);
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tripDraft, companions }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();
      setTrip(updated);
      setEditingTrip(false);
    } finally {
      setSavingTrip(false);
    }
  };

  const startEdit = (section: string) => {
    if (!storyboard) return;
    setEditDraft({ ...storyboard });
    setEditingSection(section);
  };
  const saveEdit = () => {
    if (!storyboard) return;
    setStoryboard({ ...storyboard, ...editDraft });
    setEditingSection(null);
  };
  const cancelEdit = () => setEditingSection(null);

  const openGooglePicker = async () => {
    // If not connected, send user to connect flow
    if (!googleConnected) {
      window.location.href = `/api/google-photos/auth?returnTo=/trips/${id}`;
      return;
    }
    setPickerLoading(true);
    setPickerResult(null);
    try {
      const res = await fetch("/api/google-photos/picker-session", { method: "POST" });
      let data: Record<string, string> = {};
      try { data = await res.json(); } catch { /* empty body */ }
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
      // Open picker — use location.href if popup is blocked
      const popup = window.open(data.pickerUri, "_blank", "width=1000,height=700");
      if (!popup) window.location.href = data.pickerUri;
      setPickerPolling(true);
      const sessionId = data.sessionId;
      const poll = async () => {
        try {
          const pr = await fetch(`/api/google-photos/picker-session?sessionId=${sessionId}`);
          const pd = await pr.json();
          if (pd.mediaItemsSet) {
            setPickerPolling(false);
            const ir = await fetch("/api/google-photos/picker-import", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tripId: id, sessionId }),
            });
            const id2 = await ir.json();
            if (!ir.ok) throw new Error(id2.error ?? "Import failed");
            setPickerResult(id2);
            if (id2.imported > 0) fetchTrip(id).then(setTrip).catch(() => {});
          } else { setTimeout(poll, 3000); }
        } catch (e) {
          setPickerPolling(false);
          setPickerResult({ imported: 0, selected: 0, message: e instanceof Error ? e.message : "Import failed" });
        }
      };
      setTimeout(poll, 3000);
    } catch (e) {
      setPickerResult({ imported: 0, selected: 0, message: e instanceof Error ? e.message : "Failed" });
    } finally { setPickerLoading(false); }
  };

  const generateStory = async () => {
    setStoryLoading(true);
    setStoryError(null);
    try {
      const res = await fetch("/api/ai/storyboard", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: id }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { error?: string }).error ?? "Failed"); }
      const data = await res.json() as StoryboardData;
      setStoryboard(data);
      setEditedSummary(data.tripSummary);
      // Auto-save AI summary as the trip's intro paragraph if none exists
      if (!trip?.summary) await saveSummary(data.tripSummary);
    } catch (e) { setStoryError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setStoryLoading(false); }
  };

  const saveSummary = async (text: string) => {
    setSavingSummary(true);
    try {
      await fetch(`/api/trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: text }),
      });
      setTrip(t => t ? { ...t, summary: text } : t);
      setEditingStory(false);
    } finally { setSavingSummary(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !trip) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("tripId", trip.id);
    await fetch("/api/upload", { method: "POST", body: form });
    fetchTrip(id).then(setTrip).catch(() => {});
    setUploading(false);
    e.target.value = "";
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#222" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#C89B73" }} />
    </div>
  );

  if (!trip) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#222" }}>
      <div className="text-center">
        <p className="text-xl mb-4" style={{ color: "#F8F5F0" }}>Trip not found</p>
        <button onClick={() => router.push("/dashboard")} style={{ color: "#C89B73" }}>← Back</button>
      </div>
    </div>
  );

  const color = TRIP_TYPE_COLORS[trip.tripType];
  const totalCost = trip.costItems.reduce((s, c) => s + c.amount, 0);
  const byCategory = trip.costItems.reduce<Record<string, number>>((a, c) => ({ ...a, [c.category]: (a[c.category] ?? 0) + c.amount }), {});
  const nights = Math.max(1, Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000));
  const itineraryByDate = trip.itineraryItems.reduce<Record<string, typeof trip.itineraryItems>>((a, item) => {
    const d = item.date.split("T")[0]; return { ...a, [d]: [...(a[d] ?? []), item] };
  }, {});

  const togglePanel = (p: SidePanel) => {
    if (p === "google") { openGooglePicker(); return; }
    if (p === "upload") { document.getElementById("file-upload-hidden")?.click(); return; }
    setActivePanel(prev => prev === p ? null : p);
  };

  return (
    <div className="min-h-screen" style={{ background: "#222", color: "#F8F5F0" }}>
      {/* Hero */}
      <div className="relative h-48 overflow-hidden" style={{ background: "#1e1e1e" }}>
        {trip.media[0] && (
          <Image src={trip.media[0].fileUrl} alt={trip.title} fill className="object-cover opacity-30" unoptimized />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #222 0%, rgba(34,34,34,0.4) 60%, transparent 100%)" }} />
        <div className="absolute inset-0 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: "rgba(248,245,240,0.7)" }}>
              <ArrowLeft className="w-4 h-4" /><span className="text-sm">Back</span>
            </button>
            <button onClick={async () => { if (!confirm("Delete this trip?")) return; await deleteTrip(id); router.push("/dashboard"); }}
              className="p-2 rounded-lg" style={{ background: "rgba(220,38,38,0.2)", color: "#f87171" }}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>{TRIP_TYPE_LABELS[trip.tripType]}</span>
              <span className="text-xs" style={{ color: "rgba(248,245,240,0.4)" }}>{formatDate(trip.startDate)} — {formatDate(trip.endDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold" style={{ color: "#F8F5F0" }}>{trip.title}</h1>
              <button onClick={openTripEdit} title="Edit trip details"
                className="p-1.5 rounded-lg transition-opacity hover:opacity-80 flex-shrink-0"
                style={{ background: "rgba(200,155,115,0.15)", color: "#C89B73" }}>
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {trip.companions.length > 0 && <p className="text-sm mt-0.5" style={{ color: "rgba(248,245,240,0.45)" }}>with {trip.companions.join(", ")}</p>}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b" style={{ borderColor: "rgba(200,155,115,0.12)", background: "rgba(34,34,34,0.98)" }}>
        <div className="max-w-5xl mx-auto px-5 py-2.5 flex gap-5 overflow-x-auto">
          {[
            { icon: Calendar, val: `${nights} nights` },
            { icon: MapPin,   val: `${trip.places.length} places` },
            ...(trip.companions.length ? [{ icon: Users, val: `${trip.companions.length + 1} travellers` }] : []),
            ...(totalCost > 0 ? [{ icon: DollarSign, val: formatCurrency(totalCost, trip.currency) }] : []),
          ].map(({ icon: Icon, val }) => (
            <div key={val} className="flex items-center gap-1.5 text-sm flex-shrink-0" style={{ color: "rgba(248,245,240,0.6)" }}>
              <Icon className="w-3.5 h-3.5" style={{ color: "#C89B73" }} />{val}
            </div>
          ))}
        </div>
      </div>

      {trip.summary && (
        <div className="max-w-5xl mx-auto px-5 py-4">
          <p className="leading-relaxed italic" style={{ color: "rgba(248,245,240,0.55)", fontSize: "0.95rem" }}>"{trip.summary}"</p>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-5 pb-16">
        <Tabs defaultValue="gallery">
          <TabsList className="mb-5 flex-wrap" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.13)" }}>
            {[
              { v: "gallery",   I: Camera,      l: "Gallery" },
              { v: "itinerary", I: List,        l: "Itinerary" },
              { v: "route",     I: Route,       l: "Route" },
              { v: "costs",     I: DollarSign,  l: "Costs" },
              { v: "story",     I: Sparkles,    l: "Story" },
            ].map(({ v, I, l }) => (
              <TabsTrigger key={v} value={v}
                className="data-[state=active]:text-[#C89B73] data-[state=inactive]:text-[rgba(248,245,240,0.4)]"
                style={{ fontSize: "0.8rem" }}>
                <I className="w-3.5 h-3.5 mr-1.5" />{l}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ═══ GALLERY / VIDEO TAB ═══════════════════════════════════════ */}
          <TabsContent value="gallery">
            {/* Hidden file input */}
            <input id="file-upload-hidden" type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />

            <div className="flex gap-4">
              {/* ── Left sidebar (4 functions) ──────────────────────────── */}
              <div className="flex flex-col gap-2" style={{ width: 52 }}>
                {SIDEBAR_ITEMS.map(({ id: sid, icon: Icon, label }) => {
                  const isActive = activePanel === sid;
                  const isBusy = sid === "google" && (pickerLoading || pickerPolling);
                  return (
                    <div key={sid} className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => !isBusy && togglePanel(sid)}
                        title={label}
                        className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                        style={{
                          background: isActive ? "rgba(200,155,115,0.2)" : "rgba(248,245,240,0.06)",
                          border: `1px solid ${isActive ? "rgba(200,155,115,0.4)" : "rgba(200,155,115,0.12)"}`,
                          color: isActive ? "#C89B73" : "rgba(248,245,240,0.5)",
                        }}
                      >
                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                      </button>
                      <span className="text-center leading-tight" style={{ fontSize: "0.6rem", color: "rgba(248,245,240,0.35)", maxWidth: 48 }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* ── Main area ───────────────────────────────────────────── */}
              <div className="flex-1 flex flex-col gap-4">

                {/* Google picker status */}
                {pickerResult && (
                  <div className="rounded-xl px-4 py-2.5 text-sm flex items-center justify-between"
                    style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.15)" }}>
                    <span style={{ color: pickerResult.imported > 0 ? "#86efac" : "rgba(248,245,240,0.45)" }}>
                      {pickerResult.message ?? `${pickerResult.imported} photos imported from Google Photos`}
                    </span>
                    <button onClick={() => setPickerResult(null)} style={{ color: "rgba(248,245,240,0.3)" }}><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}

                {/* Upload status */}
                {uploading && (
                  <div className="rounded-xl px-4 py-2.5 text-sm flex items-center gap-2"
                    style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#C89B73" }} />
                    <span style={{ color: "rgba(248,245,240,0.5)" }}>Uploading…</span>
                  </div>
                )}

                {/* Video settings panel */}
                {activePanel === "video" && (
                  <div className="rounded-2xl p-5" style={{ background: "rgba(248,245,240,0.04)", border: "1px solid rgba(200,155,115,0.18)" }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold" style={{ color: "#F8F5F0" }}>Edit Video</h3>
                      <button onClick={() => setActivePanel(null)} style={{ color: "rgba(248,245,240,0.35)" }}><X className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-5">
                      {/* Speed */}
                      <div>
                        <label className="text-xs font-medium uppercase tracking-wider block mb-2" style={{ color: "#C89B73" }}>
                          Seconds per photo: {videoSpeed}s
                        </label>
                        <input type="range" min={2} max={8} step={1} value={videoSpeed}
                          onChange={e => setVideoSpeed(Number(e.target.value))}
                          className="w-full accent-[#C89B73]" />
                        <div className="flex justify-between text-xs mt-1" style={{ color: "rgba(248,245,240,0.3)" }}>
                          <span>Fast (2s)</span><span>Slow (8s)</span>
                        </div>
                      </div>

                      {/* Per-photo caption editor */}
                      <div>
                        <label className="text-xs font-medium uppercase tracking-wider block mb-3" style={{ color: "#C89B73" }}>
                          Photo Captions ({trip.media.length})
                        </label>
                        {trip.media.length === 0 ? (
                          <p className="text-xs" style={{ color: "rgba(248,245,240,0.35)" }}>
                            No photos yet — import from Google Photos or upload.
                          </p>
                        ) : (
                          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                            {trip.media.map((photo, i) => (
                              <div key={photo.id} className="flex gap-3 items-start">
                                {/* Thumbnail */}
                                <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden relative"
                                  style={{ background: "#111" }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={photo.fileUrl.includes("lh3.googleusercontent.com")
                                      ? `/api/image-proxy/${photo.id}`
                                      : photo.fileUrl}
                                    alt={`Photo ${i + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 text-center text-white"
                                    style={{ fontSize: "0.55rem", background: "rgba(0,0,0,0.5)", padding: "1px 0" }}>
                                    {i + 1}
                                  </div>
                                </div>
                                {/* Caption input + save */}
                                <div className="flex-1 flex gap-1.5">
                                  <textarea
                                    rows={2}
                                    placeholder="Add a caption…"
                                    value={captions[photo.id] ?? ""}
                                    onChange={e => setCaptions(c => ({ ...c, [photo.id]: e.target.value }))}
                                    className="flex-1 rounded-lg px-2.5 py-1.5 text-xs leading-snug resize-none focus:outline-none"
                                    style={{
                                      background: "rgba(248,245,240,0.07)",
                                      border: "1px solid rgba(200,155,115,0.2)",
                                      color: "#F8F5F0",
                                    }}
                                  />
                                  <button
                                    onClick={() => saveCaption(photo.id)}
                                    disabled={savingCaption === photo.id}
                                    className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-lg flex items-center justify-center disabled:opacity-40"
                                    style={{ background: "rgba(200,155,115,0.2)", color: "#C89B73" }}
                                    title="Save caption"
                                  >
                                    {savingCaption === photo.id
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <Check className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Video player (always shown) */}
                <SlideshowPlayer
                  photos={trip.media}
                  tripTitle={trip.title}
                  captions={storyboard?.suggestedCaptions}
                  speed={videoSpeed}
                />
              </div>
            </div>
          </TabsContent>

          {/* ═══ ITINERARY ═══════════════════════════════════════════════════ */}
          <TabsContent value="itinerary">
            <div className="space-y-4">
              {Object.entries(itineraryByDate).sort().map(([date, items]) => (
                <div key={date}>
                  <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "rgba(248,245,240,0.35)" }}>{formatDate(date)}</p>
                  <div className="space-y-2">
                    {items.map(item => {
                      const Icon = item.transportMode ? TRANSPORT_ICONS[item.transportMode] : null;
                      return (
                        <div key={item.id} className="rounded-xl p-4" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                          <div className="flex items-start gap-3">
                            {Icon && <div className="mt-0.5 p-1.5 rounded-lg" style={{ background: "rgba(248,245,240,0.08)" }}><Icon className="w-3.5 h-3.5" style={{ color: "rgba(248,245,240,0.45)" }} /></div>}
                            <div>
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

          {/* ═══ ROUTE ═══════════════════════════════════════════════════════ */}
          <TabsContent value="route">
            {trip.places.length === 0 ? (
              <div className="text-center py-16" style={{ color: "rgba(248,245,240,0.25)" }}>
                <Route className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No places added yet</p>
              </div>
            ) : (
              <div className="flex gap-5" style={{ minHeight: 520 }}>
                {/* Left — route list */}
                <div className="w-56 flex-shrink-0 overflow-y-auto space-y-0 pr-1" style={{ maxHeight: 560 }}>
                  {[...trip.places].sort((a, b) => a.orderIndex - b.orderIndex).map((place, i) => (
                    <div key={place.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>{i + 1}</div>
                        {i < trip.places.length - 1 && <div className="w-0.5 flex-1 my-1" style={{ background: "rgba(248,245,240,0.1)", minHeight: 20 }} />}
                      </div>
                      <div className="pb-4 pt-0.5">
                        <p className="font-medium text-sm leading-tight" style={{ color: "#F8F5F0" }}>{place.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(248,245,240,0.4)" }}>{place.city}, {place.country}</p>
                        {place.visitDate && <p className="text-xs mt-0.5" style={{ color: "rgba(248,245,240,0.28)" }}>{formatDate(place.visitDate)}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right — map */}
                <div className="flex-1 rounded-2xl overflow-hidden" style={{ minHeight: 520 }}>
                  <RouteMap places={trip.places} color={color} />
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══ COSTS ═══════════════════════════════════════════════════════ */}
          <TabsContent value="costs">
            <div className="space-y-4">
              <div className="rounded-xl p-5 flex justify-between items-center" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.15)" }}>
                <div>
                  <p className="text-sm" style={{ color: "rgba(248,245,240,0.5)" }}>Total Trip Cost</p>
                  <p className="text-3xl font-bold" style={{ color: "#F8F5F0" }}>{formatCurrency(totalCost, trip.currency)}</p>
                </div>
                {trip.companions.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs" style={{ color: "rgba(248,245,240,0.45)" }}>Per person</p>
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
                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(248,245,240,0.08)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(amount / totalCost) * 100}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: "rgba(248,245,240,0.3)" }}>{Math.round((amount / totalCost) * 100)}%</p>
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

          {/* ═══ STORY ═══════════════════════════════════════════════════════ */}
          <TabsContent value="story">
            <div className="space-y-5">
              {/* Editable intro paragraph (trip.summary) */}
              <div className="rounded-xl p-5" style={{ background: "rgba(248,245,240,0.04)", border: "1px solid rgba(200,155,115,0.15)" }}>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C89B73" }}>Intro Paragraph</label>
                  {!editingStory && (
                    <button onClick={() => { setEditingStory(true); setEditedSummary(trip.summary ?? ""); }}
                      className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
                      style={{ color: "rgba(248,245,240,0.4)" }}>
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  )}
                </div>
                {editingStory ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedSummary}
                      onChange={e => setEditedSummary(e.target.value)}
                      rows={6}
                      className="w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed resize-y focus:outline-none"
                      style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.25)", color: "#F8F5F0" }}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveSummary(editedSummary)} disabled={savingSummary}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                        style={{ background: "#C89B73", color: "#222" }}>
                        {savingSummary ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                      </button>
                      <button onClick={() => setEditingStory(false)}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{ background: "rgba(248,245,240,0.07)", color: "rgba(248,245,240,0.4)" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="leading-relaxed italic" style={{ color: "rgba(248,245,240,0.6)", fontSize: "0.95rem" }}>
                    {trip.summary ? `"${trip.summary}"` : <span style={{ color: "rgba(248,245,240,0.25)" }}>No intro paragraph yet. Click Edit to add one, or generate an AI story below.</span>}
                  </p>
                )}
              </div>

              {/* AI storyboard section */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold" style={{ color: "#F8F5F0" }}>AI Travel Story</h3>
                <button onClick={generateStory} disabled={storyLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
                  style={{ background: "#C89B73", color: "#222" }}>
                  {storyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {storyLoading ? "Generating…" : storyboard ? "Regenerate" : "Generate Story"}
                </button>
              </div>
              {storyError && <div className="rounded-lg p-4 text-sm" style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#f87171" }}>{storyError}</div>}
              {!storyboard && !storyLoading && (
                <div className="rounded-xl p-12 text-center" style={{ background: "rgba(248,245,240,0.04)", border: "1px solid rgba(200,155,115,0.12)" }}>
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: "#C89B73" }} />
                  <p style={{ color: "rgba(248,245,240,0.3)" }}>Click "Generate Story" to craft an AI travel journal.</p>
                </div>
              )}
              {storyLoading && (
                <div className="rounded-xl p-12 text-center" style={{ background: "rgba(248,245,240,0.04)" }}>
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: "#C89B73" }} />
                  <p style={{ color: "rgba(248,245,240,0.4)" }}>Crafting your travel story…</p>
                </div>
              )}
              {storyboard && (
                <div className="space-y-5">

                  {/* ── Trip Summary ── */}
                  <div className="rounded-xl p-6" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.15)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C89B73" }}>Trip Summary</h4>
                      {editingSection !== "summary"
                        ? <button onClick={() => startEdit("summary")} className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{ color: "rgba(248,245,240,0.4)" }}><Edit2 className="w-3 h-3" /> Edit</button>
                        : <div className="flex gap-2">
                            <button onClick={saveEdit} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "#C89B73", color: "#222" }}><Check className="w-3 h-3" /> Save</button>
                            <button onClick={cancelEdit} className="px-2.5 py-1 rounded-lg text-xs" style={{ background: "rgba(248,245,240,0.07)", color: "rgba(248,245,240,0.4)" }}>Cancel</button>
                          </div>
                      }
                    </div>
                    {editingSection === "summary" ? (
                      <textarea
                        rows={10}
                        value={editDraft.tripSummary ?? ""}
                        onChange={e => setEditDraft(d => ({ ...d, tripSummary: e.target.value }))}
                        className="w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed resize-y focus:outline-none"
                        style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.25)", color: "#F8F5F0" }}
                      />
                    ) : (
                      storyboard.tripSummary.split("\n\n").map((p, i) => (
                        <p key={i} className="leading-relaxed mb-2" style={{ color: "rgba(248,245,240,0.75)" }}>{p}</p>
                      ))
                    )}
                  </div>

                  {/* ── Day by Day ── */}
                  {(storyboard.dayByDay.length > 0 || editingSection === "dayByDay") && (
                    <div className="rounded-xl p-6" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C89B73" }}>Day by Day</h4>
                        {editingSection !== "dayByDay"
                          ? <button onClick={() => startEdit("dayByDay")} className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{ color: "rgba(248,245,240,0.4)" }}><Edit2 className="w-3 h-3" /> Edit</button>
                          : <div className="flex gap-2">
                              <button onClick={saveEdit} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "#C89B73", color: "#222" }}><Check className="w-3 h-3" /> Save</button>
                              <button onClick={cancelEdit} className="px-2.5 py-1 rounded-lg text-xs" style={{ background: "rgba(248,245,240,0.07)", color: "rgba(248,245,240,0.4)" }}>Cancel</button>
                            </div>
                        }
                      </div>
                      {editingSection === "dayByDay" ? (
                        <div className="space-y-4">
                          {(editDraft.dayByDay ?? []).map((day, i) => (
                            <div key={i} className="flex gap-3 items-start">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1" style={{ background: "rgba(200,155,115,0.18)", color: "#C89B73" }}>{i + 1}</div>
                              <div className="flex-1 space-y-1.5">
                                <input
                                  value={day.title}
                                  onChange={e => setEditDraft(d => ({ ...d, dayByDay: (d.dayByDay ?? []).map((dd, ii) => ii === i ? { ...dd, title: e.target.value } : dd) }))}
                                  placeholder="Day title"
                                  className="w-full rounded-lg px-2.5 py-1.5 text-sm font-medium focus:outline-none"
                                  style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.2)", color: "#F8F5F0" }}
                                />
                                <textarea
                                  rows={3}
                                  value={day.story}
                                  onChange={e => setEditDraft(d => ({ ...d, dayByDay: (d.dayByDay ?? []).map((dd, ii) => ii === i ? { ...dd, story: e.target.value } : dd) }))}
                                  placeholder="What happened this day…"
                                  className="w-full rounded-lg px-2.5 py-1.5 text-sm resize-y focus:outline-none"
                                  style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.2)", color: "rgba(248,245,240,0.75)" }}
                                />
                              </div>
                              <button onClick={() => setEditDraft(d => ({ ...d, dayByDay: (d.dayByDay ?? []).filter((_, ii) => ii !== i) }))}
                                className="mt-1 flex-shrink-0 transition-opacity hover:opacity-70" style={{ color: "rgba(248,245,240,0.3)" }}><X className="w-4 h-4" /></button>
                            </div>
                          ))}
                          <button onClick={() => setEditDraft(d => ({ ...d, dayByDay: [...(d.dayByDay ?? []), { date: "", title: "New Day", story: "" }] }))}
                            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70 mt-1"
                            style={{ color: "#C89B73" }}>
                            <span className="text-base leading-none">+</span> Add day
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {storyboard.dayByDay.map((day, i) => (
                            <div key={i} className="flex gap-3">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(200,155,115,0.18)", color: "#C89B73" }}>{i + 1}</div>
                              <div>
                                <p className="font-medium text-sm" style={{ color: "#F8F5F0" }}>{day.title}</p>
                                <p className="text-sm mt-0.5" style={{ color: "rgba(248,245,240,0.55)" }}>{day.story}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Food & Sights ── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Food Highlights */}
                    {(storyboard.foodHighlights.length > 0 || editingSection === "food") && (
                      <div className="rounded-xl p-5" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C89B73" }}>🍜 Food Highlights</h4>
                          {editingSection !== "food"
                            ? <button onClick={() => startEdit("food")} className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{ color: "rgba(248,245,240,0.4)" }}><Edit2 className="w-3 h-3" /> Edit</button>
                            : <div className="flex gap-2">
                                <button onClick={saveEdit} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "#C89B73", color: "#222" }}><Check className="w-3 h-3" /> Save</button>
                                <button onClick={cancelEdit} className="px-2.5 py-1 rounded-lg text-xs" style={{ background: "rgba(248,245,240,0.07)", color: "rgba(248,245,240,0.4)" }}>Cancel</button>
                              </div>
                          }
                        </div>
                        {editingSection === "food" ? (
                          <div className="space-y-2">
                            {(editDraft.foodHighlights ?? []).map((item, i) => (
                              <div key={i} className="flex gap-2 items-start">
                                <textarea rows={2} value={item}
                                  onChange={e => setEditDraft(d => ({ ...d, foodHighlights: (d.foodHighlights ?? []).map((x, ii) => ii === i ? e.target.value : x) }))}
                                  className="flex-1 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none"
                                  style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.2)", color: "#F8F5F0" }}
                                />
                                <button onClick={() => setEditDraft(d => ({ ...d, foodHighlights: (d.foodHighlights ?? []).filter((_, ii) => ii !== i) }))}
                                  style={{ color: "rgba(248,245,240,0.3)" }}><X className="w-3.5 h-3.5 mt-2" /></button>
                              </div>
                            ))}
                            <button onClick={() => setEditDraft(d => ({ ...d, foodHighlights: [...(d.foodHighlights ?? []), ""] }))}
                              className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{ color: "#C89B73" }}>
                              <span className="text-base leading-none">+</span> Add item
                            </button>
                          </div>
                        ) : (
                          <ul className="space-y-1.5">{storyboard.foodHighlights.map((f, i) => <li key={i} className="text-sm" style={{ color: "rgba(248,245,240,0.65)" }}>• {f}</li>)}</ul>
                        )}
                      </div>
                    )}

                    {/* Sights */}
                    {(storyboard.sightsVisited.length > 0 || editingSection === "sights") && (
                      <div className="rounded-xl p-5" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C89B73" }}>🏛️ Sights</h4>
                          {editingSection !== "sights"
                            ? <button onClick={() => startEdit("sights")} className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{ color: "rgba(248,245,240,0.4)" }}><Edit2 className="w-3 h-3" /> Edit</button>
                            : <div className="flex gap-2">
                                <button onClick={saveEdit} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "#C89B73", color: "#222" }}><Check className="w-3 h-3" /> Save</button>
                                <button onClick={cancelEdit} className="px-2.5 py-1 rounded-lg text-xs" style={{ background: "rgba(248,245,240,0.07)", color: "rgba(248,245,240,0.4)" }}>Cancel</button>
                              </div>
                          }
                        </div>
                        {editingSection === "sights" ? (
                          <div className="space-y-2">
                            {(editDraft.sightsVisited ?? []).map((item, i) => (
                              <div key={i} className="flex gap-2 items-start">
                                <textarea rows={2} value={item}
                                  onChange={e => setEditDraft(d => ({ ...d, sightsVisited: (d.sightsVisited ?? []).map((x, ii) => ii === i ? e.target.value : x) }))}
                                  className="flex-1 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none"
                                  style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.2)", color: "#F8F5F0" }}
                                />
                                <button onClick={() => setEditDraft(d => ({ ...d, sightsVisited: (d.sightsVisited ?? []).filter((_, ii) => ii !== i) }))}
                                  style={{ color: "rgba(248,245,240,0.3)" }}><X className="w-3.5 h-3.5 mt-2" /></button>
                              </div>
                            ))}
                            <button onClick={() => setEditDraft(d => ({ ...d, sightsVisited: [...(d.sightsVisited ?? []), ""] }))}
                              className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{ color: "#C89B73" }}>
                              <span className="text-base leading-none">+</span> Add item
                            </button>
                          </div>
                        ) : (
                          <ul className="space-y-1.5">{storyboard.sightsVisited.map((s, i) => <li key={i} className="text-sm" style={{ color: "rgba(248,245,240,0.65)" }}>• {s}</li>)}</ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Best Memories ── */}
                  {(storyboard.bestMemories.length > 0 || editingSection === "memories") && (
                    <div className="rounded-xl p-6" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C89B73" }}>✨ Best Memories</h4>
                        {editingSection !== "memories"
                          ? <button onClick={() => startEdit("memories")} className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{ color: "rgba(248,245,240,0.4)" }}><Edit2 className="w-3 h-3" /> Edit</button>
                          : <div className="flex gap-2">
                              <button onClick={saveEdit} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "#C89B73", color: "#222" }}><Check className="w-3 h-3" /> Save</button>
                              <button onClick={cancelEdit} className="px-2.5 py-1 rounded-lg text-xs" style={{ background: "rgba(248,245,240,0.07)", color: "rgba(248,245,240,0.4)" }}>Cancel</button>
                            </div>
                        }
                      </div>
                      {editingSection === "memories" ? (
                        <div className="space-y-2">
                          {(editDraft.bestMemories ?? []).map((item, i) => (
                            <div key={i} className="flex gap-2 items-start">
                              <textarea rows={2} value={item}
                                onChange={e => setEditDraft(d => ({ ...d, bestMemories: (d.bestMemories ?? []).map((x, ii) => ii === i ? e.target.value : x) }))}
                                className="flex-1 rounded-lg px-2.5 py-1.5 text-sm italic resize-none focus:outline-none"
                                style={{ background: "rgba(200,155,115,0.07)", border: "1px solid rgba(200,155,115,0.2)", color: "#F8F5F0" }}
                              />
                              <button onClick={() => setEditDraft(d => ({ ...d, bestMemories: (d.bestMemories ?? []).filter((_, ii) => ii !== i) }))}
                                style={{ color: "rgba(248,245,240,0.3)" }}><X className="w-3.5 h-3.5 mt-2" /></button>
                            </div>
                          ))}
                          <button onClick={() => setEditDraft(d => ({ ...d, bestMemories: [...(d.bestMemories ?? []), ""] }))}
                            className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{ color: "#C89B73" }}>
                            <span className="text-base leading-none">+</span> Add memory
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {storyboard.bestMemories.map((m, i) => (
                            <div key={i} className="rounded-lg p-3 text-sm italic" style={{ background: "rgba(200,155,115,0.07)", color: "rgba(248,245,240,0.65)" }}>"{m}"</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Travel Tips ── */}
                  {(storyboard.travelTips.length > 0 || editingSection === "tips") && (
                    <div className="rounded-xl p-5" style={{ background: "rgba(248,245,240,0.05)", border: "1px solid rgba(200,155,115,0.12)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C89B73" }}>💡 Travel Tips</h4>
                        {editingSection !== "tips"
                          ? <button onClick={() => startEdit("tips")} className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{ color: "rgba(248,245,240,0.4)" }}><Edit2 className="w-3 h-3" /> Edit</button>
                          : <div className="flex gap-2">
                              <button onClick={saveEdit} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "#C89B73", color: "#222" }}><Check className="w-3 h-3" /> Save</button>
                              <button onClick={cancelEdit} className="px-2.5 py-1 rounded-lg text-xs" style={{ background: "rgba(248,245,240,0.07)", color: "rgba(248,245,240,0.4)" }}>Cancel</button>
                            </div>
                        }
                      </div>
                      {editingSection === "tips" ? (
                        <div className="space-y-2">
                          {(editDraft.travelTips ?? []).map((item, i) => (
                            <div key={i} className="flex gap-2 items-start">
                              <span className="font-bold text-sm flex-shrink-0 mt-2" style={{ color: "#C89B73" }}>{i + 1}.</span>
                              <textarea rows={2} value={item}
                                onChange={e => setEditDraft(d => ({ ...d, travelTips: (d.travelTips ?? []).map((x, ii) => ii === i ? e.target.value : x) }))}
                                className="flex-1 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none"
                                style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.2)", color: "#F8F5F0" }}
                              />
                              <button onClick={() => setEditDraft(d => ({ ...d, travelTips: (d.travelTips ?? []).filter((_, ii) => ii !== i) }))}
                                style={{ color: "rgba(248,245,240,0.3)" }}><X className="w-3.5 h-3.5 mt-2" /></button>
                            </div>
                          ))}
                          <button onClick={() => setEditDraft(d => ({ ...d, travelTips: [...(d.travelTips ?? []), ""] }))}
                            className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{ color: "#C89B73" }}>
                            <span className="text-base leading-none">+</span> Add tip
                          </button>
                        </div>
                      ) : (
                        <ul className="space-y-2">{storyboard.travelTips.map((tip, i) => (
                          <li key={i} className="text-sm flex gap-2" style={{ color: "rgba(248,245,240,0.65)" }}>
                            <span className="font-bold flex-shrink-0" style={{ color: "#C89B73" }}>{i + 1}.</span>{tip}
                          </li>
                        ))}</ul>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Edit Trip Panel ── */}
      {editingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]"
            style={{ background: "#2a2a2a", border: "1px solid rgba(200,155,115,0.25)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg" style={{ color: "#F8F5F0" }}>Edit Trip Details</h2>
              <button onClick={() => setEditingTrip(false)} style={{ color: "rgba(248,245,240,0.4)" }}><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider block mb-1" style={{ color: "#C89B73" }}>Trip Title</label>
              <input value={tripDraft.title} onChange={e => setTripDraft(d => ({ ...d, title: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.2)", color: "#F8F5F0" }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider block mb-1" style={{ color: "#C89B73" }}>Start Date</label>
                <input type="date" value={tripDraft.startDate} onChange={e => setTripDraft(d => ({ ...d, startDate: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.2)", color: "#F8F5F0" }} />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider block mb-1" style={{ color: "#C89B73" }}>End Date</label>
                <input type="date" value={tripDraft.endDate} onChange={e => setTripDraft(d => ({ ...d, endDate: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.2)", color: "#F8F5F0" }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider block mb-1" style={{ color: "#C89B73" }}>Trip Type</label>
                <select value={tripDraft.tripType} onChange={e => setTripDraft(d => ({ ...d, tripType: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.2)", color: "#F8F5F0" }}>
                  {Object.entries(TRIP_TYPE_LABELS).map(([k, v]) => <option key={k} value={k} style={{ background: "#2a2a2a" }}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider block mb-1" style={{ color: "#C89B73" }}>Currency</label>
                <input value={tripDraft.currency} onChange={e => setTripDraft(d => ({ ...d, currency: e.target.value.toUpperCase().slice(0, 3) }))}
                  placeholder="SGD"
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.2)", color: "#F8F5F0" }} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider block mb-1" style={{ color: "#C89B73" }}>
                Travel Companions <span style={{ color: "rgba(248,245,240,0.35)", textTransform: "none", fontSize: "0.7rem" }}>(comma-separated)</span>
              </label>
              <input value={tripDraft.companions} onChange={e => setTripDraft(d => ({ ...d, companions: e.target.value }))}
                placeholder="Alice, Bob, Carol"
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.2)", color: "#F8F5F0" }} />
              <p className="text-xs mt-1" style={{ color: "rgba(248,245,240,0.3)" }}>
                {tripDraft.companions.split(",").filter(s => s.trim()).length + 1} travellers total (including you)
              </p>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider block mb-1" style={{ color: "#C89B73" }}>Trip Summary</label>
              <textarea rows={3} value={tripDraft.summary} onChange={e => setTripDraft(d => ({ ...d, summary: e.target.value }))}
                placeholder="A short description of this trip…"
                className="w-full rounded-xl px-3 py-2 text-sm leading-relaxed resize-y focus:outline-none"
                style={{ background: "rgba(248,245,240,0.07)", border: "1px solid rgba(200,155,115,0.2)", color: "#F8F5F0" }} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingTrip(false)}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background: "rgba(248,245,240,0.07)", color: "rgba(248,245,240,0.5)" }}>
                Cancel
              </button>
              <button onClick={saveTripEdit} disabled={savingTrip}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "#C89B73", color: "#222" }}>
                {savingTrip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {savingTrip ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
