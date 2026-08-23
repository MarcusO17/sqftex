import Link from "next/link";
import type { ReactNode } from "react";
import { landingColors as c } from "./tokens";

function CategoryTile({
  href,
  color,
  rotate,
  marginTop,
  label,
  children,
}: {
  href: string;
  color: string;
  rotate: string;
  marginTop: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        transform: `rotate(${rotate})`,
        marginTop,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 10px 22px ${color}4D`,
        }}
      >
        {children}
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: c.ink }}>{label}</span>
    </Link>
  );
}

export function QuickCategories() {
  return (
    <div style={{ display: "flex", gap: 34, padding: "64px 64px 0 64px", alignItems: "flex-start", flexWrap: "wrap" }}>
      <CategoryTile href="/listings" color={c.categoryStorage} rotate="-4deg" marginTop={0} label="Storage Room">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8">
          <rect x="3" y="9" width="18" height="12" rx="2" />
          <path d="M7 9V6.5A5 5 0 0117 6.5V9" />
        </svg>
      </CategoryTile>
      <CategoryTile href="/listings" color={c.categoryGarage} rotate="3deg" marginTop={10} label="Garage Bay">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8">
          <path d="M4 17h1a2 2 0 004 0h6a2 2 0 004 0h1v-5l-2-5H6L4 12z" />
          <circle cx="7.5" cy="17" r="0.6" fill="#FFFFFF" />
          <circle cx="16.5" cy="17" r="0.6" fill="#FFFFFF" />
        </svg>
      </CategoryTile>
      <CategoryTile href="/listings" color={c.categoryWarehouse} rotate="-2deg" marginTop={0} label="Warehouse">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8">
          <path d="M3 10l9-6 9 6v9a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
          <path d="M9 20v-7h6v7" />
        </svg>
      </CategoryTile>
      <CategoryTile href="/listings" color={c.categoryContainer} rotate="5deg" marginTop={14} label="Container">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 11h18M9 6v13" />
        </svg>
      </CategoryTile>
    </div>
  );
}
