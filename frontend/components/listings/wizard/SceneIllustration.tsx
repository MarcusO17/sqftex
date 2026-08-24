// One flat-vector SVG scene per category, crossfaded via the `active` class
// (opacity transition defined in WizardStyles). `category` is one of the
// four ListingCategory values the wizard offers, or null before a pick.
const SCENES: { cat: string; render: () => JSX.Element }[] = [
  {
    cat: "spare_room",
    render: () => (
      <>
        <rect x="205" y="40" width="60" height="60" fill="none" stroke="var(--line)" strokeWidth="4" />
        <line x1="235" y1="40" x2="235" y2="100" stroke="var(--line)" strokeWidth="4" />
        <line x1="205" y1="70" x2="265" y2="70" stroke="var(--line)" strokeWidth="4" />
        <rect x="18" y="120" width="30" height="45" rx="6" fill="var(--paper)" stroke="var(--line)" strokeWidth="2" />
        <rect x="25" y="150" width="110" height="55" rx="8" fill="var(--paper)" stroke="var(--line)" strokeWidth="2" />
        <rect x="25" y="150" width="110" height="16" fill="var(--secondary)" />
      </>
    ),
  },
  {
    cat: "garage",
    render: () => (
      <>
        <rect x="20" y="30" width="260" height="60" fill="var(--paper)" stroke="var(--line)" strokeWidth="3" />
        <line x1="20" y1="45" x2="280" y2="45" stroke="var(--line)" strokeWidth="2" />
        <line x1="20" y1="60" x2="280" y2="60" stroke="var(--line)" strokeWidth="2" />
        <line x1="20" y1="75" x2="280" y2="75" stroke="var(--line)" strokeWidth="2" />
        <rect x="80" y="130" width="90" height="30" rx="12" fill="var(--primary)" />
        <rect x="55" y="150" width="150" height="45" rx="16" fill="var(--primary)" />
        <circle cx="90" cy="196" r="16" fill="var(--ink)" />
        <circle cx="180" cy="196" r="16" fill="var(--ink)" />
      </>
    ),
  },
  {
    cat: "shoplot_back_room",
    render: () => (
      <>
        <line x1="20" y1="60" x2="280" y2="60" stroke="var(--line)" strokeWidth="5" />
        <line x1="20" y1="105" x2="280" y2="105" stroke="var(--line)" strokeWidth="5" />
        <line x1="20" y1="150" x2="280" y2="150" stroke="var(--line)" strokeWidth="5" />
        <rect x="35" y="35" width="30" height="25" fill="var(--secondary)" />
        <rect x="90" y="30" width="26" height="30" fill="var(--primary)" />
        <rect x="150" y="35" width="34" height="25" fill="var(--secondary)" />
        <rect x="45" y="78" width="30" height="27" fill="var(--primary)" />
        <rect x="110" y="78" width="26" height="27" fill="var(--secondary)" />
        <rect x="60" y="120" width="34" height="30" fill="var(--secondary)" />
        <rect x="150" y="118" width="28" height="32" fill="var(--primary)" />
      </>
    ),
  },
  {
    cat: "warehouse_bay",
    render: () => (
      <>
        <rect x="215" y="20" width="65" height="185" fill="none" stroke="var(--line)" strokeWidth="4" />
        <line x1="20" y1="200" x2="20" y2="40" stroke="hsl(var(--muted-foreground))" strokeWidth="6" />
        <line x1="70" y1="200" x2="70" y2="40" stroke="hsl(var(--muted-foreground))" strokeWidth="6" />
        <line x1="20" y1="80" x2="70" y2="80" stroke="hsl(var(--muted-foreground))" strokeWidth="5" />
        <line x1="20" y1="140" x2="70" y2="140" stroke="hsl(var(--muted-foreground))" strokeWidth="5" />
        <rect x="26" y="88" width="38" height="26" fill="var(--secondary)" />
        <rect x="26" y="148" width="38" height="26" fill="var(--primary)" />
        <rect x="95" y="165" width="40" height="40" fill="var(--secondary)" />
        <rect x="140" y="150" width="46" height="55" fill="var(--primary)" />
      </>
    ),
  },
];

export function SceneIllustration({ category }: { category: string | null }) {
  // "other" has no dedicated scene (spec's Out of scope) — falls through to
  // the same empty/default room as no category picked yet.
  const isDefault = category === null || category === "other";
  return (
    <div className="wizard-scene-stack" style={{ position: "absolute", inset: 0 }}>
      <svg
        className={`wizard-scene${isDefault ? " active" : ""}`}
        viewBox="0 0 300 260"
        preserveAspectRatio="xMidYMax slice"
      >
        <rect width="300" height="260" fill="var(--card)" />
        <rect y="205" width="300" height="55" fill="var(--line)" />
      </svg>
      {SCENES.map(({ cat, render }) => (
        <svg
          key={cat}
          className={`wizard-scene${category === cat ? " active" : ""}`}
          viewBox="0 0 300 260"
          preserveAspectRatio="xMidYMax slice"
        >
          <rect width="300" height="260" fill="var(--card)" />
          <rect y="205" width="300" height="55" fill="var(--line)" />
          {render()}
        </svg>
      ))}
    </div>
  );
}
