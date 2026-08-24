import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

// Shared top nav. "guest" is shown on marketing/auth screens (landing, login);
// "app" is shown on the logged-in surfaces (browse, listing detail, create
// listing) — this only controls which nav links show, not sign-in state,
// which comes from Clerk directly via <SignedIn>/<SignedOut>.
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
        height: 80,
        padding: "0 64px",
        borderBottom: "3px solid var(--ink)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
        <Link href="/" style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 900 }}>
          sqftex
        </Link>
        {variant === "app" && (
          <div style={{ display: "flex", gap: 28 }}>
            <Link href="/listings" className="nav-link">
              Browse
            </Link>
            <Link href="/listings/new" className="nav-link">
              List a space
            </Link>
          </div>
        )}
      </div>

      <SignedOut>
        <Link href="/login" className="btn-primary">
          Log in
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}
