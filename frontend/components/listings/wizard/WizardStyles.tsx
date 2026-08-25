// Scoped CSS for the listing wizard (all classes prefixed `wizard-` to avoid
// colliding with the global .field/.chip/.seg classes in app/globals.css).
// Rendered once by WizardShell. Plain <style> + dangerouslySetInnerHTML —
// same reasoning as LandingStyles.tsx: browsers parse <style> content as raw
// text, so a JSX text child would get HTML-escaped by React and mismatch on
// hydration; dangerouslySetInnerHTML skips that.
const css = `
  .wizard-root {
    width: 100%;
    min-height: 100vh;
    background: var(--paper);
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-areas: "progress progress" "top top" "illus stage" "bottom bottom";
    grid-template-rows: 4px auto 1fr auto;
  }
  @media (max-width: 860px) {
    .wizard-root { grid-template-columns: 1fr; grid-template-areas: "progress" "top" "illus" "stage" "bottom"; }
    .wizard-illustration { min-height: 320px; border-right: none !important; border-bottom: 1px solid var(--line); }
  }

  .wizard-progress-track { grid-area: progress; height: 4px; width: 100%; background: var(--line); overflow: hidden; }
  .wizard-progress-fill { position: relative; height: 100%; overflow: hidden; background: linear-gradient(90deg, var(--secondary), var(--primary)); transition: width .5s cubic-bezier(.34,1.56,.64,1); }
  /* Soft sheen sweeping the filled portion — keeps the bar feeling alive
     between steps rather than just sitting there once it stops growing. */
  .wizard-progress-fill::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent);
    transform: translateX(-100%);
    animation: wizardShimmer 2.4s ease-in-out infinite;
  }
  @keyframes wizardShimmer { 0% { transform: translateX(-100%); } 55%, 100% { transform: translateX(100%); } }

  .wizard-topbar { grid-area: top; display: flex; align-items: center; justify-content: space-between; padding: 22px clamp(24px, 4vw, 56px) 0; }
  .wizard-wordmark { font-family: var(--font-heading); font-weight: 800; font-size: 14px; }
  .wizard-stepcount { font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: hsl(var(--muted-foreground)); font-variant-numeric: tabular-nums; }

  .wizard-illustration { grid-area: illus; position: relative; overflow: hidden; border-right: 1px solid var(--line); display: flex; align-items: center; justify-content: center; background: var(--card); }

  /* ---- step illustration (StepIllustration) — icon + progress ring, motion
     handled by Framer Motion in the component itself, not CSS keyframes, so
     prefers-reduced-motion is handled once via useReducedMotion() rather
     than duplicated here. ---- */
  .wizard-step-illus { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; }

  /* The floor plan itself — width/height are animated inline by Framer
     Motion (see StepIllustration), everything else lives here. Grid is two
     faint repeating gradients rather than an SVG pattern so it scales with
     the div's own animated size for free. */
  .wizard-step-plan {
    position: relative; border-width: 2.5px; border-style: dashed; border-radius: 14px;
    background:
      repeating-linear-gradient(0deg, transparent 0 13px, color-mix(in srgb, var(--line) 65%, transparent) 13px 14px),
      repeating-linear-gradient(90deg, transparent 0 13px, color-mix(in srgb, var(--line) 65%, transparent) 13px 14px),
      var(--card);
  }
  /* First-load only: outline is transparent while the SVG trace (below)
     draws it in, so the dashed CSS border doesn't "double up" with the
     solid trace mid-animation. */
  .wizard-step-plan.wizard-step-plan-introing { border-color: transparent; }
  .wizard-step-plan-draw { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
  .wizard-step-plan-box {
    position: absolute; transform: translate(-50%, -50%);
    width: 28px; height: 28px; border-radius: 7px;
    background: var(--paper); box-shadow: 0 1px 4px rgba(14,13,16,.16);
    display: flex; align-items: center; justify-content: center;
  }
  .wizard-step-plan-label {
    position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%);
    background: var(--card); padding: 3px 9px; border-radius: 7px;
    font-size: 12.5px; font-weight: 800; letter-spacing: .02em; color: hsl(var(--muted-foreground));
    font-variant-numeric: tabular-nums; white-space: nowrap;
  }

  /* Current step's icon — a small corner badge pinned to the plan, not the
     centerpiece it was when the illustration was just a progress ring. */
  .wizard-step-illus-badge {
    position: absolute; top: -18px; right: -18px; width: 50px; height: 50px;
    border-radius: 50%; border: 3px solid var(--paper); box-shadow: 0 3px 10px rgba(14,13,16,.2);
    overflow: hidden; display: flex; align-items: center; justify-content: center;
  }

  /* Review step's signature moment: a strip of packing tape sweeps across
     the badge and seals with a small pulse — replaces generic confetti with
     something specific to a storage listing going live. Static wrapper
     handles centering/rotation; the animated inner strip only ever
     animates scaleX/opacity from its left edge, so the two transforms never
     have to compose into one matrix. */
  .wizard-step-tape-wrap {
    position: absolute; left: 50%; top: 50%; width: 130%; height: 15%;
    transform: translate(-50%, -50%) rotate(-18deg);
    z-index: 1; pointer-events: none;
  }
  .wizard-step-tape {
    display: block; width: 100%; height: 100%; transform-origin: left center;
    background: color-mix(in srgb, var(--secondary) 55%, var(--card));
    border-top: 1px solid var(--secondary-dark); border-bottom: 1px solid var(--secondary-dark);
  }
  .wizard-step-thud {
    position: absolute; left: 50%; top: 50%; width: 70%; height: 70%; transform: translate(-50%, -50%);
    border-radius: 50%; border: 2px solid var(--secondary); pointer-events: none; z-index: 1;
  }

  /* Generic step-change ripple on the badge (every step but Review, which
     gets the tape/thud seal instead) — a quick pulse so switching steps
     reads as an event on the illustration, not just a swapped icon. */
  .wizard-step-ripple {
    position: absolute; left: 50%; top: 50%; width: 70%; height: 70%; transform: translate(-50%, -50%);
    border-radius: 50%; border: 2px solid currentColor; pointer-events: none; z-index: 1;
  }

  /* ---- Review step's 3D scene (WizardReviewScene) — the wizard's one
     WebGL moment, only ever mounted on the last step. Sized to roughly the
     blueprint plan's own max footprint so the crossfade between the two
     doesn't visibly jump. ---- */
  .wizard-review-scene-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; width: min(260px, 92%); }
  .wizard-review-canvas { width: 100%; height: 190px; }
  .wizard-review-caption {
    background: var(--card); padding: 3px 9px; border-radius: 7px;
    font-size: 12.5px; font-weight: 800; letter-spacing: .02em; color: hsl(var(--muted-foreground));
    font-variant-numeric: tabular-nums; white-space: nowrap;
  }

  .wizard-stage { grid-area: stage; position: relative; min-height: 56vh; touch-action: pan-y; overflow: hidden; }
  .wizard-panel {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    padding: 32px clamp(24px, 4vw, 56px); will-change: transform, opacity;
    transition: transform .5s cubic-bezier(.34,1.56,.64,1), opacity .34s ease;
  }

  .wizard-stepcol { width: 100%; max-width: 480px; animation: wizardStepIn .5s cubic-bezier(.22,1,.36,1) both; }
  @keyframes wizardStepIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  .wizard-tag { display: inline-block; background: var(--secondary); color: #fff; padding: 5px 13px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; transform: rotate(-2deg); margin-bottom: 16px; }
  .wizard-tag.wizard-tag-alt { background: var(--primary); }
  .wizard-title { font-family: var(--font-heading); font-weight: 800; margin: 0 0 10px; font-size: clamp(24px, 3vw, 36px); line-height: 1.1; letter-spacing: -.01em; }
  .wizard-sub { margin: 0 0 26px; font-size: 14.5px; color: hsl(var(--muted-foreground)); line-height: 1.55; max-width: 46ch; }

  .wizard-catgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .wizard-cattile { border: 1.5px solid var(--line); border-radius: 14px; padding: 16px; font-size: 13.5px; font-weight: 700; background: var(--paper); cursor: pointer; text-align: left; color: var(--ink); display: flex; align-items: center; gap: 10px; transition: border-color .2s, background-color .2s, box-shadow .2s, transform .18s cubic-bezier(.22,1,.36,1); font-family: inherit; }
  .wizard-cattile:hover { transform: translateY(-3px); box-shadow: 0 8px 16px rgba(14,13,16,.12); }
  .wizard-cattile:active { transform: translateY(-1px) scale(.97); }
  .wizard-cattile .wizard-badge { width: 34px; height: 34px; border-radius: 9px; background: var(--card); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; transition: transform .18s cubic-bezier(.22,1,.36,1); }
  .wizard-cattile:hover .wizard-badge { transform: scale(1.1) rotate(-4deg); }
  .wizard-cattile.wizard-picked { border-color: var(--secondary); background: color-mix(in srgb, var(--secondary) 8%, var(--paper)); box-shadow: 0 0 0 4px color-mix(in srgb, var(--secondary) 16%, transparent); }
  .wizard-cattile.wizard-pulse { animation: wizardTilePop .48s cubic-bezier(.34,1.56,.64,1); }
  @keyframes wizardTilePop {
    0% { transform: scale(1) rotate(0deg); }
    35% { transform: scale(1.09) rotate(-1.5deg); }
    65% { transform: scale(1.03) rotate(1deg); }
    100% { transform: scale(1) rotate(0deg); }
  }

  .wizard-slider { padding-top: 6px; touch-action: none; }
  .wizard-slider-track { position: relative; height: 6px; border-radius: 999px; background: var(--card); cursor: pointer; }
  .wizard-slider-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--secondary), var(--primary)); transition: width .22s ease; }
  .wizard-slider-thumb { position: absolute; top: 50%; width: 22px; height: 22px; border-radius: 50%; background: var(--paper); border: 3px solid var(--primary); transform: translate(-50%, -50%); cursor: grab; box-shadow: 0 2px 6px rgba(14,13,16,.18); touch-action: none; transition: left .22s ease, transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s ease; }
  .wizard-slider-thumb.wizard-dragging { transition: transform .18s cubic-bezier(.34,1.56,.64,1); transform: translate(-50%, -50%) scale(1.22); cursor: grabbing; box-shadow: 0 4px 12px rgba(14,13,16,.26); }
  .wizard-slider-track:has(.wizard-slider-thumb.wizard-dragging) .wizard-slider-fill { transition: none; }
  .wizard-slider-bubble { position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%); background: var(--ink); color: var(--paper); font-size: 11.5px; font-weight: 800; padding: 4px 9px; border-radius: 7px; white-space: nowrap; opacity: 0; pointer-events: none; font-variant-numeric: tabular-nums; transition: opacity .18s ease; }
  .wizard-slider-bubble.wizard-show { opacity: 1; }
  .wizard-slider-scale { display: flex; justify-content: space-between; font-size: 10.5px; color: hsl(var(--muted-foreground)); margin-top: 9px; font-variant-numeric: tabular-nums; }

  .wizard-bottombar { grid-area: bottom; display: flex; justify-content: space-between; align-items: center; padding: 20px clamp(24px, 4vw, 56px) 34px; border-top: 1px solid var(--line); background: var(--paper); }
  .wizard-bottombar .btn-primary,
  .wizard-bottombar .btn-outline {
    transition: transform .16s cubic-bezier(.34,1.56,.64,1), background-color .2s ease, color .2s ease, box-shadow .2s ease;
  }
  .wizard-bottombar .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 18px color-mix(in srgb, var(--primary) 35%, transparent); }
  .wizard-bottombar .btn-primary:active:not(:disabled) { transform: translateY(0) scale(.96); }
  .wizard-bottombar .btn-outline:hover { transform: translateY(-2px); }
  .wizard-bottombar .btn-outline:active { transform: translateY(0) scale(.96); }

  @media (prefers-reduced-motion: reduce) {
    .wizard-panel { transition: opacity .2s ease; }
    .wizard-stepcol { animation: none; }
    .wizard-progress-fill, .wizard-progress-fill::after { animation: none; transition: width .2s ease; }
    .wizard-cattile, .wizard-cattile .wizard-badge, .wizard-bottombar .btn-primary, .wizard-bottombar .btn-outline, .wizard-slider-thumb {
      transition-duration: .01ms !important;
    }
  }
`;

export function WizardStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
