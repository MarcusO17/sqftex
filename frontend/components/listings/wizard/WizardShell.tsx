"use client";

import { useEffect, useRef } from "react";
import { WizardStyles } from "./WizardStyles";
import { StepIllustration } from "./StepIllustration";

const IGNORE_SELECTOR = "input, textarea, button, [role='slider'], .wizard-slider-track";

export function WizardShell({
  steps,
  stepIndex,
  globalStepIndex,
  globalStepCount,
  sqft,
  onIndexChange,
  onNext,
  nextLabel,
  backDisabled,
}: {
  steps: React.ReactNode[];
  stepIndex: number;
  globalStepIndex: number;
  globalStepCount: number;
  sqft: number;
  onIndexChange: (index: number) => void;
  onNext: () => void;
  nextLabel: string;
  backDisabled?: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevIndexRef = useRef(stepIndex);

  // The swipe effect below binds its DOM listeners exactly once (its deps are
  // mount-stable on purpose), so it would otherwise close over the very first
  // `onIndexChange` forever. Callers pass a *stateful* guard here (it reads
  // stepIndex/category from component state), so a frozen copy would make
  // decisions against render-0 state and silently drop the navigation. Keep
  // the latest one in a ref and call through that instead.
  const onIndexChangeRef = useRef(onIndexChange);
  useEffect(() => {
    onIndexChangeRef.current = onIndexChange;
  }, [onIndexChange]);

  // Button/programmatic navigation: animate whenever stepIndex changes from
  // the outside (not from the swipe handler below, which manages its own
  // transform/opacity directly and calls onIndexChange only once settled).
  useEffect(() => {
    const prev = prevIndexRef.current;
    if (prev === stepIndex) return;
    const dir = stepIndex > prev ? 1 : -1;
    const cur = panelRefs.current[prev];
    const nxt = panelRefs.current[stepIndex];
    if (cur && nxt) {
      nxt.style.transition = "none";
      nxt.style.transform = `translateX(${26 * dir}px) scale(.97) rotate(${2 * dir}deg)`;
      nxt.style.opacity = "0";
      nxt.style.display = "flex";
      nxt.style.zIndex = "2";
      cur.style.zIndex = "1";
      // Force a reflow so the "none" transition actually applies before we
      // remove it — otherwise the browser coalesces both style writes into
      // one paint and there's nothing to animate from.
      void nxt.offsetWidth;
      nxt.style.transition = "";
      nxt.style.transform = "translateX(0) scale(1) rotate(0deg)";
      nxt.style.opacity = "1";
      cur.style.transform = `translateX(${-26 * dir}px) scale(.97) rotate(${-2 * dir}deg)`;
      cur.style.opacity = "0";
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.setTimeout(() => {
        cur.style.display = "none";
        cur.style.transform = "";
        cur.style.opacity = "";
        cur.style.zIndex = "";
        nxt.style.zIndex = "";
      }, reduced ? 0 : 460);
    }
    prevIndexRef.current = stepIndex;
  }, [stepIndex]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let startX = 0, dx = 0, dragging = false, neighborIdx = -1, dir = 0, reducedMotion = false;
    // Velocity sample for momentum flicks: last pointermove's position/time,
    // so onUp can tell "slow drag past the distance threshold" apart from
    // "fast flick that hasn't traveled far yet" and honor the latter too.
    let lastX = 0, lastT = 0, velocity = 0;
    const FLICK_VELOCITY = 0.6; // px/ms

    function panel(i: number) {
      return panelRefs.current[i];
    }

    function onDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (target.closest(IGNORE_SELECTOR)) return;
      dragging = true;
      startX = e.clientX;
      dx = 0;
      lastX = e.clientX;
      lastT = e.timeStamp;
      velocity = 0;
      reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stage!.setPointerCapture(e.pointerId);
    }

    function onMove(e: PointerEvent) {
      if (!dragging) return;
      dx = e.clientX - startX;
      dir = dx < 0 ? 1 : -1;
      const candidate = prevIndexRef.current + dir;
      neighborIdx = candidate >= 0 && candidate < steps.length ? candidate : -1;
      if (neighborIdx === -1) dx *= 0.35;

      const dt = e.timeStamp - lastT;
      if (dt > 0) velocity = (e.clientX - lastX) / dt;
      lastX = e.clientX;
      lastT = e.timeStamp;

      const cur = panel(prevIndexRef.current);
      if (!cur) return;
      cur.style.transition = "none";
      // A light rotation tilt keyed off drag distance — clamped so it stays
      // a tactile nudge rather than a full card-flip.
      const tilt = reducedMotion ? 0 : Math.max(-6, Math.min(6, dx / 22));
      cur.style.transform = `translateX(${dx}px) rotate(${tilt}deg)`;

      if (neighborIdx !== -1) {
        const w = stage!.getBoundingClientRect().width;
        const nb = panel(neighborIdx);
        if (nb) {
          nb.style.transition = "none";
          nb.style.display = "flex";
          nb.style.opacity = "1";
          nb.style.zIndex = "0";
          cur.style.zIndex = "1";
          nb.style.transform = `translateX(${dx - dir * w}px) rotate(${tilt}deg)`;
        }
      }
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      const w = stage!.getBoundingClientRect().width;
      const cur = panel(prevIndexRef.current);
      if (!cur) return;
      const threshold = w * 0.22;
      const reduced = reducedMotion;
      // A fast flick in the swipe direction counts even if it hasn't crossed
      // the distance threshold yet — dir=1 (advancing) pairs with negative
      // velocity (moving left), dir=-1 with positive velocity.
      const flicked = Math.abs(velocity) > FLICK_VELOCITY && Math.sign(velocity) === -dir;

      if (neighborIdx !== -1 && (Math.abs(dx) > threshold || flicked)) {
        const nb = panel(neighborIdx)!;
        cur.style.transition = "";
        nb.style.transition = "";
        cur.style.transform = `translateX(${-dir * w}px) rotate(0deg)`;
        nb.style.transform = "translateX(0) rotate(0deg)";
        const landed = neighborIdx;
        window.setTimeout(() => {
          cur.style.display = "none";
          cur.style.transform = "";
          cur.style.zIndex = "";
          nb.style.zIndex = "";
        }, reduced ? 0 : 280);
        prevIndexRef.current = landed;
        onIndexChangeRef.current(landed);
      } else {
        cur.style.transition = "";
        cur.style.transform = "translateX(0) rotate(0deg)";
        if (neighborIdx !== -1) {
          const nb = panel(neighborIdx)!;
          nb.style.transition = "";
          nb.style.transform = `translateX(${dir * w}px) rotate(0deg)`;
          window.setTimeout(() => {
            nb.style.display = "none";
            nb.style.transform = "";
            nb.style.zIndex = "";
          }, reduced ? 0 : 280);
        }
      }
      neighborIdx = -1;
      dx = 0;
    }

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    return () => {
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
    };
    // Deliberately mount-stable deps: re-binding on every stepIndex change
    // would drop listeners mid-drag. Nothing state-dependent is read from this
    // closure — the current panel comes from prevIndexRef and the navigation
    // callback from onIndexChangeRef, both of which stay current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);

  return (
    <div className="wizard-root">
      <WizardStyles />
      <div className="wizard-progress-track">
        <div
          className="wizard-progress-fill"
          style={{ width: `${((globalStepIndex + 1) / globalStepCount) * 100}%` }}
        />
      </div>
      <div className="wizard-topbar">
        <div className="wizard-wordmark">sqftex</div>
        <div className="wizard-stepcount">
          Step {globalStepIndex + 1} / {globalStepCount}
        </div>
      </div>
      <div className="wizard-illustration">
        <StepIllustration globalStepIndex={globalStepIndex} globalStepCount={globalStepCount} sqft={sqft} />
      </div>
      <div className="wizard-stage" ref={stageRef}>
        {steps.map((step, i) => (
          <div
            key={i}
            className="wizard-panel"
            ref={(el) => {
              panelRefs.current[i] = el;
            }}
            style={{ display: i === stepIndex ? "flex" : "none" }}
          >
            <div className="wizard-stepcol">{step}</div>
          </div>
        ))}
      </div>
      <div className="wizard-bottombar">
        <button
          type="button"
          className="btn-outline"
          onClick={() => onIndexChange(stepIndex - 1)}
          style={{ visibility: backDisabled ? "hidden" : "visible" }}
        >
          ← Back
        </button>
        <button type="button" className="btn-primary" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
