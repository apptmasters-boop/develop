export type ListingType =
  | "private_room"
  | "shared_room"
  | "room_in_apartment"
  | "community_home"
  | "roommate_wanted";

export type ListingTag =
  | "verified_people"
  | "community_match"
  | "affordable"
  | "quiet_home"
  | "same_language"
  | "furnished"
  | "utilities_included";

export interface Listing {
  id: string;
  ownerUserId: string;
  title: string;
  description: string | null;
  listingType: ListingType;
  neighborhood: string;
  city: string;
  state: string;
  priceCents: number;
  sharedExpensesCents: number;
  roommatesCount: number;
  bathroomsCount: number;
  maxOccupants: number;
  availableFrom: string;
  minStayMonths: number;
  photos: string[];
  verified: boolean;
  tags: ListingTag[];
  ratingAvg: number | null; // placeholder until reviews exist
  staysCount: number | null; // placeholder until reviews exist
  status: "active" | "inactive";
  createdAt: string;
}
