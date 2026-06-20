"use client";

import { useEffect, useState } from "react";
import { fetchWishlist, createWishlistItem, updateWishlistItem, deleteWishlistItem } from "@/lib/api";
import type { WishlistDestination } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Bell, BellOff, Plus, X, Plane, Loader2 } from "lucide-react";

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    destinationCity: "", destinationCountry: "", originCity: "",
    preferredStartDate: "", maxPrice: "", currency: "USD",
    cabinClass: "economy", notes: "",
  });

  const load = async () => {
    try {
      const data = await fetchWishlist();
      setWishlist(data);
    } catch {
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleAlert = async (item: WishlistDestination) => {
    const updated = { ...item, alertEnabled: !item.alertEnabled };
    setWishlist(wishlist.map((w) => w.id === item.id ? updated : w));
    try {
      await updateWishlistItem(item.id, { alertEnabled: updated.alertEnabled });
    } catch {
      setWishlist(wishlist); // revert
    }
  };

  const removeItem = async (id: string) => {
    setWishlist(wishlist.filter((w) => w.id !== id));
    try { await deleteWishlistItem(id); } catch { load(); }
  };

  const handleSave = async () => {
    if (!form.destinationCity || !form.destinationCountry) return;
    setSaving(true);
    try {
      const item = await createWishlistItem({
        ...form,
        maxPrice: form.maxPrice ? parseFloat(form.maxPrice) : undefined,
        alertEnabled: true,
      } as Partial<WishlistDestination>);
      setWishlist([item, ...wishlist]);
      setShowForm(false);
      setForm({ destinationCity: "", destinationCountry: "", originCity: "", preferredStartDate: "", maxPrice: "", currency: "USD", cabinClass: "economy", notes: "" });
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-16">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Wishlist</h1>
            <p className="text-white/40 text-sm mt-1">Places you dream of visiting</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Add Destination
          </Button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-white font-semibold mb-4">New Destination</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/60 mb-1 block text-xs">Destination City *</Label>
                  <Input value={form.destinationCity} onChange={(e) => setForm({ ...form, destinationCity: e.target.value })}
                    placeholder="e.g. Santorini" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <div>
                  <Label className="text-white/60 mb-1 block text-xs">Country *</Label>
                  <Input value={form.destinationCountry} onChange={(e) => setForm({ ...form, destinationCountry: e.target.value })}
                    placeholder="e.g. Greece" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/60 mb-1 block text-xs">Flying From</Label>
                  <Input value={form.originCity} onChange={(e) => setForm({ ...form, originCity: e.target.value })}
                    placeholder="e.g. Singapore" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <div>
                  <Label className="text-white/60 mb-1 block text-xs">Cabin Class</Label>
                  <Select value={form.cabinClass} onValueChange={(v) => v && setForm({ ...form, cabinClass: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10 text-white">
                      <SelectItem value="economy">Economy</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="first">First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/60 mb-1 block text-xs">Earliest Travel</Label>
                  <Input type="date" value={form.preferredStartDate} onChange={(e) => setForm({ ...form, preferredStartDate: e.target.value })}
                    className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-white/60 mb-1 block text-xs">Max Budget (USD)</Label>
                  <Input type="number" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })}
                    placeholder="1000" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
              </div>
              <div>
                <Label className="text-white/60 mb-1 block text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Why do you want to go here?" rows={2}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none" />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {saving ? "Saving…" : "Save Destination"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)} className="border-white/10 text-white/60 hover:bg-white/5">Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {wishlist.map((item) => (
              <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-purple-400" />
                      <h3 className="text-white font-semibold">{item.destinationCity}, {item.destinationCountry}</h3>
                    </div>
                    <div className="flex flex-wrap gap-3 text-white/40 text-xs mt-2">
                      {item.originCity && <span className="flex items-center gap-1"><Plane className="w-3 h-3" /> From {item.originCity}</span>}
                      <span className="capitalize">{item.cabinClass}</span>
                      {item.maxPrice && <span>Budget: {item.currency} {item.maxPrice.toLocaleString()}</span>}
                      {item.preferredStartDate && <span>{formatDate(item.preferredStartDate)}</span>}
                    </div>
                    {item.notes && <p className="text-white/50 text-sm mt-3 italic">"{item.notes}"</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleAlert(item)}
                      className={`p-2 rounded-lg transition-colors ${item.alertEnabled ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : "bg-white/5 text-white/30 hover:bg-white/10"}`}
                      title={item.alertEnabled ? "Fare alerts on" : "Fare alerts off"}>
                      {item.alertEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => removeItem(item.id)}
                      className="p-2 rounded-lg bg-white/5 text-white/30 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {item.alertEnabled && item.maxPrice && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-white/40">
                    <Bell className="w-3 h-3 text-purple-400" />
                    <span>Fare alerts active — you'll be notified when prices drop below {item.currency} {item.maxPrice.toLocaleString()}</span>
                  </div>
                )}
              </div>
            ))}
            {wishlist.length === 0 && (
              <div className="text-center py-20 text-white/30">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg">No wishlist destinations yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
