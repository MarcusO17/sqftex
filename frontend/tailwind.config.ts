import type { Config } from "tailwindcss";

// Tailwind + shadcn/ui plumbing for the frontend.
//
// preflight is OFF: the app already ships its own CSS reset and
// element-level defaults in app/globals.css (body, h1-h4, button/input,
// .btn-primary, etc.), used by every non-landing page (/login,
// /listings/*). Tailwind's own reset would fight that instead of
// layering on top of it. Tailwind utility classes (spacing, hover,
// transitions, shadcn components) still work fully with preflight off —
// only the browser-default-normalizing "base" styles are skipped.
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // --primary/--card/--secondary are taken by the site's pre-existing
        // hex color tokens (used directly as `var(--primary)` background
        // values across /login, /listings/*), so the shadcn HSL triples
        // live under distinct *-shadcn names in globals.css to avoid
        // clobbering them.
        primary: {
          DEFAULT: "hsl(var(--primary-shadcn))",
          foreground: "hsl(var(--primary-shadcn-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary-shadcn))",
          foreground: "hsl(var(--secondary-shadcn-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card-shadcn))",
          foreground: "hsl(var(--card-shadcn-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Gentle idle bob for the Hero's floating category stickers.
        float: {
          "0%, 100%": { transform: "translateY(0) var(--sticker-rotate, rotate(0deg))" },
          "50%": { transform: "translateY(-8px) var(--sticker-rotate, rotate(0deg))" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 4.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
