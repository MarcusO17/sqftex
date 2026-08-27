"use client";

import { useEffect, useState } from "react";
import { ClerkProvider } from "@clerk/nextjs";

// Clerk's `appearance.variables` are NOT CSS — Clerk's own theming engine
// parses these values in JavaScript to derive hover/pressed/focus shades,
// so a `var(--paper)`-style CSS custom-property reference isn't something
// it can resolve (that's what made the Clerk widget render broken: it
// couldn't parse "var(--paper)" as a color at all). Literal hex/hsl values
// per theme, mirrored from app/globals.css, fixes that — and this wrapper
// re-resolves them whenever ThemeToggle flips data-theme (or the OS
// preference changes with no explicit override), the same way
// ThemeToggle.tsx itself resolves the current theme.
const PALETTE = {
  light: {
    background: "#fafafb", // --paper
    text: "#0e0d10", // --ink
    textSecondary: "hsl(260, 5%, 44%)", // --muted-foreground
    inputBackground: "#fafafb", // --paper
    inputText: "#0e0d10", // --ink
    neutral: "#0e0d10", // --ink
  },
  dark: {
    background: "#0e0d10", // --paper
    text: "#f5f3ef", // --ink
    textSecondary: "hsl(263, 8%, 66%)", // --muted-foreground
    inputBackground: "#0e0d10", // --paper
    inputText: "#f5f3ef", // --ink
    neutral: "#f5f3ef", // --ink
  },
} as const;

function resolveTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  // Defaults to light for the server-rendered/first-paint markup — same
  // "corrects itself right after mount" tradeoff ThemeToggle already makes
  // for its own icon, since neither can know data-theme/localStorage until
  // client JS runs.
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(resolveTheme());

    // ThemeToggle sets data-theme via a plain DOM attribute write, not an
    // event — a MutationObserver is what lets this component notice a
    // toggle click without ThemeToggle needing to know this exists.
    const observer = new MutationObserver(() => setTheme(resolveTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => setTheme(resolveTheme());
    media.addEventListener("change", onMediaChange);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", onMediaChange);
    };
  }, []);

  const palette = PALETTE[theme];

  return (
    <ClerkProvider
      // Global theming only — applies to every Clerk surface, including the
      // nav's modal sign-in (which has no heading of its own, so it keeps
      // Clerk's default card/header for context). The dedicated /login and
      // /sign-up pages additionally hide the card/header locally (see
      // AuthSplitLayout) since those already show a custom brand heading.
      appearance={{
        variables: {
          colorPrimary: "#0891b2", // --primary — brand color, not themed (see globals.css)
          colorBackground: palette.background,
          colorText: palette.text,
          colorTextSecondary: palette.textSecondary,
          colorInputBackground: palette.inputBackground,
          colorInputText: palette.inputText,
          colorNeutral: palette.neutral,
        },
        // Unlike `variables` above, these are literal Tailwind classNames
        // applied straight to Clerk's rendered DOM — the browser resolves
        // the var() references at paint time like any other CSS, so
        // there's no JS-parsing problem here.
        elements: {
          socialButtonsBlockButton: "border-[var(--line)] hover:bg-[var(--card)]",
          dividerLine: "bg-[var(--line)]",
          formFieldInput: "border-[var(--line)]",
          formButtonPrimary: "normal-case text-sm",
          footerActionLink: "text-[var(--primary)] underline-offset-4",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
