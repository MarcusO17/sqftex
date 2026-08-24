import { landingColors as c } from "./tokens";

const items = [
  {
    label: "NRIC-verified hosts",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.verified} strokeWidth="2.2">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5L16 9.5" />
      </svg>
    ),
  },
  {
    label: "Escrow-protected payments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.verified} strokeWidth="2.2">
        <path d="M4 6h16v4H4zM6 10v8a1 1 0 001 1h10a1 1 0 001-1v-8" />
      </svg>
    ),
  },
  {
    label: "No lease, cancel anytime",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.verified} strokeWidth="2.2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
];

export function TrustStrip() {
  return (
    <div
      className="mx-auto w-full max-w-[1440px] px-6 sm:px-10 lg:px-16"
      style={{ paddingBottom: 72, display: "flex", justifyContent: "center", gap: 56, flexWrap: "wrap" }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="transition-transform duration-200 ease-out hover:-translate-y-1"
          style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14.5, color: "var(--landing-ink)", fontWeight: 600 }}
        >
          {item.icon}
          {item.label}
        </div>
      ))}
    </div>
  );
}
