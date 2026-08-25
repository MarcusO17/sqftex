"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Camera, Home, MapPin, Package, PackageCheck, PenLine, Tag, type LucideIcon } from "lucide-react";

// Replaces the mascot (and, before that, the isometric diorama and a plain
// progress ring) as the wizard's illustration pane: a blueprint-style floor
// plan sized to the listing's actual sqft, with a few box icons filling in
// as size grows — a light, flat nod to "how much fits" without the earlier
// isometric diorama's complexity. Overall wizard progress is already shown
// by the progress bar above the panel, so this pane is free to be about the
// space itself instead of duplicating that.
//
// The current step still gets a small icon, now a corner badge on the plan
// rather than the centerpiece. Steps 0-2 (Type/Basics/Location) read as
// "describing the space" and use --primary; 3-5 (Pricing/Photos/Review)
// read as "getting it ready to publish" and use --secondary.
//
// Two moments are specific rather than reusing the generic per-step ripple:
// the plan's outline traces itself in once on first mount (see introDone
// below), and the Location step gives the whole plan a compass-snap
// rotation instead of just pulsing the badge.
const STEP_ICONS: { Icon: LucideIcon; accent: "primary" | "secondary" }[] = [
  { Icon: Home, accent: "primary" }, // Type
  { Icon: PenLine, accent: "primary" }, // Basics
  { Icon: MapPin, accent: "primary" }, // Location
  { Icon: Tag, accent: "secondary" }, // Pricing
  { Icon: Camera, accent: "secondary" }, // Photos
  { Icon: PackageCheck, accent: "secondary" }, // Review — sealed & ready, not a party
];

// Location is where the plan itself reacts, not just the corner badge: a
// quick rotational overshoot-then-settle, like a compass needle finding
// north, rather than the generic ripple every other step gets. Index must
// stay in sync with STEP_ICONS above (2 = MapPin/Location).
const LOCATION_STEP_INDEX = 2;
const compassTransition = { duration: 0.5, ease: "easeOut" as const };

// Fixed slots inside the plan (percent of its own box) — revealed in this
// order as sqft grows, not randomly scattered, so the same size always
// looks the same.
const BOX_SLOTS = [
  { x: 20, y: 28 },
  { x: 50, y: 22 },
  { x: 78, y: 30 },
  { x: 27, y: 62 },
  { x: 58, y: 66 },
  { x: 82, y: 60 },
];
const PLAN_BASE_W = 212;
const PLAN_BASE_H = 150;
// Area-proportional (sqrt of sqft), clamped so the plan neither vanishes at
// the RangeSlider's 50 sqft floor nor blows past the pane at its 2,000 max.
function planScale(sqft: number) {
  const s = Math.sqrt(Math.max(sqft, 1) / 500);
  return Math.min(1.55, Math.max(0.55, s));
}
function boxCountFor(sqft: number) {
  return Math.max(0, Math.min(BOX_SLOTS.length, Math.round(sqft / 350)));
}

const badgeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 22, staggerChildren: 0.08, delayChildren: 0.04 },
  },
  exit: { opacity: 0, scale: 0.7, transition: { duration: 0.15 } },
};
const iconVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5, rotate: -14 },
  visible: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 340, damping: 20 } },
};
const tapeVariants: Variants = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: { opacity: 1, scaleX: 1, transition: { type: "spring", stiffness: 320, damping: 18 } },
};
const thudVariants: Variants = {
  hidden: { opacity: 0.6, scale: 0.8 },
  visible: { opacity: 0, scale: 1.5, transition: { duration: 0.5, ease: "easeOut" } },
};
// Same idea as thudVariants but lighter — plays behind every step's badge
// (Review gets the tape/thud seal instead) so switching steps always reads
// as a small event on the illustration, not just a swapped icon.
const rippleVariants: Variants = {
  hidden: { opacity: 0.55, scale: 0.55 },
  visible: { opacity: 0, scale: 1.7, transition: { duration: 0.55, ease: "easeOut" } },
};
// Gentle idle bob so the plan doesn't go dead-still between steps — quick
// enough to read as "alive", slow enough not to compete with step changes.
const bobTransition = { duration: 3.6, repeat: Infinity, ease: "easeInOut" as const };

// Review step's signature moment: a strip of packing tape sweeps across the
// corner badge and seals with a small pulse — specific to a storage listing
// going live, rather than generic confetti.
function SealMoment() {
  return (
    <>
      <motion.span className="wizard-step-thud" variants={thudVariants} />
      <span className="wizard-step-tape-wrap">
        <motion.span className="wizard-step-tape" variants={tapeVariants} />
      </span>
    </>
  );
}

export function StepIllustration({
  globalStepIndex,
  globalStepCount,
  sqft,
}: {
  globalStepIndex: number;
  globalStepCount: number;
  sqft: number;
}) {
  const reduceMotion = useReducedMotion();
  const { Icon, accent } = STEP_ICONS[globalStepIndex] ?? STEP_ICONS[0];
  const accentVar = `var(--${accent})`;
  const isLastStep = globalStepIndex === globalStepCount - 1;
  const isLocationStep = globalStepIndex === LOCATION_STEP_INDEX;

  const scale = planScale(sqft);
  const boxCount = boxCountFor(sqft);
  const planW = PLAN_BASE_W * scale;
  const planH = PLAN_BASE_H * scale;

  // First-load-only "drawn in" moment: the outline traces itself once
  // (like a blueprint being sketched) instead of just appearing. Never
  // replays after that — introDone only ever goes false -> true.
  const [introDone, setIntroDone] = useState(false);
  const showIntroDraw = !introDone && !reduceMotion;

  return (
    <div className="wizard-step-illus">
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
        transition={reduceMotion ? undefined : bobTransition}
      >
        <motion.div
          className={`wizard-step-plan${showIntroDraw ? " wizard-step-plan-introing" : ""}`}
          style={{ borderColor: accentVar }}
          animate={{ width: planW, height: planH, rotate: isLocationStep ? [0, -3, 2, 0] : 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  width: { type: "spring", stiffness: 210, damping: 24 },
                  height: { type: "spring", stiffness: 210, damping: 24 },
                  rotate: compassTransition,
                }
          }
        >
          {showIntroDraw && (
            <svg className="wizard-step-plan-draw" viewBox={`0 0 ${planW} ${planH}`}>
              <motion.rect
                x={1.25}
                y={1.25}
                width={Math.max(planW - 2.5, 0)}
                height={Math.max(planH - 2.5, 0)}
                rx={14}
                ry={14}
                fill="none"
                stroke={accentVar}
                strokeWidth={2.5}
                initial={{ pathLength: 0, opacity: 1 }}
                animate={{ pathLength: 1, opacity: [1, 1, 0] }}
                transition={{
                  pathLength: { duration: 0.7, ease: "easeInOut" },
                  opacity: { duration: 0.9, times: [0, 0.78, 1], ease: "easeInOut" },
                }}
                onAnimationComplete={() => setIntroDone(true)}
              />
            </svg>
          )}

          <AnimatePresence>
            {BOX_SLOTS.slice(0, boxCount).map((slot, i) => (
              <motion.div
                key={i}
                className="wizard-step-plan-box"
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.4, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.4 }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 16 }}
              >
                <Package size={17} color={accentVar} strokeWidth={2.25} />
              </motion.div>
            ))}
          </AnimatePresence>

          <span className="wizard-step-plan-label">{sqft.toLocaleString()} sqft</span>

          <AnimatePresence mode="wait">
            <motion.div
              key={globalStepIndex}
              className="wizard-step-illus-badge"
              style={{ background: `color-mix(in srgb, ${accentVar} 14%, var(--card))` }}
              variants={reduceMotion ? undefined : badgeVariants}
              initial={reduceMotion ? false : "hidden"}
              animate="visible"
              exit={reduceMotion ? undefined : "exit"}
            >
              <motion.div variants={reduceMotion ? undefined : iconVariants}>
                <Icon size={26} color={accentVar} strokeWidth={2.25} />
              </motion.div>
              {!isLastStep && !reduceMotion && (
                <motion.span className="wizard-step-ripple" style={{ color: accentVar }} variants={rippleVariants} />
              )}
              {isLastStep && !reduceMotion && <SealMoment />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
