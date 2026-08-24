import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function LandingNav() {
  return (
    <div
      style={{
        position: "absolute",
        top: 24,
        left: 40,
        right: 40,
        height: 68,
        background: "var(--landing-nav-bg)",
        borderRadius: 999,
        boxShadow: "0 10px 30px rgba(14,13,16,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px 0 26px",
        zIndex: 5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-landing-heading), sans-serif",
            fontWeight: 700,
            fontSize: 19,
            color: "var(--landing-ink)",
            letterSpacing: "-0.01em",
          }}
        >
          sqftex
        </Link>
        <div style={{ display: "flex", gap: 26 }}>
          <a
            href="#how-it-works"
            className="landing-navlink"
            style={{ color: "var(--landing-nav-link)", fontWeight: 600, fontSize: 14.5 }}
          >
            How it works
          </a>
          <Link
            href="/listings/new"
            className="landing-navlink"
            style={{ color: "var(--landing-nav-link)", fontWeight: 600, fontSize: 14.5 }}
          >
            List your space
          </Link>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ThemeToggle />
        <Link
          href="/login"
          className="landing-navlink"
          style={{ color: "var(--landing-nav-link)", fontWeight: 600, fontSize: 14.5, padding: "0 10px" }}
        >
          Log in
        </Link>
        <Link
          href="/listings"
          style={{
            background: "var(--landing-btn-bg)",
            color: "var(--landing-btn-text)",
            fontWeight: 700,
            fontSize: 14,
            padding: "12px 22px",
            borderRadius: 10,
          }}
        >
          Get started
        </Link>
      </div>
    </div>
  );
}
