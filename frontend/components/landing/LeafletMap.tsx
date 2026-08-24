"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, Marker, AttributionControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Listing } from "@/lib/api/listings";

// Default view when there are no listings to plot yet (or the API call
// failed) — same Klang Valley framing the map has always opened on.
const DEFAULT_CENTER: [number, number] = [3.1, 101.62];
const DEFAULT_ZOOM = 11;

// Tile provider: MapTiler's "Streets" tiles when a key is configured,
// otherwise CARTO's "Positron" basemap — a free, no-signup, minimal light
// style (muted greys, subtle labels) that's a big step up from plain OSM
// raster tiles (which are also not meant for production traffic —
// https://operations.osmfoundation.org/policies/tiles/) and lets the
// colored price-pill markers stand out cleanly on top of it.
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const TILE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
  : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION = MAPTILER_KEY
  ? '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
  : '&copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';

type Pin = { id: number; lat: number; lng: number; label: string; primary?: boolean };

function listingsToPins(listings: Listing[]): Pin[] {
  const cheapestId = listings.reduce<number | null>((min, l) => {
    if (min === null) return l.id;
    const minListing = listings.find((x) => x.id === min)!;
    return l.price_cents < minListing.price_cents ? l.id : min;
  }, null);

  return listings.map((l) => ({
    id: l.id,
    lat: l.location_lat,
    lng: l.location_lng,
    label: `RM ${Math.round(l.price_cents / 100)}`,
    primary: l.id === cheapestId,
  }));
}

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
    html: `<div style="display:flex;flex-direction:column;align-items:center;font-family:var(--font-landing-body),sans-serif;cursor:pointer;">
      <div style="background:${bg};color:${fg};font-weight:${primary ? 800 : 700};font-size:${fontSize}px;padding:${pad};border-radius:999px;box-shadow:0 4px 12px rgba(14,13,16,${primary ? 0.3 : 0.14});white-space:nowrap;">${label}</div>
      <div style="width:${dot}px;height:${dot}px;background:${bg};transform:rotate(45deg);margin-top:-4px;"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [primary ? 33 : 29, primary ? 44 : 40],
  });
}

// Real OpenStreetMap tiles plotting real listing pins (falls back to the
// default Klang Valley view when there's nothing to plot). Pan/zoom are
// enabled so visitors can explore in place; scroll-wheel zoom stays off so
// scrolling the page past the map doesn't get hijacked into zooming it.
export function LeafletMap({ listings }: { listings: Listing[] }) {
  const router = useRouter();
  const pins = useMemo(() => listingsToPins(listings), [listings]);

  const center = useMemo<[number, number]>(() => {
    if (pins.length === 0) return DEFAULT_CENTER;
    const lat = pins.reduce((sum, p) => sum + p.lat, 0) / pins.length;
    const lng = pins.reduce((sum, p) => sum + p.lng, 0) / pins.length;
    return [lat, lng];
  }, [pins]);

  return (
    <MapContainer
      center={center}
      zoom={pins.length > 0 ? 12 : DEFAULT_ZOOM}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
      dragging={true}
      scrollWheelZoom={false}
      doubleClickZoom={true}
      touchZoom={true}
      boxZoom={false}
      keyboard={true}
      attributionControl={false}
    >
      {/* Required OSM attribution, moved to bottom-left so it doesn't sit
          under the "Browse full map" button pinned at bottom-right. */}
      <AttributionControl position="bottomleft" />
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={pinIcon(pin.label, pin.primary)}
          eventHandlers={{ click: () => router.push(`/listings/${pin.id}`) }}
        />
      ))}
    </MapContainer>
  );
}
