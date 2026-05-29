import { randomBytes } from "crypto";

export function generateId(): string {
  return randomBytes(12).toString("hex");
}

export function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}
