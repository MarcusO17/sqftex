"use client";

import { useState } from "react";

export function CategoryTile({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [pulse, setPulse] = useState(false);

  function handleClick() {
    onClick();
    setPulse(false);
    // Re-trigger the CSS animation even if it's already mid-flight: forces a
    // reflow between removing and re-adding the class (same technique the
    // wizard prototype used) — without it, clicking twice in a row before
    // the first pulse finishes wouldn't restart the animation.
    requestAnimationFrame(() => setPulse(true));
  }

  return (
    <button
      type="button"
      className={`wizard-cattile${active ? " wizard-picked" : ""}${pulse ? " wizard-pulse" : ""}`}
      onClick={handleClick}
      onAnimationEnd={() => setPulse(false)}
    >
      <span className="wizard-badge">{icon}</span>
      {label}
    </button>
  );
}
