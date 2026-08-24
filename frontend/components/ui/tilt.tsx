"use client";

import { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

const SPRING = { stiffness: 300, damping: 22, mass: 0.6 };

export type TiltHandle<T extends HTMLElement = HTMLElement> = {
  ref: React.RefObject<T>;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  glareBackground: MotionValue<string>;
  glareOpacity: MotionValue<number>;
  onMouseMove: (e: React.MouseEvent<T>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

// Aceternity-style "3D Card Effect" (https://ui.aceternity.com/components/3d-card-effect):
// the card tilts in 3D toward the cursor (rotateX/rotateY driven by pointer
// position within the card) and a soft radial glare sweeps across the
// surface, like light catching glass. Exposed as a hook rather than a
// wrapper component so it can drive very differently-shaped cards (a plain
// motion.div, a motion(Link), ...) without forcing one DOM shape on every
// caller — spread the returned ref/handlers/motion values onto whichever
// `motion.*` element is the card face, and render <TiltGlare handle={...} />
// as its last child. The element (or an ancestor) needs `perspective` set
// for the tilt to read as actual depth rather than a flat skew.
export function useTiltEffect<T extends HTMLElement = HTMLElement>(maxTiltDeg = 10): TiltHandle<T> {
  const ref = useRef<T>(null);

  // Raw pointer position normalized to 0..1 across the element.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(py, [0, 1], [maxTiltDeg, -maxTiltDeg]), SPRING);
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTiltDeg, maxTiltDeg]), SPRING);

  const glareX = useTransform(px, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(py, [0, 1], ["0%", "100%"]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.65), transparent 60%)`;
  const glareOpacity = useSpring(0, SPRING);

  function onMouseMove(e: React.MouseEvent<T>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }

  function onMouseEnter() {
    glareOpacity.set(1);
  }

  function onMouseLeave() {
    px.set(0.5);
    py.set(0.5);
    glareOpacity.set(0);
  }

  return { ref, rotateX, rotateY, glareBackground, glareOpacity, onMouseMove, onMouseEnter, onMouseLeave };
}

// The moving highlight layer for a tilted card. Render as the last child of
// the tilted element itself (so it inherits its border-radius and gets
// clipped by `overflow: hidden`).
export function TiltGlare<T extends HTMLElement = HTMLElement>({ handle }: { handle: TiltHandle<T> }) {
  return (
    <motion.div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        pointerEvents: "none",
        background: handle.glareBackground,
        opacity: handle.glareOpacity,
        mixBlendMode: "overlay",
      }}
    />
  );
}
