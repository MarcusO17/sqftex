"use client";

import { Component, type ReactNode } from "react";

// Guards WizardReviewScene specifically: it's a decorative flourish on the
// Review step, not core wizard functionality, so a WebGL context failure or
// a Three.js render error on some device must never take the wizard down
// with it — just fall back to the blueprint pane the same way "no WebGL
// support" already does in StepIllustration.
export class WizardCanvasBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[WizardReviewScene] falling back to the blueprint pane after a render error:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
