import { landingColors as c } from "./tokens";

const steps = [
  {
    title: "1. Search nearby",
    body: "Find a verified space near you that fits what you need to store.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="1.9">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    title: "2. Book securely",
    body: "Agree on move-in with the host and pay — held in escrow until you're in.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="1.9">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 3v3M16 3v3" />
      </svg>
    ),
  },
  {
    title: "3. Move in",
    body: "Drop off your things. No lease — extend or end the booking anytime.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="1.9">
        <rect x="3" y="9" width="18" height="12" rx="2" />
        <path d="M7 9V6.5A5 5 0 0117 6.5V9" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <div id="how-it-works" style={{ padding: "100px 64px 80px 64px" }}>
      <h2
        style={{
          fontFamily: "var(--font-landing-heading), sans-serif",
          fontWeight: 700,
          fontSize: 26,
          color: c.ink,
          textAlign: "center",
          margin: "0 0 48px 0",
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
        }}
      >
        How it works
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 40, maxWidth: 1080, margin: "0 auto" }}>
        {steps.map((step) => (
          <div key={step.title} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: c.accentSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {step.icon}
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: c.ink, margin: 0 }}>{step.title}</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: c.muted, margin: 0 }}>{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
