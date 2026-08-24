import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

// Split-screen login: brand + Clerk's <SignIn> on the left, a full-height
// photo on the right (hidden below `lg`). Clerk keeps owning the actual
// auth flow (OAuth, email/password, verification, "forgot password", the
// required "Secured by Clerk" footer on the free plan) — only `appearance`
// changes here, so none of that logic gets reimplemented or lost.
//
// Right-panel image: drop a file at `public/login-hero.jpg` (portrait-ish
// crop, storage/warehouse imagery works well) — falls back to a plain
// tinted panel until one exists, no broken-image icon.
export function LoginScreen() {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="flex flex-col gap-8 p-6 md:p-10" style={{ background: "var(--paper)" }}>
        <Link
          href="/"
          style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 900, color: "var(--ink)" }}
        >
          sqftex
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <h1
              className="mb-8 text-3xl"
              style={{ fontFamily: "var(--font-heading)", fontWeight: 900, color: "var(--ink)" }}
            >
              Welcome back.
              <br />
              Log in to your account.
            </h1>

            <SignIn
              path="/login"
              routing="path"
              signUpUrl="/sign-up"
              appearance={{
                variables: {
                  colorPrimary: "var(--primary)",
                },
                elements: {
                  rootBox: "w-full",
                  card: "w-full shadow-none border-0 p-0 bg-transparent",
                  header: "hidden",
                  socialButtonsBlockButton: "border-[var(--line)] hover:bg-[var(--card)]",
                  dividerLine: "bg-[var(--line)]",
                  formFieldInput: "border-[var(--line)]",
                  formButtonPrimary: "normal-case text-sm",
                  footerActionLink: "text-[var(--primary)] underline-offset-4",
                },
              }}
            />
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
          style={{ background: "linear-gradient(180deg, transparent, rgba(20,20,20,0.75))" }}
        >
          <p style={{ color: "#fff", fontSize: 18, fontWeight: 600, maxWidth: 380 }}>
            Verified hosts. Escrow-protected bookings. Spare space, sorted fast.
          </p>
        </div>
      </div>
    </div>
  );
}
