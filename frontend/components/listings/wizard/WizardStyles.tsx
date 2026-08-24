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
    .wizard-illustration { min-height: 220px; border-right: none !important; border-bottom: 1px solid var(--line); }
  }

  .wizard-progress-track { grid-area: progress; height: 4px; width: 100%; background: var(--line); }
  .wizard-progress-fill { height: 100%; background: linear-gradient(90deg, var(--secondary), var(--primary)); transition: width .45s cubic-bezier(.22,1,.36,1); }

  .wizard-topbar { grid-area: top; display: flex; align-items: center; justify-content: space-between; padding: 22px clamp(24px, 4vw, 56px) 0; }
  .wizard-wordmark { font-family: var(--font-heading); font-weight: 800; font-size: 14px; }
  .wizard-stepcount { font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: hsl(var(--muted-foreground)); font-variant-numeric: tabular-nums; }

  .wizard-illustration { grid-area: illus; position: relative; overflow: hidden; border-right: 1px solid var(--line); display: flex; align-items: center; justify-content: center; background: var(--card); }
  .wizard-scene { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity .5s ease; }
  .wizard-scene.active { opacity: 1; }

  .wizard-mascot-wrap { position: relative; width: min(70%, 260px); z-index: 2; }
  .wizard-mascot { width: 100%; height: auto; overflow: visible; }
  .wizard-mascot-body { animation: wizardBob 3.2s ease-in-out infinite; transform-origin: center; }
  .wizard-mascot-shadow { animation: wizardShadowPulse 3.2s ease-in-out infinite; transform-origin: center; }
  .wizard-mascot-eye { transform-box: fill-box; transform-origin: center; animation: wizardBlink 4.6s ease-in-out infinite; }
  @keyframes wizardBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
  @keyframes wizardShadowPulse { 0%, 100% { transform: scaleX(1); opacity: .55; } 50% { transform: scaleX(.85); opacity: .35; } }
  @keyframes wizardBlink { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(.12); } }

  .wizard-mascot-prop { position: absolute; right: 6%; top: 24%; font-size: clamp(26px, 4vw, 38px); filter: drop-shadow(0 3px 4px rgba(0,0,0,.25)); animation: wizardPropIdle 3.2s ease-in-out infinite; transform-origin: bottom center; }
  @keyframes wizardPropIdle { 0%, 100% { transform: rotate(-4deg) translateY(0); } 50% { transform: rotate(4deg) translateY(-4px); } }
  .wizard-mascot-prop.wizard-pop { animation: wizardPropPop .5s cubic-bezier(.34,1.56,.64,1); }
  @keyframes wizardPropPop { 0% { transform: scale(0) rotate(-20deg); opacity: 0; } 60% { transform: scale(1.2) rotate(6deg); opacity: 1; } 100% { transform: scale(1) rotate(0); opacity: 1; } }

  .wizard-confetti-piece { position: absolute; left: 50%; top: 38%; width: 8px; height: 8px; opacity: 0; pointer-events: none; }
  .wizard-confetti-piece.wizard-burst { animation: wizardConfettiBurst .9s ease-out forwards; }
  @keyframes wizardConfettiBurst {
    0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
    100% { transform: translate(var(--wtx), var(--wty)) rotate(var(--wrot)); opacity: 0; }
  }

  .wizard-stage { grid-area: stage; position: relative; min-height: 56vh; touch-action: pan-y; overflow: hidden; }
  .wizard-panel { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 32px clamp(24px, 4vw, 56px); transition: transform .46s cubic-bezier(.22,1,.36,1), opacity .32s ease; }

  .wizard-stepcol { width: 100%; max-width: 480px; }
  .wizard-tag { display: inline-block; background: var(--secondary); color: #fff; padding: 5px 13px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; transform: rotate(-2deg); margin-bottom: 16px; }
  .wizard-tag.wizard-tag-alt { background: var(--primary); }
  .wizard-title { font-family: var(--font-heading); font-weight: 800; margin: 0 0 10px; font-size: clamp(24px, 3vw, 36px); line-height: 1.1; letter-spacing: -.01em; }
  .wizard-sub { margin: 0 0 26px; font-size: 14.5px; color: hsl(var(--muted-foreground)); line-height: 1.55; max-width: 46ch; }

  .wizard-catgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .wizard-cattile { border: 1.5px solid var(--line); border-radius: 14px; padding: 16px; font-size: 13.5px; font-weight: 700; background: var(--paper); cursor: pointer; text-align: left; color: var(--ink); display: flex; align-items: center; gap: 10px; transition: border-color .2s, background-color .2s, box-shadow .2s; font-family: inherit; }
  .wizard-cattile .wizard-badge { width: 34px; height: 34px; border-radius: 9px; background: var(--card); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
  .wizard-cattile.wizard-picked { border-color: var(--secondary); background: color-mix(in srgb, var(--secondary) 8%, var(--paper)); box-shadow: 0 0 0 4px color-mix(in srgb, var(--secondary) 16%, transparent); }
  .wizard-cattile.wizard-pulse { animation: wizardTilePop .42s cubic-bezier(.34,1.56,.64,1); }
  @keyframes wizardTilePop { 0% { transform: scale(1); } 45% { transform: scale(1.07); } 100% { transform: scale(1); } }

  .wizard-slider { padding-top: 6px; touch-action: none; }
  .wizard-slider-track { position: relative; height: 6px; border-radius: 999px; background: var(--card); cursor: pointer; }
  .wizard-slider-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--secondary), var(--primary)); transition: width .22s ease; }
  .wizard-slider-thumb { position: absolute; top: 50%; width: 22px; height: 22px; border-radius: 50%; background: var(--paper); border: 3px solid var(--primary); transform: translate(-50%, -50%); cursor: grab; box-shadow: 0 2px 6px rgba(14,13,16,.18); touch-action: none; transition: left .22s ease; }
  .wizard-slider-thumb.wizard-dragging { transition: none; cursor: grabbing; }
  .wizard-slider-track:has(.wizard-slider-thumb.wizard-dragging) .wizard-slider-fill { transition: none; }
  .wizard-slider-bubble { position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%); background: var(--ink); color: var(--paper); font-size: 11.5px; font-weight: 800; padding: 4px 9px; border-radius: 7px; white-space: nowrap; opacity: 0; pointer-events: none; font-variant-numeric: tabular-nums; transition: opacity .18s ease; }
  .wizard-slider-bubble.wizard-show { opacity: 1; }
  .wizard-slider-scale { display: flex; justify-content: space-between; font-size: 10.5px; color: hsl(var(--muted-foreground)); margin-top: 9px; font-variant-numeric: tabular-nums; }

  .wizard-bottombar { grid-area: bottom; display: flex; justify-content: space-between; align-items: center; padding: 20px clamp(24px, 4vw, 56px) 34px; border-top: 1px solid var(--line); background: var(--paper); }

  @media (prefers-reduced-motion: reduce) {
    .wizard-mascot-body, .wizard-mascot-shadow, .wizard-mascot-eye, .wizard-mascot-prop { animation: none !important; }
  }
`;

export function WizardStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
