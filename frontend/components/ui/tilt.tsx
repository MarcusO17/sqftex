"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";

const TILT_SPRING = { stiffness: 300, damping: 22, mass: 0.6 };
const GLARE_FADE_SPRING = { stiffness: 400, damping: 32, mass: 0.4 };
const GLARE_SIZE = 220; // px diameter of the moving highlight blob

export type TiltHandle<T extends HTMLElement = HTMLElement> = {
  ref: React.RefObject<T>;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  glareX: MotionValue<number>;
  glareY: MotionValue<number>;
  glareOpacity: MotionValue<number>;
  onMouseMove: (e: React.MouseEvent<T>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

// Aceternity-style "3D Card Effect" (https://ui.aceternity.com/components/3d-card-effect):
// the card tilts in 3D toward the cursor (rotateX/rotateY driven by pointer
// position within the card) plus a small glare blob that tracks the cursor.
//
// Perf note: an earlier version recomputed a full-card `background:
// radial-gradient(...)` string every pointer-move frame and blended it with
// `mix-blend-mode` over the whole card — that's a repaint (not just a
// compositor step) across a large area every frame, which is what made it
// feel laggy. This version instead translates a small, fixed-size glare
// element via `x`/`y` (a `transform`, compositor-only) and tracks the
// pointer directly with no spring on the glare position, so it never lags
// behind the cursor — only the tilt itself and the glare's fade in/out are
// sprung.
export function useTiltEffect<T extends HTMLElement = HTMLElement>(maxTiltDeg = 10): TiltHandle<T> {
  const ref = useRef<T>(null);

  // Normalized 0..1 position, used for the tilt angle.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [maxTiltDeg, -maxTiltDeg]), TILT_SPRING);
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTiltDeg, maxTiltDeg]), TILT_SPRING);

  // Raw pixel position within the card, used to place the glare blob —
  // unsprung so it stays glued to the cursor instead of trailing it.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const glareX = useTransform(rawX, (v) => v - GLARE_SIZE / 2);
  const glareY = useTransform(rawY, (v) => v - GLARE_SIZE / 2);
  const glareOpacity = useSpring(0, GLARE_FADE_SPRING);

  function onMouseMove(e: React.MouseEvent<T>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    px.set(relX / rect.width);
    py.set(relY / rect.height);
    rawX.set(relX);
    rawY.set(relY);
  }

  function onMouseEnter() {
    glareOpacity.set(1);
  }

  function onMouseLeave() {
    px.set(0.5);
    py.set(0.5);
    glareOpacity.set(0);
  }

  return { ref, rotateX, rotateY, glareX, glareY, glareOpacity, onMouseMove, onMouseEnter, onMouseLeave };
}

// The moving highlight — a small blurred blob, not a full-card wash, so the
// `mix-blend-mode` compositing cost stays cheap. Render as the last child of
// the tilted element (needs `overflow: hidden` + `position: relative` on
// that element so the blob clips to the card and doesn't get placed
// relative to some further-out ancestor).
export function TiltGlare<T extends HTMLElement = HTMLElement>({ handle }: { handle: TiltHandle<T> }) {
  return (
    <motion.div
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: GLARE_SIZE,
        height: GLARE_SIZE,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,255,255,0.55), transparent 70%)",
        mixBlendMode: "overlay",
        pointerEvents: "none",
        opacity: handle.glareOpacity,
        x: handle.glareX,
        y: handle.glareY,
      }}
    />
  );
}
