"use client";

import { useRef, useState } from "react";

export function RangeSlider({
  value,
  min,
  max,
  step = 10,
  format,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const pct = ((value - min) / (max - min)) * 100;

  function valueFromClientX(clientX: number) {
    const box = trackRef.current!.getBoundingClientRect();
    const raw = min + ((clientX - box.left) / box.width) * (max - min);
    return Math.round(Math.min(max, Math.max(min, raw)));
  }

  function handleThumbDown(e: React.PointerEvent<HTMLDivElement>) {
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handleThumbMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    onChange(valueFromClientX(e.clientX));
  }
  function handleThumbUp() {
    setDragging(false);
  }
  function handleTrackDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return; // clicks on the thumb itself are handled by handleThumbDown
    onChange(valueFromClientX(e.clientX));
  }
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { onChange(Math.min(max, value + step)); e.preventDefault(); }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { onChange(Math.max(min, value - step)); e.preventDefault(); }
  }

  return (
    <div className="wizard-slider">
      <div className="wizard-slider-track" ref={trackRef} onPointerDown={handleTrackDown}>
        <div className="wizard-slider-fill" style={{ width: `${pct}%` }} />
        <div
          className={`wizard-slider-thumb${dragging ? " wizard-dragging" : ""}`}
          style={{ left: `${pct}%` }}
          tabIndex={0}
          role="slider"
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onPointerDown={handleThumbDown}
          onPointerMove={handleThumbMove}
          onPointerUp={handleThumbUp}
          onPointerCancel={handleThumbUp}
          onKeyDown={handleKeyDown}
        >
          <span className={`wizard-slider-bubble${dragging ? " wizard-show" : ""}`}>{format(value)}</span>
        </div>
      </div>
      <div className="wizard-slider-scale">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
