import type { Metadata } from "next";
import { Unbounded, Manrope } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// Shared app-wide type — previously Archivo/Work Sans (the old
// neo-brutalist system) here, with the landing page separately loading its
// own Unbounded/Manrope under different variable names. Now that the rest
// of the app has adopted the landing palette/shape language too (see
// docs/superpowers/specs/2026-08-23-landing-page-redesign-design.md, "Open
// items" #6), these are loaded once here and consumed everywhere via
// --font-heading/--font-body (app/globals.css); the landing page's own
// --font-landing-heading/--font-landing-body just alias back to these (see
// LandingStyles.tsx) instead of loading the same Google Fonts a second time.
const display = Unbounded({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});
const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "sqftex — Microwarehousing for Malaysia",
  description:
    "sqftex connects Space Owners with spare square footage to Space Seekers who need short- or mid-term storage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      // Global theming only — applies to every Clerk surface, including the
      // nav's modal sign-in (which has no heading of its own, so it keeps
      // Clerk's default card/header for context). The dedicated /login and
      // /sign-up pages additionally hide the card/header locally (see
      // AuthSplitLayout) since those already show a custom brand heading.
      appearance={{
        variables: {
          colorPrimary: "var(--primary)",
        },
        elements: {
          socialButtonsBlockButton: "border-[var(--line)] hover:bg-[var(--card)]",
          dividerLine: "bg-[var(--line)]",
          formFieldInput: "border-[var(--line)]",
          formButtonPrimary: "normal-case text-sm",
          footerActionLink: "text-[var(--primary)] underline-offset-4",
        },
      }}
    >
      <html lang="en" className={`${display.variable} ${sans.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
