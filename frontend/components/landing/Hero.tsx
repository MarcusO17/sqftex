import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroFeatureCard } from "./HeroFeatureCard";
import { landingColors as c } from "./tokens";

export function Hero() {
  return (
    <div
      className="mx-auto w-full max-w-[1440px] px-6 sm:px-10 lg:px-16"
      style={{ paddingTop: 208, display: "flex", gap: 56, alignItems: "center", flexWrap: "wrap" }}
    >
      <div style={{ flex: "1 1 480px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "center",
            gap: 8,
            background: c.accentSoft,
            color: c.accent,
            fontWeight: 800,
            fontSize: 11.5,
            letterSpacing: "0.06em",
            padding: "8px 12px",
            borderRadius: 6,
            textTransform: "uppercase",
          }}
        >
          Now live
        </div>
        <h1
          style={{
            fontFamily: "var(--font-landing-heading), sans-serif",
            fontWeight: 700,
            fontSize: 80,
            lineHeight: 1,
            color: "var(--landing-ink)",
            margin: 0,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
          }}
        >
          Spare
          <br />
          space.
          <br />
          <span style={{ color: c.accent }}>
            Sorted
            <br />
            fast.
          </span>
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--landing-muted)", margin: "8px 0 0 0", maxWidth: 440 }}>
          Book a storage room, garage bay or warehouse unit from a verified host near you &mdash;
          by the day or by the month, no lease required.
        </p>

        <form
          action="/listings"
          method="get"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--landing-card)",
            border: "1px solid var(--landing-line)",
            borderRadius: 12,
            padding: "8px 8px 8px 20px",
            marginTop: 14,
            maxWidth: 460,
            boxShadow: "0 10px 26px rgba(14,13,16,0.05)",
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--landing-muted)" strokeWidth="1.8">
            <circle cx="12" cy="10" r="3" />
            <path d="M12 21c-4-4.5-7-8-7-11a7 7 0 0114 0c0 3-3 6.5-7 11z" />
          </svg>
          <input
            type="text"
            name="q"
            placeholder="Enter your area"
            style={{
              border: "none",
              outline: "none",
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--landing-ink)",
              flex: 1,
              background: "transparent",
            }}
          />
          <Button
            type="submit"
            className="h-auto whitespace-nowrap rounded-[9px] bg-[var(--landing-btn-bg)] px-[22px] py-3 text-sm font-bold text-[var(--landing-btn-text)] [font-family:inherit] hover:bg-[var(--landing-btn-bg)] hover:opacity-90"
          >
            Search
          </Button>
        </form>

        <Link href="/listings/new" style={{ fontSize: 14, color: "var(--landing-muted)", fontWeight: 600, marginTop: 8 }}>
          Have spare space instead?{" "}
          <span style={{ textDecoration: "underline" }}>List it and start earning &rarr;</span>
        </Link>
      </div>

      <div
        style={{
          flex: "1 1 420px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 800,
        }}
      >
        <span
          style={{
            position: "absolute",
            fontFamily: "var(--font-landing-heading), sans-serif",
            fontWeight: 700,
            fontSize: 170,
            color: "var(--landing-ghost)",
            zIndex: 0,
            userSelect: "none",
            lineHeight: 1,
          }}
        >
          SQFT
        </span>

        <HeroFeatureCard />

        {/* animate-float (tailwind.config.ts) bobs each badge on the
            translateY axis while `--sticker-rotate` (set per-badge below)
            supplies the fixed tilt, so the idle motion doesn't fight the
            poster-sticker rotation. Staggered animationDelay keeps the
            three from bobbing in unison. */}
        <div
          className="animate-float"
          style={{
            position: "absolute",
            top: 26,
            left: -10,
            zIndex: 2,
            background: c.categoryStorage,
            color: "#FFFFFF",
            fontWeight: 800,
            fontSize: 13,
            padding: "10px 16px",
            borderRadius: 10,
            boxShadow: "0 12px 26px rgba(14,13,16,0.22)",
            ["--sticker-rotate" as string]: "rotate(-8deg)",
            animationDelay: "0s",
          }}
        >
          Storage Room
        </div>
        <div
          className="animate-float"
          style={{
            position: "absolute",
            top: 180,
            right: -24,
            zIndex: 2,
            background: c.categoryGarage,
            color: c.ink,
            fontWeight: 800,
            fontSize: 13,
            padding: "10px 16px",
            borderRadius: 10,
            boxShadow: "0 12px 26px rgba(14,13,16,0.18)",
            ["--sticker-rotate" as string]: "rotate(6deg)",
            animationDelay: "1.1s",
          }}
        >
          Garage Bay
        </div>
        <div
          className="animate-float"
          style={{
            position: "absolute",
            bottom: 8,
            left: 16,
            zIndex: 2,
            background: c.categoryWarehouse,
            color: "#FFFFFF",
            fontWeight: 800,
            fontSize: 13,
            padding: "10px 16px",
            borderRadius: 10,
            boxShadow: "0 12px 26px rgba(14,13,16,0.18)",
            ["--sticker-rotate" as string]: "rotate(-4deg)",
            animationDelay: "2.2s",
          }}
        >
          Warehouse
        </div>
      </div>
    </div>
  );
}
