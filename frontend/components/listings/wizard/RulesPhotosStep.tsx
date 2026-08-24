"use client";

import { PhotoUploader } from "./PhotoUploader";

export function RulesPhotosStep({
  accessRules,
  prohibitedItems,
  files,
  onAccessRulesChange,
  onProhibitedItemsChange,
  onFilesChange,
}: {
  accessRules: string;
  prohibitedItems: string;
  files: File[];
  onAccessRulesChange: (v: string) => void;
  onProhibitedItemsChange: (v: string) => void;
  onFilesChange: (files: File[]) => void;
}) {
  return (
    <div>
      <span className="wizard-tag wizard-tag-alt">Step 5 of 6</span>
      <h2 className="wizard-title">Rules &amp; photos</h2>
      <p className="wizard-sub">Add at least one photo — listings need one to publish.</p>
      <div className="field" style={{ marginBottom: 15 }}>
        <label htmlFor="w-rules">Access rules</label>
        <textarea
          id="w-rules"
          value={accessRules}
          onChange={(e) => onAccessRulesChange(e.target.value)}
          placeholder="e.g. Weekdays 9am-6pm, gate code shared after booking"
        />
      </div>
      <div className="field" style={{ marginBottom: 15 }}>
        <label htmlFor="w-prohibited">Prohibited items</label>
        <textarea
          id="w-prohibited"
          value={prohibitedItems}
          onChange={(e) => onProhibitedItemsChange(e.target.value)}
          placeholder="e.g. No perishables, no flammables"
        />
      </div>
      <div className="field">
        <label>Photos</label>
        <PhotoUploader files={files} onFilesChange={onFilesChange} />
      </div>
    </div>
  );
}
