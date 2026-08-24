"use client";

import { RangeSlider } from "./RangeSlider";

export function BasicsStep({
  title,
  description,
  sizeSqft,
  onTitleChange,
  onDescriptionChange,
  onSizeChange,
}: {
  title: string;
  description: string;
  sizeSqft: number;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSizeChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="wizard-tag wizard-tag-alt">Step 2 of 6</span>
      <h2 className="wizard-title">Tell us the basics</h2>
      <p className="wizard-sub">A clear title helps renters trust the listing.</p>
      <div className="field" style={{ marginBottom: 15 }}>
        <label htmlFor="w-title">Title</label>
        <input
          id="w-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Ground-floor warehouse bay, PJ"
        />
      </div>
      <div className="field" style={{ marginBottom: 15 }}>
        <label htmlFor="w-desc">Description</label>
        <textarea
          id="w-desc"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What makes this space good for storage?"
        />
      </div>
      <div className="field">
        <label>Size (sqft)</label>
        <RangeSlider
          value={sizeSqft}
          min={50}
          max={2000}
          step={10}
          format={(v) => `${v.toLocaleString()} sqft`}
          onChange={onSizeChange}
          ariaLabel="Size in square feet"
        />
      </div>
    </div>
  );
}
