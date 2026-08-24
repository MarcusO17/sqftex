"use client";

import { useEffect, useRef } from "react";
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
  const mapWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el) return;
    // A native listener (not React's onPointerDown) so it fires in true DOM
    // bubble order and stops the event before it reaches WizardShell's own
    // native addEventListener("pointerdown", ...) on the ancestor
    // .wizard-stage — a React synthetic handler can't preempt that, since
    // React dispatches synthetic events from a single delegated listener at
    // the app root, which only runs after native bubbling has already
    // passed through .wizard-stage.
    const stop = (e: PointerEvent) => e.stopPropagation();
    el.addEventListener("pointerdown", stop);
    return () => el.removeEventListener("pointerdown", stop);
  }, []);

  return (
    <div>
      <span className="wizard-tag wizard-tag-alt">Step 3 of 6</span>
      <h2 className="wizard-title">Where is it?</h2>
      <p className="wizard-sub">Click the map to drop the pin on the exact spot, or drag it once placed.</p>
      <div
        ref={mapWrapRef}
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
