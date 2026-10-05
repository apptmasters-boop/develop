import {
  BedDouble, BedSingle, Building2, UsersRound, UserSearch,
  ShieldCheck, Users, CircleDollarSign, Moon, MessageSquareText, Sofa, Zap,
  type LucideIcon,
} from "lucide-react";
import type { ListingTag, ListingType } from "@apptmasters/types";

export const LOOKING_FOR: { value: ListingType; label: string; icon: LucideIcon }[] = [
  { value: "private_room", label: "Private Room", icon: BedDouble },
  { value: "shared_room", label: "Shared Room", icon: BedSingle },
  { value: "room_in_apartment", label: "A Room in an Apartment", icon: Building2 },
  { value: "roommate_wanted", label: "People Looking for Roommates", icon: UserSearch },
  { value: "community_home", label: "Community Home", icon: UsersRound },
];

export const MATTERS: { value: ListingTag; label: string; icon: LucideIcon }[] = [
  { value: "verified_people", label: "Verified people", icon: ShieldCheck },
  { value: "community_match", label: "Community match", icon: Users },
  { value: "affordable", label: "Affordable", icon: CircleDollarSign },
  { value: "quiet_home", label: "Quiet home", icon: Moon },
  { value: "same_language", label: "Same language", icon: MessageSquareText },
  { value: "furnished", label: "Furnished", icon: Sofa },
  { value: "utilities_included", label: "Utilities included", icon: Zap },
];

export const TYPE_LABEL: Record<ListingType, string> = {
  private_room: "Private Room",
  shared_room: "Shared Room",
  room_in_apartment: "Room in Apartment",
  community_home: "Community Home",
  roommate_wanted: "Roommate Wanted",
};

// value = longest stay in months the searcher wants
export const STAY_OPTIONS = [
  { value: "", label: "Any length" },
  { value: "3", label: "1–3 months" },
  { value: "6", label: "3–6 months" },
  { value: "12", label: "6–12 months" },
  { value: "120", label: "12+ months" },
];

export const GUEST_OPTIONS = [
  { value: "1", label: "1 person" },
  { value: "2", label: "2 people" },
  { value: "3", label: "3 people" },
  { value: "4", label: "4 people" },
];

export type SearchState = {
  city: string;
  moveIn: string;
  stay: string;
  guests: string;
  type: ListingType | "";
  tags: ListingTag[];
};

export function toQueryString(s: SearchState): string {
  const p = new URLSearchParams();
  if (s.city.trim()) p.set("city", s.city.trim());
  if (s.moveIn) p.set("moveIn", s.moveIn);
  if (s.stay) p.set("stay", s.stay);
  if (s.guests && s.guests !== "1") p.set("guests", s.guests);
  if (s.type) p.set("type", s.type);
  if (s.tags.length) p.set("tags", s.tags.join(","));
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

export function parseSearchParams(sp: Record<string, string | string[] | undefined>): SearchState {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const type = one("type");
  return {
    city: one("city"),
    moveIn: one("moveIn"),
    stay: one("stay"),
    guests: one("guests") || "1",
    type: LOOKING_FOR.some((o) => o.value === type) ? (type as ListingType) : "",
    tags: one("tags").split(",").filter((t): t is ListingTag => MATTERS.some((m) => m.value === t)),
  };
}
