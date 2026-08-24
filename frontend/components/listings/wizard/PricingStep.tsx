"use client";

import { RangeSlider } from "./RangeSlider";

export function PricingStep({
  priceRM,
  priceUnit,
  onPriceChange,
  onUnitChange,
}: {
  priceRM: number;
  priceUnit: "daily" | "monthly";
  onPriceChange: (v: number) => void;
  onUnitChange: (v: "daily" | "monthly") => void;
}) {
  return (
    <div>
      <span className="wizard-tag wizard-tag-alt">Step 4 of 6</span>
      <h2 className="wizard-title">Set your price</h2>
      <p className="wizard-sub">You can change this later.</p>
      <div className="field" style={{ marginBottom: 15 }}>
        <label>Price (RM)</label>
        <RangeSlider
          value={priceRM}
          min={20}
          max={3000}
          step={10}
          format={(v) => `RM ${v.toLocaleString()}`}
          onChange={onPriceChange}
          ariaLabel="Price in ringgit"
        />
      </div>
      <div className="field">
        <label>Billed</label>
        <div style={{ display: "flex", border: "1px solid var(--ink)", borderRadius: 10, overflow: "hidden", maxWidth: 280 }}>
          <button
            type="button"
            className="seg"
            data-active={priceUnit === "daily"}
            onClick={() => onUnitChange("daily")}
          >
            DAILY
          </button>
          <button
            type="button"
            className="seg"
            data-active={priceUnit === "monthly"}
            onClick={() => onUnitChange("monthly")}
          >
            MONTHLY
          </button>
        </div>
      </div>
    </div>
  );
}
