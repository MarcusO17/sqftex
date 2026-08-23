// Mirrors Listing.Category in backend/apps/listings/models.py — keep in sync
// if the backend choices change.
export const LISTING_CATEGORIES = [
  { value: "spare_room", label: "Spare room" },
  { value: "garage", label: "Garage" },
  { value: "shoplot_back_room", label: "Shoplot back room" },
  { value: "warehouse_bay", label: "Warehouse bay" },
  { value: "other", label: "Other" },
] as const;

export function categoryLabel(value: string): string {
  return LISTING_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
