"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { landingColors as c } from "./tokens";

type FeatureCard = {
  id: number;
  title: string;
  body: string;
  bg: string;
};

// Placeholder copy — one highlight per card, pulled from the business rules
// in CLAUDE.md/PRD (escrow release on move-in, mandatory NRIC verification,
// no-lease "visiting" access model). Edit freely.
const FEATURE_CARDS: FeatureCard[] = [
  {
    id: 1,
    title: "No lease.",
    body: "Book any space by the day or the month — cancel anytime.",
    bg: c.accent,
  },
  {
    id: 2,
    title: "NRIC-verified hosts.",
    body: "Every host completes ID verification before their listing goes live.",
    bg: c.categoryGarage,
  },
  {
    id: 3,
    title: "Escrow protected.",
    body: "Payment is held until you confirm move-in — never released early.",
    bg: c.categoryWarehouse,
  },
  {
    id: 4,
    title: "Search in minutes.",
    body: "No paperwork, no long contracts, no hidden fees.",
    bg: c.categoryContainer,
  },
];

const CARD_OFFSET = 8;
const SCALE_FACTOR = 0.05;

// Cards behind the front one fan out to alternating sides (like a hand of
// playing cards) instead of stacking dead-center — the front card (index 0)
// stays flat and centered since it's the one being read/clicked; only the
// peeking cards behind it fan.
function fanTransform(index: number) {
  if (index === 0) return { rotate: 0, x: 0 };
  const side = index % 2 === 1 ? 1 : -1;
  const magnitude = Math.ceil(index / 2);
  return { rotate: side * magnitude * 7, x: side * magnitude * 18 };
}

// Aceternity-style "Card Stack" (https://ui.aceternity.com/components/card-stack):
// a deck of cards peeking out behind one another. Aceternity's own version
// auto-advances on a timer (built for a testimonial marquee); this one
// advances on click instead, since here it's a feature highlight the visitor
// is meant to flip through deliberately, not a passive loop. All four cards
// stay mounted the whole time — flipping just reorders the array, so
// framer-motion animates each card's position/scale/z-index between spots
// in the stack rather than mounting/unmounting anything.
export function HeroFeatureCard() {
  const [cards, setCards] = useState(FEATURE_CARDS);

  function advance() {
    setCards((prev) => {
      const next = [...prev];
      next.push(next.shift()!);
      return next;
    });
  }

  return (
    <div style={{ position: "relative", zIndex: 1, width: 480, height: 520 }}>
      {cards.map((card, index) => {
        const isFront = index === 0;
        const fan = fanTransform(index);
        return (
          <motion.div
            key={card.id}
            onClick={isFront ? advance : undefined}
            animate={{
              top: index * -CARD_OFFSET,
              x: fan.x,
              rotate: fan.rotate,
              scale: 1 - index * SCALE_FACTOR,
              zIndex: cards.length - index,
            }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            whileHover={isFront ? { scale: 1 - index * SCALE_FACTOR + 0.015 } : undefined}
            whileTap={isFront ? { scale: 1 - index * SCALE_FACTOR - 0.02 } : undefined}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              transformOrigin: "bottom center",
              width: 480,
              height: 480,
              borderRadius: 28,
              background: card.bg,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: 40,
              boxShadow: "0 30px 70px rgba(14,13,16,0.28)",
              cursor: isFront ? "pointer" : "default",
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
              {card.title}
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 12 }}>
              {card.body}
            </span>
            {isFront && (
              <span
                style={{
                  position: "absolute",
                  top: 20,
                  right: 24,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.7)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Tap to flip &rarr;
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
