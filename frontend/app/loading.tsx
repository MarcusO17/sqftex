// Next.js App Router convention: automatically wrapped around `children` in
// the nearest layout via a Suspense boundary, and shown whenever the route
// segment below it is still resolving — first visit to the app, or
// navigating into any segment that has no more specific loading.tsx of its
// own (none of the routes under app/ currently define one). Server
// Component, no "use client" needed — same reasoning as LandingStyles.tsx.
export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        background: "var(--paper)",
        color: "var(--ink)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: "-0.01em",
        }}
      >
        packrat
      </div>
      <div className="loading-track">
        <div className="loading-fill" />
      </div>
      <style
        // Plain <style>, not styled-jsx — same reasoning as LandingStyles.tsx:
        // browsers parse <style> content as raw text, so a JSX text child
        // would get HTML-escaped by React and mismatch on hydration.
        dangerouslySetInnerHTML={{
          __html: `
            .loading-track {
              width: 120px;
              height: 3px;
              border-radius: 999px;
              background: var(--line);
              overflow: hidden;
            }
            .loading-fill {
              width: 40%;
              height: 100%;
              border-radius: 999px;
              background: linear-gradient(90deg, var(--secondary), var(--primary));
              animation: loading-slide 1.1s ease-in-out infinite;
            }
            @keyframes loading-slide {
              0% { transform: translateX(-120%); }
              100% { transform: translateX(320%); }
            }
            @media (prefers-reduced-motion: reduce) {
              .loading-fill { animation: none; width: 100%; }
            }
          `,
        }}
      />
    </div>
  );
}
