import Link from "next/link";

// Shared shell for /login and /sign-up: brand mark + heading on the left
// (with the actual Clerk component as `children`), a full-height photo
// panel on the right (hidden below `lg`). Split out from the original
// LoginScreen so /sign-up can mirror it exactly instead of drifting.
export function AuthSplitLayout({
  heading,
  tagline,
  children,
}: {
  heading: React.ReactNode;
  tagline: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="flex flex-col gap-8 p-6 md:p-10" style={{ background: "var(--paper)" }}>
        <Link
          href="/"
          style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}
        >
          sqftex
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <h1
              className="mb-8 text-3xl"
              style={{ fontFamily: "var(--font-heading)", fontWeight: 800, color: "var(--ink)" }}
            >
              {heading}
            </h1>
            {children}
          </div>
        </div>
      </div>

      <div
        className="relative hidden lg:block"
        style={{
          backgroundColor: "var(--card)",
          backgroundImage: "url(/login-hero.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className="absolute inset-x-0 bottom-0 p-10"
          style={{ background: "linear-gradient(180deg, transparent, rgba(14,13,16,0.75))" }}
        >
          <p style={{ color: "#fff", fontSize: 18, fontWeight: 600, maxWidth: 380 }}>{tagline}</p>
        </div>
      </div>
    </div>
  );
}

// Clerk appearance override shared by both <SignIn> and <SignUp> here: the
// global theming lives on <ClerkProvider> (app/layout.tsx) and applies
// everywhere, including the nav's modal; this local override additionally
// strips the card chrome/header since this page already shows its own
// brand heading above the form.
export const authFormAppearance = {
  elements: {
    rootBox: "w-full",
    card: "w-full shadow-none border-0 p-0 bg-transparent",
    header: "hidden",
  },
};
