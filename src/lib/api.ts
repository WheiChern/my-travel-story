import { Trip, WishlistDestination } from "@/types";

const USER_ID = "demo-user";

export async function fetchTrips(): Promise<Trip[]> {
  const res = await fetch(`/api/trips?userId=${USER_ID}`);
  if (!res.ok) throw new Error("Failed to fetch trips");
  return res.json();
}

export async function fetchTrip(id: string): Promise<Trip> {
  const res = await fetch(`/api/trips/${id}`);
  if (!res.ok) throw new Error("Failed to fetch trip");
  return res.json();
}

export async function createTrip(data: Partial<Trip> & { userId?: string }): Promise<Trip> {
  const res = await fetch("/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, userId: USER_ID }),
  });
  if (!res.ok) throw new Error("Failed to create trip");
  return res.json();
}

export async function deleteTrip(id: string): Promise<void> {
  await fetch(`/api/trips/${id}`, { method: "DELETE" });
}

export async function fetchWishlist(): Promise<WishlistDestination[]> {
  const res = await fetch(`/api/wishlist?userId=${USER_ID}`);
  if (!res.ok) throw new Error("Failed to fetch wishlist");
  return res.json();
}

export async function createWishlistItem(data: Partial<WishlistDestination>): Promise<WishlistDestination> {
  const res = await fetch("/api/wishlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, userId: USER_ID }),
  });
  if (!res.ok) throw new Error("Failed to create wishlist item");
  return res.json();
}

export async function updateWishlistItem(id: string, data: Partial<WishlistDestination>): Promise<WishlistDestination> {
  const res = await fetch(`/api/wishlist/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update wishlist item");
  return res.json();
}

export async function deleteWishlistItem(id: string): Promise<void> {
  await fetch(`/api/wishlist/${id}`, { method: "DELETE" });
}

export async function uploadPhoto(tripId: string, file: File, caption?: string): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  form.append("tripId", tripId);
  if (caption) form.append("caption", caption);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
}
