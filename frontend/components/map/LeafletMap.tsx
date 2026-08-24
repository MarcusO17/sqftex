"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, AttributionControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Listing } from "@/lib/api/listings";
import { categoryLabel } from "@/lib/listingCategories";
import { formatPrice } from "@/lib/format";

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

type Pin = { id: number; lat: number; lng: number; label: string; primary?: boolean; listing: Listing };

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
    listing: l,
  }));
}

// Reuses the same pill+tail visual the old hand-drawn MapPin component
// used, as a raw HTML string for L.divIcon — CSS custom properties still
// resolve normally here (the browser resolves var() regardless of whether
// the markup came from React or Leaflet). Uses the shared app-wide tokens
// (app/globals.css), not the landing page's --landing-* ones, since this
// component is no longer landing-exclusive — see components/map/README
// note in MapEmbed.tsx. Values are identical to the landing tokens in
// light mode (same palette, promoted app-wide), so this is a no-op change
// on the landing page itself and makes the map work on /listings too.
function pinIcon(label: string, primary?: boolean) {
  const bg = primary ? "var(--ink)" : "var(--paper)";
  const fg = primary ? "#fff" : "var(--ink)";
  const pad = primary ? "8px 13px" : "7px 12px";
  const fontSize = primary ? 13 : 12;
  const dot = primary ? 9 : 8;
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;font-family:var(--font-body),sans-serif;cursor:pointer;">
      <div style="background:${bg};color:${fg};font-weight:${primary ? 800 : 700};font-size:${fontSize}px;padding:${pad};border-radius:999px;box-shadow:0 4px 12px rgba(14,13,16,${primary ? 0.3 : 0.14});white-space:nowrap;">${label}</div>
      <div style="width:${dot}px;height:${dot}px;background:${bg};transform:rotate(45deg);margin-top:-4px;"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [primary ? 33 : 29, primary ? 44 : 40],
  });
}

// Imperatively pans the map when `panToId` changes — `<MapContainer>`'s
// center/zoom props only apply on mount, so following a hovered listing
// needs the actual Leaflet map instance (useMap(), only available from a
// descendant of MapContainer, which is why this is a separate component
// rather than inline logic in LeafletMap itself). Only pans forward: an id
// going back to null (hover ending) doesn't snap the map back — it just
// stays wherever it last followed to, so scanning down a list doesn't
// fight itself with a pan-away on every mouse-leave.
function PanToListing({ pins, panToId }: { pins: Pin[]; panToId: number | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!panToId) return;
    const pin = pins.find((p) => p.id === panToId);
    if (!pin) return;
    map.panTo([pin.lat, pin.lng], { animate: true, duration: 0.5 });
  }, [panToId, pins, map]);
  return null;
}

// Real map tiles plotting real listing pins (falls back to the default
// Klang Valley view when there's nothing to plot). Pan/zoom are enabled so
// visitors can explore in place; scroll-wheel zoom stays off so scrolling
// the page past the map doesn't get hijacked into zooming it. Shared by
// the landing page's ExploreMap section and the /listings browse page.
//
// Clicking a pin doesn't navigate straight to the listing — it opens a
// lightweight preview popup first (title/price/photo + a "View more
// details" link), and optionally reports focus back to the caller (used on
// /listings to highlight + scroll to the matching card in the list on the
// left) so a click is cheap to back out of instead of committing to a full
// navigation immediately. `panToId` is the reverse direction: hovering a
// card in that list pans the map to follow it.
export function LeafletMap({
  listings,
  onPinFocus,
  onPinBlur,
  panToId,
}: {
  listings: Listing[];
  onPinFocus?: (id: number) => void;
  onPinBlur?: () => void;
  panToId?: number | null;
}) {
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
          under whatever floating CTA/panel sits at bottom-right. */}
      <AttributionControl position="bottomleft" />
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <PanToListing pins={pins} panToId={panToId} />
      {pins.map((pin) => {
        const { listing } = pin;
        const coverPhoto = listing.photos[0];
        return (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={pinIcon(pin.label, pin.primary)}
            eventHandlers={{
              popupopen: () => onPinFocus?.(pin.id),
              popupclose: () => onPinBlur?.(),
            }}
          >
            <Popup minWidth={220} maxWidth={240} closeButton={true}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-body), sans-serif" }}>
                {coverPhoto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverPhoto.image}
                    alt={listing.title}
                    style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8, marginBottom: 2 }}
                  />
                )}
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--primary)" }}>
                  {categoryLabel(listing.category)}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>{listing.title}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
                  {listing.size_sqft} sqft &middot; {formatPrice(listing)}
                </span>
                <Link
                  href={`/listings/${listing.id}`}
                  style={{
                    marginTop: 4,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "var(--primary)",
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                  }}
                >
                  View more details &rarr;
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
