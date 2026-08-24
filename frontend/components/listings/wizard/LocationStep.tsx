"use client";

import { LocationPickerEmbed } from "@/components/map/LocationPickerEmbed";

export function LocationStep({
  lat,
  lng,
  address,
  onLatLngChange,
  onAddressChange,
}: {
  lat: number | null;
  lng: number | null;
  address: string;
  onLatLngChange: (lat: number, lng: number) => void;
  onAddressChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="wizard-tag wizard-tag-alt">Step 3 of 6</span>
      <h2 className="wizard-title">Where is it?</h2>
      <p className="wizard-sub">Click the map to drop the pin on the exact spot, or drag it once placed.</p>
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{ height: 220, borderRadius: 14, overflow: "hidden", border: "1.5px solid var(--line)", marginBottom: 16 }}
      >
        <LocationPickerEmbed lat={lat} lng={lng} onMove={onLatLngChange} />
      </div>
      <div className="field">
        <label htmlFor="w-address">Address</label>
        <input
          id="w-address"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Street, area"
        />
      </div>
    </div>
  );
}
