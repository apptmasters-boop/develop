export type InventoryLevel = "Stocked" | "Low" | "Out";

export interface GroceryItem {
  id: string;
  apartmentId: string;
  name: string;
  addedBy: string;
  buyingUserId: string | null;
  purchased: boolean;
  createdAt: Date;
}

export interface SupplyItem {
  id: string;
  apartmentId: string;
  name: string;
  level: InventoryLevel;
  lastBoughtBy: string | null;
  reorderThreshold: InventoryLevel;
  createdAt: Date;
}
