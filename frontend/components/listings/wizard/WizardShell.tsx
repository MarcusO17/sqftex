"use client";

import { useEffect, useRef } from "react";
import { WizardStyles } from "./WizardStyles";
import { WizardMascot } from "./WizardMascot";
import { SceneIllustration } from "./SceneIllustration";

export const STEP_PROPS = ["🔍", "✏️", "📍", "🏷️", "📸", "🎉"];

const IGNORE_SELECTOR = "input, textarea, button, [role='slider'], .wizard-slider-track";

export function WizardShell({
  steps,
  stepIndex,
  globalStepIndex,
  globalStepCount,
  category,
  onIndexChange,
  onNext,
  nextLabel,
  backDisabled,
}: {
  steps: React.ReactNode[];
  stepIndex: number;
  globalStepIndex: number;
  globalStepCount: number;
  category: string | null;
  onIndexChange: (index: number) => void;
  onNext: () => void;
  nextLabel: string;
  backDisabled?: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevIndexRef = useRef(stepIndex);

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
      nxt.style.transform = `translateX(${26 * dir}px) scale(.97)`;
      nxt.style.opacity = "0";
      nxt.style.display = "flex";
      nxt.style.zIndex = "2";
      cur.style.zIndex = "1";
      // Force a reflow so the "none" transition actually applies before we
      // remove it — otherwise the browser coalesces both style writes into
      // one paint and there's nothing to animate from.
      void nxt.offsetWidth;
      nxt.style.transition = "";
      nxt.style.transform = "translateX(0) scale(1)";
      nxt.style.opacity = "1";
      cur.style.transform = `translateX(${-26 * dir}px) scale(.97)`;
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

    let startX = 0, dx = 0, dragging = false, neighborIdx = -1, dir = 0;

    function panel(i: number) {
      return panelRefs.current[i];
    }

    function onDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (target.closest(IGNORE_SELECTOR)) return;
      dragging = true;
      startX = e.clientX;
      dx = 0;
      stage!.setPointerCapture(e.pointerId);
    }

    function onMove(e: PointerEvent) {
      if (!dragging) return;
      dx = e.clientX - startX;
      dir = dx < 0 ? 1 : -1;
      const candidate = prevIndexRef.current + dir;
      neighborIdx = candidate >= 0 && candidate < steps.length ? candidate : -1;
      if (neighborIdx === -1) dx *= 0.35;

      const cur = panel(prevIndexRef.current);
      if (!cur) return;
      cur.style.transition = "none";
      cur.style.transform = `translateX(${dx}px)`;

      if (neighborIdx !== -1) {
        const w = stage!.getBoundingClientRect().width;
        const nb = panel(neighborIdx);
        if (nb) {
          nb.style.transition = "none";
          nb.style.display = "flex";
          nb.style.opacity = "1";
          nb.style.zIndex = "0";
          cur.style.zIndex = "1";
          nb.style.transform = `translateX(${dx - dir * w}px)`;
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
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (neighborIdx !== -1 && Math.abs(dx) > threshold) {
        const nb = panel(neighborIdx)!;
        cur.style.transition = "";
        nb.style.transition = "";
        cur.style.transform = `translateX(${-dir * w}px)`;
        nb.style.transform = "translateX(0)";
        const landed = neighborIdx;
        window.setTimeout(() => {
          cur.style.display = "none";
          cur.style.transform = "";
          cur.style.zIndex = "";
          nb.style.zIndex = "";
        }, reduced ? 0 : 280);
        prevIndexRef.current = landed;
        onIndexChange(landed);
      } else {
        cur.style.transition = "";
        cur.style.transform = "translateX(0)";
        if (neighborIdx !== -1) {
          const nb = panel(neighborIdx)!;
          nb.style.transition = "";
          nb.style.transform = `translateX(${dir * w}px)`;
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
    // steps.length and onIndexChange are stable for the lifetime of a given
    // wizard page (steps array is defined once per render tree, onIndexChange
    // is a useState setter or equivalent) — re-binding on every stepIndex
    // change would drop mid-drag listeners, so this intentionally only
    // depends on the things that actually change the handler's closure.
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
        <SceneIllustration category={category} />
        <WizardMascot prop={STEP_PROPS[globalStepIndex]} celebrate={globalStepIndex === globalStepCount - 1} />
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
