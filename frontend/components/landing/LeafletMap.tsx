"use client";

import { MapContainer, TileLayer, Marker, AttributionControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Pin = { lat: number; lng: number; label: string; primary?: boolean };

// Real Klang Valley coordinates (Petaling Jaya, Subang Jaya, Shah Alam,
// Cheras, central KL) standing in for real listing locations until listings
// carry actual geocoordinates.
const PINS: Pin[] = [
  { lat: 3.1073, lng: 101.6067, label: "RM 180", primary: true }, // Petaling Jaya
  { lat: 3.0567, lng: 101.5851, label: "RM 250" }, // Subang Jaya
  { lat: 3.0733, lng: 101.5185, label: "RM 150" }, // Shah Alam
  { lat: 3.1085, lng: 101.7386, label: "RM 420" }, // Cheras
  { lat: 3.1478, lng: 101.6953, label: "RM 300" }, // central KL
];

// Reuses the same pill+tail visual the old hand-drawn MapPin component
// used, as a raw HTML string for L.divIcon — CSS custom properties still
// resolve normally here (the browser resolves var() regardless of whether
// the markup came from React or Leaflet), so these pins keep responding to
// the dark-mode toggle just like every other themed element on the page.
function pinIcon(label: string, primary?: boolean) {
  const bg = primary ? "var(--landing-btn-bg)" : "var(--landing-card)";
  const fg = primary ? "var(--landing-btn-text)" : "var(--landing-ink)";
  const pad = primary ? "8px 13px" : "7px 12px";
  const fontSize = primary ? 13 : 12;
  const dot = primary ? 9 : 8;
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;font-family:var(--font-landing-body),sans-serif;">
      <div style="background:${bg};color:${fg};font-weight:${primary ? 800 : 700};font-size:${fontSize}px;padding:${pad};border-radius:999px;box-shadow:0 4px 12px rgba(14,13,16,${primary ? 0.3 : 0.14});white-space:nowrap;">${label}</div>
      <div style="width:${dot}px;height:${dot}px;background:${bg};transform:rotate(45deg);margin-top:-4px;"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [primary ? 33 : 29, primary ? 44 : 40],
  });
}

// Real OpenStreetMap tiles, replacing the previous hand-drawn SVG
// illustration. All interaction is disabled on purpose: this is a
// decorative embed on the landing page (the real interactive search lives
// at /listings), not a map the visitor is meant to pan or zoom in place.
export function LeafletMap() {
  return (
    <MapContainer
      center={[3.1, 101.62]}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      attributionControl={false}
    >
      {/* Required OSM attribution, moved to bottom-left so it doesn't sit
          under the "Browse full map" button pinned at bottom-right. */}
      <AttributionControl position="bottomleft" />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {PINS.map((pin) => (
        <Marker key={pin.label} position={[pin.lat, pin.lng]} icon={pinIcon(pin.label, pin.primary)} />
      ))}
    </MapContainer>
  );
}
