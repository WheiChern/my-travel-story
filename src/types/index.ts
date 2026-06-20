export type TripType = "family" | "solo" | "special_someone" | "friends" | "business" | "other";
export type MediaSource = "google_photos" | "facebook" | "manual_upload" | "takeout_import";
export type MediaType = "photo" | "video";
export type TransportMode = "flight" | "train" | "bus" | "car" | "ferry" | "walk" | "bike" | "other";
export type CostCategory = "flights" | "hotels" | "transport" | "food" | "attractions" | "shopping" | "insurance" | "other";

export interface Place {
  id: string;
  tripId: string;
  name: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  visitDate?: string;
  orderIndex: number;
  notes?: string;
}

export interface Media {
  id: string;
  tripId: string;
  placeId?: string;
  source: MediaSource;
  fileUrl: string;
  thumbnailUrl?: string;
  mediaType: MediaType;
  takenAt?: string;
  caption?: string;
  peopleTags: string[];
}

export interface ItineraryItem {
  id: string;
  tripId: string;
  date: string;
  time?: string;
  title: string;
  description?: string;
  placeId?: string;
  transportMode?: TransportMode;
  costEstimate?: number;
}

export interface CostItem {
  id: string;
  tripId: string;
  category: CostCategory;
  description: string;
  amount: number;
  currency: string;
  date?: string;
}

export interface Trip {
  id: string;
  userId: string;
  title: string;
  startDate: string;
  endDate: string;
  tripType: TripType;
  primaryCountry?: string;
  summary?: string;
  totalCost?: number;
  currency: string;
  companions: string[];
  places: Place[];
  media: Media[];
  itineraryItems: ItineraryItem[];
  costItems: CostItem[];
}

export interface WishlistDestination {
  id: string;
  userId: string;
  destinationCity: string;
  destinationCountry: string;
  originCity?: string;
  preferredStartDate?: string;
  preferredEndDate?: string;
  cabinClass: string;
  maxPrice?: number;
  currency: string;
  notes?: string;
  alertEnabled: boolean;
}

export const TRIP_TYPE_COLORS: Record<TripType, string> = {
  family: "#f59e0b",
  solo: "#3b82f6",
  special_someone: "#ec4899",
  friends: "#10b981",
  business: "#6366f1",
  other: "#6b7280",
};

export const TRIP_TYPE_EMOJI: Record<TripType, string> = {
  family: "👨‍👩‍👧",
  solo: "🧳",
  special_someone: "💕",
  friends: "🎉",
  business: "💼",
  other: "✈️",
};

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  family: "Family",
  solo: "Solo",
  special_someone: "Special Someone",
  friends: "Friends",
  business: "Business",
  other: "Other",
};
