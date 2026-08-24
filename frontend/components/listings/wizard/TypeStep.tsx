"use client";

import { CategoryTile } from "./CategoryTile";
import { LISTING_CATEGORIES } from "@/lib/listingCategories";

const ICONS: Record<string, string> = {
  spare_room: "🛏️",
  garage: "🚗",
  shoplot_back_room: "🏪",
  warehouse_bay: "🏭",
  other: "📦",
};

export function TypeStep({
  category,
  onSelect,
}: {
  category: string | null;
  onSelect: (category: string) => void;
}) {
  return (
    <div>
      <span className="wizard-tag">Step 1 of 6</span>
      <h2 className="wizard-title">What kind of space is it?</h2>
      <p className="wizard-sub">This shapes the questions we ask next.</p>
      <div className="wizard-catgrid">
        {LISTING_CATEGORIES.map((c) => (
          <CategoryTile
            key={c.value}
            icon={ICONS[c.value]}
            label={c.label}
            active={category === c.value}
            onClick={() => onSelect(c.value)}
          />
        ))}
      </div>
    </div>
  );
}
