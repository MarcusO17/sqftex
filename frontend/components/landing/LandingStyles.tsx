// The one hover interaction this design needs (nav links darkening on
// hover) can't be done with inline styles alone, and this page
// deliberately doesn't touch the shared globals.css. A plain <style> tag
// works fine in a Server Component — no "use client" needed.
export function LandingStyles() {
  return (
    <style>{`
      .landing-navlink:hover { color: #0E0D10; }
    `}</style>
  );
}
