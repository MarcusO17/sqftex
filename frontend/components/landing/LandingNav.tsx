"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

// Scroll threshold, in pixels, past which the pill switches to its
// shrunk/compact styling.
const SHRINK_AT = 24;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SHRINK_AT);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="landing-nav"
      style={{
        // Always fixed (not absolute) so the pill follows the visitor from
        // the first pixel of scroll instead of scrolling away with the
        // hero — see the comment on .landing-nav in LandingStyles.tsx.
        position: "fixed",
        top: scrolled ? 12 : 24,
        left: "50%",
        // Same edge insets as before (16px scrolled / 40px resting) on
        // typical viewports, but capped at 1440px so the pill doesn't
        // stretch full-bleed on very wide screens — matches the
        // max-w-[1440px] container every other section uses.
        width: scrolled ? "min(calc(100% - 32px), 1440px)" : "min(calc(100% - 80px), 1440px)",
        transform: "translateX(-50%)",
        height: scrolled ? 52 : 68,
        background: "var(--landing-nav-bg)",
        borderRadius: 999,
        boxShadow: scrolled ? "0 12px 28px rgba(14,13,16,0.16)" : "0 10px 30px rgba(14,13,16,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: scrolled ? "0 10px 0 22px" : "0 12px 0 26px",
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: scrolled ? 32 : 40 }}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-landing-heading), sans-serif",
            fontWeight: 700,
            fontSize: scrolled ? 17 : 19,
            color: "var(--landing-ink)",
            letterSpacing: "-0.01em",
          }}
        >
          packrat
        </Link>
        <div style={{ display: "flex", gap: 26 }}>
          <Link
            href="/listings"
            className="landing-navlink"
            style={{ color: "var(--landing-nav-link)", fontWeight: 600, fontSize: 14.5 }}
          >
            Listings
          </Link>
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
        <SignedOut>
          <SignInButton mode="modal">
            <button
              type="button"
              className="landing-navlink"
              style={{
                color: "var(--landing-nav-link)",
                fontWeight: 600,
                fontSize: 14.5,
                padding: "0 10px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Log in
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
        <Button
          asChild
          className="h-auto rounded-[10px] bg-[var(--landing-btn-bg)] px-[22px] py-3 text-sm font-bold text-[var(--landing-btn-text)] hover:bg-[var(--landing-btn-bg)] hover:opacity-90"
        >
          <Link href="/listings">Get started</Link>
        </Button>
      </div>
    </div>
  );
}
