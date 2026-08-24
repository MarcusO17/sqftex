"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Same free tile source as LeafletMap.tsx (CARTO Positron, or MapTiler if a
// key is configured) — see that file's comment for the reasoning.
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const TILE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
  : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION = MAPTILER_KEY
  ? '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
  : '&copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';

const DEFAULT_CENTER: [number, number] = [3.1, 101.62]; // same Klang Valley default as LeafletMap.tsx

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="font-size:32px;transform:translate(-50%,-100%);filter:drop-shadow(0 3px 4px rgba(0,0,0,.32));">📍</div>`,
  iconSize: [0, 0],
});

function ClickToPlace({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({
  lat,
  lng,
  onMove,
}: {
  lat: number | null;
  lng: number | null;
  onMove: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = lat !== null && lng !== null ? [lat, lng] : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={lat !== null ? 15 : 11}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
      attributionControl={false}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ClickToPlace onMove={onMove} />
      {lat !== null && lng !== null && (
        <Marker
          position={[lat, lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const m = e.target as L.Marker;
              const pos = m.getLatLng();
              onMove(pos.lat, pos.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
