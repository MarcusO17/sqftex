import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";

// Shared top nav. "guest" is shown on marketing/auth screens (landing, login);
// "app" is shown on the logged-in surfaces (browse, listing detail, create
// listing) — this only controls which nav links show, not sign-in state,
// which comes from Clerk directly via <SignedIn>/<SignedOut>.
//
// Stays in normal document flow (not the landing page's fixed floating
// pill) — that overlap-the-hero treatment is a marketing-page-specific
// flourish; every other page here needs the nav to reliably reserve its
// own space above scrolling content. Shares the app's promoted palette/
// shape language (rounded corners, thin --line borders) instead.
interface NavBarProps {
  variant: "guest" | "app";
}

export function NavBar({ variant }: NavBarProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: 76,
        padding: "0 64px",
        background: "var(--paper)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
        <Link href="/" style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 800 }}>
          packrat
        </Link>
        {variant === "app" && (
          <div style={{ display: "flex", gap: 28 }}>
            <Link href="/listings" className="nav-link">
              Browse
            </Link>
            <Link href="/listings/new" className="nav-link">
              List a space
            </Link>
            <SignedIn>
              <Link href="/dashboard" className="nav-link">
                Dashboard
              </Link>
              <Link href="/profile" className="nav-link">
                Profile
              </Link>
            </SignedIn>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ThemeToggle />
        <SignedOut>
          <SignInButton mode="modal">
            <button type="button" className="btn-primary">
              Log in
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </div>
  );
}
