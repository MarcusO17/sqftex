"use client";

import dynamic from "next/dynamic";
import type { Listing } from "@/lib/api/listings";

// react-leaflet touches `window` on mount, so it can't run during SSR —
// loaded client-only via next/dynamic. `ssr: false` is only legal inside a
// Client Component, which is why this thin wrapper exists: ExploreMap.tsx
// (which renders this) stays a Server Component, and only this file needs
// "use client".
const LeafletMap = dynamic(() => import("./LeafletMap").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: "100%", background: "var(--landing-ghost)" }} />,
});

export function MapEmbed({ listings }: { listings: Listing[] }) {
  return <LeafletMap listings={listings} />;
}
