import Link from "next/link";

// Shared top nav. "guest" is shown on marketing/auth screens (landing, login);
// "app" is shown on the logged-in surfaces (browse, listing detail, create
// listing). There's no session-aware nav yet — see [1] — so the variant is
// picked per-page rather than derived from auth state.
//
// [1] once `getMe()` is wired into a shared layout, this can pick its own
// variant instead of taking one as a prop.
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

      {variant === "guest" ? (
        <Link href="/login" className="btn-primary">
          Log in
        </Link>
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--card)",
            border: "2px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
          </svg>
        </div>
      )}
    </div>
  );
}
