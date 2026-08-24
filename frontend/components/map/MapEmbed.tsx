"use client";

import dynamic from "next/dynamic";
import type { Listing } from "@/lib/api/listings";

// react-leaflet touches `window` on mount, so it can't run during SSR —
// loaded client-only via next/dynamic. `ssr: false` is only legal inside a
// Client Component, which is why this thin wrapper exists: a Server
// Component caller (like the landing page's ExploreMap) can render this
// without itself becoming a Client Component; a Client Component caller
// (like ListingBrowser) can just render it directly.
const LeafletMap = dynamic(() => import("./LeafletMap").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: "100%", background: "var(--card)" }} />,
});

export function MapEmbed({
  listings,
  onPinFocus,
  onPinBlur,
}: {
  listings: Listing[];
  onPinFocus?: (id: number) => void;
  onPinBlur?: () => void;
}) {
  return <LeafletMap listings={listings} onPinFocus={onPinFocus} onPinBlur={onPinBlur} />;
}
