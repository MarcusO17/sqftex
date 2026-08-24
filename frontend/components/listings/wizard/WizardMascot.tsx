"use client";

import { useEffect, useState } from "react";

// The box mascot: idle bob + blink run continuously via CSS (see
// WizardStyles). `prop` is the emoji it's holding for the current step —
// changing it re-triggers the pop-in animation the same way CategoryTile
// re-triggers its pulse. `celebrate` fires a one-shot confetti burst
// (intended for the Review step) each time it flips from false to true.
type ConfettiPiece = { id: number; tx: string; ty: string; rot: string; color: string; round: boolean };

export function WizardMascot({ prop, celebrate = false }: { prop: string; celebrate?: boolean }) {
  const [pop, setPop] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    setPop(false);
    const raf = requestAnimationFrame(() => setPop(true));
    return () => cancelAnimationFrame(raf);
  }, [prop]);

  useEffect(() => {
    if (!celebrate) return;
    const colors = ["var(--primary)", "var(--secondary)", "var(--ink)"];
    const pieces: ConfettiPiece[] = Array.from({ length: 14 }, (_, i) => {
      const angle = ((Math.PI * 2) / 14) * i + (Math.random() * 0.4 - 0.2);
      const dist = 70 + Math.random() * 40;
      return {
        id: i,
        tx: `${Math.cos(angle) * dist}px`,
        ty: `${Math.sin(angle) * dist - 20}px`,
        rot: `${Math.random() * 360}deg`,
        color: colors[i % colors.length],
        round: i % 2 !== 0,
      };
    });
    setConfetti(pieces);
    setBurst(false);
    const raf = requestAnimationFrame(() => setBurst(true));
    return () => cancelAnimationFrame(raf);
  }, [celebrate]);

  return (
    <div className="wizard-mascot-wrap">
      <svg className="wizard-mascot" viewBox="0 0 160 150" overflow="visible">
        <ellipse className="wizard-mascot-shadow" cx="80" cy="132" rx="42" ry="8" fill="var(--ink)" opacity=".18" />
        <g className="wizard-mascot-body">
          <line x1="35" y1="88" x2="14" y2="72" stroke="var(--secondary-dark)" strokeWidth="6" strokeLinecap="round" />
          <line x1="125" y1="88" x2="146" y2="72" stroke="var(--secondary-dark)" strokeWidth="6" strokeLinecap="round" />
          <rect x="35" y="52" width="90" height="70" rx="10" fill="var(--secondary)" />
          <rect x="35" y="52" width="90" height="16" rx="8" fill="var(--secondary-dark)" />
          <rect x="70" y="38" width="20" height="42" fill="var(--primary)" />
          <rect x="35" y="78" width="90" height="11" fill="var(--primary)" />
          <circle className="wizard-mascot-eye" cx="63" cy="102" r="6" fill="var(--ink)" />
          <circle className="wizard-mascot-eye" cx="97" cy="102" r="6" fill="var(--ink)" />
          <path d="M66 114 Q80 122 94 114" stroke="var(--ink)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </g>
      </svg>
      <div className={`wizard-mascot-prop${pop ? " wizard-pop" : ""}`} onAnimationEnd={() => setPop(false)}>
        {prop}
      </div>
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className={`wizard-confetti-piece${burst ? " wizard-burst" : ""}`}
          style={
            {
              "--wtx": piece.tx,
              "--wty": piece.ty,
              "--wrot": piece.rot,
              background: piece.color,
              borderRadius: piece.round ? "50%" : "2px",
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
