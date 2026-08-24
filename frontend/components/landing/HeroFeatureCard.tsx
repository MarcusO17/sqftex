"use client";

import { useRef, useState } from "react";
import { landingColors as c } from "./tokens";

// Aceternity-style 3D tilt card (see "3D Card Effect" at
// https://ui.aceternity.com/components): the card tilts in 3D toward the
// cursor and a soft light follows the pointer, settling back to flat on
// mouse leave. Reimplemented here with plain mousemove + CSS transforms
// instead of the framer-motion version Aceternity ships, since this is the
// only place on the page that needs it and doesn't warrant a new animation
// dependency. It's the one piece of Hero.tsx that needs real interactivity
// (mouse position), so it's split out as its own client component — Hero
// itself stays a Server Component.
export function HeroFeatureCard() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glowX: 50, glowY: 50, scale: 1 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rotateX: (0.5 - py) * 14,
      rotateY: (px - 0.5) * 14,
      glowX: px * 100,
      glowY: py * 100,
      scale: 1.03,
    });
  }

  function handleMouseLeave() {
    setTilt({ rotateX: 0, rotateY: 0, glowX: 50, glowY: 50, scale: 1 });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        zIndex: 1,
        width: 480,
        height: 520,
        borderRadius: 28,
        background: `radial-gradient(circle at ${tilt.glowX}% ${tilt.glowY}%, rgba(255,255,255,0.28), transparent 55%), ${c.accent}`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: 40,
        boxShadow: "0 30px 70px rgba(8,145,178,0.28)",
        transform: `perspective(900px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`,
        transition: "transform 0.2s ease-out, background 0.2s ease-out",
        willChange: "transform",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-landing-heading), sans-serif",
          fontWeight: 700,
          fontSize: 44,
          color: "#FFFFFF",
          lineHeight: 1.1,
        }}
      >
        No lease.
      </span>
      <span style={{ fontSize: 16, fontWeight: 600, color: "#CFF0F6", marginTop: 12 }}>
        Book any space by the day or the month &mdash; cancel anytime.
      </span>
    </div>
  );
}
