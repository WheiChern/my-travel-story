"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRIP_TYPE_LABELS, TRIP_TYPE_COLORS, type TripType } from "@/types";
import { createTrip } from "@/lib/api";
import { ArrowLeft, Plus, X, Loader2 } from "lucide-react";

export default function NewTripPage() {
  const router = useRouter();
  const [tripType, setTripType] = useState<TripType>("other");
  const [companions, setCompanions] = useState<string[]>([]);
  const [companionInput, setCompanionInput] = useState("");
  const [places, setPlaces] = useState([{ city: "", country: "" }]);
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCompanion = () => {
    if (companionInput.trim()) {
      setCompanions([...companions, companionInput.trim()]);
      setCompanionInput("");
    }
  };

  const addPlace = () => setPlaces([...places, { city: "", country: "" }]);
  const updatePlace = (i: number, field: "city" | "country", value: string) => {
    const updated = [...places];
    updated[i][field] = value;
    setPlaces(updated);
  };
  const removePlace = (i: number) => setPlaces(places.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    try {
      const trip = await createTrip({
        title: form.get("title") as string,
        startDate: form.get("startDate") as string,
        endDate: form.get("endDate") as string,
        tripType,
        primaryCountry: places[0]?.country || undefined,
        summary: form.get("summary") as string || undefined,
        totalCost: form.get("totalCost") ? Number(form.get("totalCost")) : undefined,
        currency,
        companions,
        places: places.filter((p) => p.city && p.country) as never,
      });
      router.push(`/trips/${trip.id}`);
    } catch (err) {
      setError("Failed to save trip. Please try again.");
      setSaving(false);
    }
  };

  const color = TRIP_TYPE_COLORS[tripType];

  return (
    <div className="min-h-screen bg-gray-950 pb-16">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-white/50 hover:text-white transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-white mb-8">Add a New Trip</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trip type */}
          <div>
            <Label className="text-white/70 mb-3 block">Trip Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(TRIP_TYPE_LABELS) as [TripType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTripType(type)}
                  className="py-2 px-3 rounded-xl text-sm border-2 transition-all text-left"
                  style={
                    tripType === type
                      ? { borderColor: TRIP_TYPE_COLORS[type], backgroundColor: `${TRIP_TYPE_COLORS[type]}20`, color: "white" }
                      : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-white/70 mb-1.5 block">Trip Title *</Label>
            <Input name="title" id="title" required placeholder="e.g. Japan Family Trip, December 2024"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30" />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-white/70 mb-1.5 block">Start Date *</Label>
              <Input name="startDate" id="startDate" type="date" required
                className="bg-white/5 border-white/10 text-white focus:border-white/30" />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-white/70 mb-1.5 block">End Date *</Label>
              <Input name="endDate" id="endDate" type="date" required
                className="bg-white/5 border-white/10 text-white focus:border-white/30" />
            </div>
          </div>

          {/* Places */}
          <div>
            <Label className="text-white/70 mb-3 block">Places Visited</Label>
            <div className="space-y-2">
              {places.map((place, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: color }}>
                    {i + 1}
                  </div>
                  <Input placeholder="City" value={place.city} onChange={(e) => updatePlace(i, "city", e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  <Input placeholder="Country" value={place.country} onChange={(e) => updatePlace(i, "country", e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  {places.length > 1 && (
                    <button type="button" onClick={() => removePlace(i)} className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addPlace} className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm transition-colors">
                <Plus className="w-4 h-4" /> Add another place
              </button>
            </div>
          </div>

          {/* Companions */}
          <div>
            <Label className="text-white/70 mb-1.5 block">Travel Companions</Label>
            <div className="flex gap-2 mb-2">
              <Input placeholder="Add a name…" value={companionInput}
                onChange={(e) => setCompanionInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCompanion())}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              <Button type="button" variant="outline" onClick={addCompanion}
                className="border-white/10 text-white hover:bg-white/10">Add</Button>
            </div>
            {companions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {companions.map((c, i) => (
                  <span key={i} className="flex items-center gap-1 bg-white/10 text-white text-xs px-2.5 py-1 rounded-full">
                    {c}
                    <button type="button" onClick={() => setCompanions(companions.filter((_, idx) => idx !== i))} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div>
            <Label htmlFor="summary" className="text-white/70 mb-1.5 block">Trip Summary</Label>
            <Textarea name="summary" id="summary" placeholder="A short description of this trip…" rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none" />
          </div>

          {/* Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalCost" className="text-white/70 mb-1.5 block">Total Cost (optional)</Label>
              <Input name="totalCost" id="totalCost" type="number" min="0" step="0.01" placeholder="0"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
            <div>
              <Label className="text-white/70 mb-1.5 block">Currency</Label>
              <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10 text-white">
                  {["USD", "EUR", "GBP", "SGD", "JPY", "AUD", "CAD"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={saving} className="flex-1 text-white font-semibold py-2.5" style={{ backgroundColor: color }}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save Trip"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}
              className="border-white/10 text-white/60 hover:bg-white/5">Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
