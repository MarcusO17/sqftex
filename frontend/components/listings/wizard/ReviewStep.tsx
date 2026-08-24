"use client";

import { categoryLabel } from "@/lib/listingCategories";

export function ReviewStep({
  category,
  title,
  sizeSqft,
  address,
  priceRM,
  priceUnit,
  photoCount,
  onEditStep,
  publishing,
  error,
}: {
  category: string;
  title: string;
  sizeSqft: number;
  address: string;
  priceRM: number;
  priceUnit: "daily" | "monthly";
  photoCount: number;
  onEditStep: (stepIndex: number) => void;
  publishing: boolean;
  error: string | null;
}) {
  return (
    <div>
      <span className="wizard-tag wizard-tag-alt">Step 6 of 6</span>
      <h2 className="wizard-title">Review &amp; publish</h2>
      <p className="wizard-sub">Check everything, then go live.</p>
      {error && <p role="alert">{error}</p>}
      <ReviewRow label="Type" value={categoryLabel(category)} onEdit={() => onEditStep(0)} />
      <ReviewRow label="Basics" value={`${title} · ${sizeSqft} sqft`} onEdit={() => onEditStep(1)} />
      <ReviewRow label="Location" value={address} onEdit={() => onEditStep(2)} />
      <ReviewRow label="Pricing" value={`RM ${priceRM} / ${priceUnit}`} onEdit={() => onEditStep(3)} />
      <ReviewRow
        label="Rules & photos"
        value={photoCount === 1 ? "1 photo attached" : `${photoCount} photos attached`}
        onEdit={() => onEditStep(4)}
      />
      {publishing && <p style={{ marginTop: 16, color: "hsl(var(--muted-foreground))" }}>Publishing…</p>}
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "12px 0", borderBottom: "1px solid var(--card)", fontSize: 14, gap: 12,
      }}
    >
      <div>
        <b style={{ display: "block", fontSize: 10.5, textTransform: "uppercase", color: "hsl(var(--muted-foreground))", marginBottom: 4, fontWeight: 800, letterSpacing: "0.03em" }}>
          {label}
        </b>
        {value}
      </div>
      <button
        type="button"
        onClick={onEdit}
        style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
      >
        Edit
      </button>
    </div>
  );
}
