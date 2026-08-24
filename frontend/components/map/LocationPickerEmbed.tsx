"use client";

import dynamic from "next/dynamic";

// Same SSR-avoidance wrapper pattern as components/map/MapEmbed.tsx —
// react-leaflet touches `window` on mount.
const LocationPicker = dynamic(() => import("./LocationPicker").then((m) => m.LocationPicker), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: "100%", background: "var(--card)" }} />,
});

export function LocationPickerEmbed({
  lat,
  lng,
  onMove,
}: {
  lat: number | null;
  lng: number | null;
  onMove: (lat: number, lng: number) => void;
}) {
  return <LocationPicker lat={lat} lng={lng} onMove={onMove} />;
}
