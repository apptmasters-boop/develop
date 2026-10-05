import type { Listing } from "@apptmasters/types";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

// Public endpoint: no auth header needed
export async function getListings(query = ""): Promise<Listing[]> {
  try {
    const res = await fetch(`${API_URL}/api/listings${query}`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}
