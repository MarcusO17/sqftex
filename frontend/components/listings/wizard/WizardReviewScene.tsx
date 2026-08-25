"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// The wizard's one deliberate "big" moment. Every other step's illustration
// (see StepIllustration) is flat SVG/CSS on purpose — six WebGL scenes would
// be real weight and a real perf risk for a mostly-mobile Malaysian SME
// audience. Review is the one step that earns the swing: the listing is
// done, so instead of another badge swap, the boxes actually drop and stack
// into a small 3D pile.
//
// Materials are flat/unlit-leaning (Lambert, no roughness/metalness maps)
// with a drawn edge outline per box, so this still reads as a continuation
// of the blueprint pane's line-art rather than a bolted-on realistic asset.
// Colors are read live from the app's CSS custom properties so light/dark
// theme and any future palette change apply here for free.

type BoxCfg = { id: number; target: [number, number, number]; tone: "primary" | "secondary"; delay: number };

// Two layers: three boxes on the floor, two stacked on top — arrives looking
// like a small pile rather than a grid, without leaving anything to chance
// (fixed layout, same every time, matching how BOX_SLOTS in the blueprint
// pane is fixed rather than randomized).
const BOXES: BoxCfg[] = [
  { id: 0, target: [-0.62, 0.5, -0.25], tone: "primary", delay: 0 },
  { id: 1, target: [0.5, 0.5, -0.5], tone: "secondary", delay: 0.1 },
  { id: 2, target: [-0.05, 0.5, 0.45], tone: "primary", delay: 0.2 },
  { id: 3, target: [0.5, 1.5, -0.15], tone: "secondary", delay: 0.38 },
  { id: 4, target: [-0.45, 1.5, 0.2], tone: "primary", delay: 0.5 },
];
const DROP_HEIGHT = 3.2;
const SETTLE_LAMBDA = 6;

function readVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// Aims the camera at the box pile rather than the floor origin. A plain
// effect rather than drei's <PerspectiveCamera> so this file doesn't need
// the extra dependency for one lookAt call.
function CameraAim() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0.6, 0);
  }, [camera]);
  return null;
}

function DropBox({
  cfg,
  color,
  edgeColor,
  reduceMotion,
}: {
  cfg: BoxCfg;
  color: string;
  edgeColor: string;
  reduceMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (reduceMotion) {
      g.position.set(...cfg.target);
      g.scale.set(1, 1, 1);
      return;
    }
    elapsedRef.current += delta;
    if (elapsedRef.current < cfg.delay) {
      g.position.set(cfg.target[0], cfg.target[1] + DROP_HEIGHT, cfg.target[2]);
      return;
    }
    g.position.y = THREE.MathUtils.damp(g.position.y, cfg.target[1], SETTLE_LAMBDA, delta);
    // No real spring here — just squash proportional to remaining distance,
    // relaxing to a normal cube exactly as it settles. Cheap stand-in for a
    // bounce that still reads as "landed" rather than "glided to a stop".
    const remaining = Math.abs(g.position.y - cfg.target[1]);
    const squash = Math.min(remaining * 0.35, 0.22);
    g.scale.set(1 + squash * 0.6, 1 - squash, 1 + squash * 0.6);
  });

  return (
    <group
      ref={groupRef}
      position={[cfg.target[0], cfg.target[1] + (reduceMotion ? 0 : DROP_HEIGHT), cfg.target[2]]}
    >
      <mesh geometry={geo}>
        <meshLambertMaterial color={color} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={edgeColor} />
      </lineSegments>
    </group>
  );
}

function SceneContents({ reduceMotion }: { reduceMotion: boolean }) {
  const [colors, setColors] = useState({
    primary: "#0891b2",
    secondary: "#ff7a1e",
    card: "#f2f1f4",
    paper: "#fafafb",
    ink: "#0e0d10",
  });
  useEffect(() => {
    setColors({
      primary: readVar("--primary", "#0891b2"),
      secondary: readVar("--secondary", "#ff7a1e"),
      card: readVar("--card", "#f2f1f4"),
      paper: readVar("--paper", "#fafafb"),
      ink: readVar("--ink", "#0e0d10"),
    });
  }, []);

  const groupRef = useRef<THREE.Group>(null);
  const tRef = useRef(0);
  useFrame((_, delta) => {
    if (reduceMotion || !groupRef.current) return;
    tRef.current += delta;
    // Gentle idle yaw once the boxes have had time to settle — same "alive
    // but not distracting" idea as the blueprint pane's idle bob, just in 3D.
    if (tRef.current > 1.1) {
      groupRef.current.rotation.y = Math.sin((tRef.current - 1.1) * 0.5) * 0.14;
    }
  });

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 5, 2]} intensity={0.55} />
      <group ref={groupRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.6, 2.6]} />
          <meshBasicMaterial color={colors.card} />
        </mesh>
        {/* Back-left shadow-box walls, echoing the diorama framing without
            the full isometric-scene complexity that got cut before. */}
        <mesh position={[-1.3, 1, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[2.6, 2]} />
          <meshBasicMaterial color={colors.paper} />
        </mesh>
        <mesh position={[0, 1, -1.3]}>
          <planeGeometry args={[2.6, 2]} />
          <meshBasicMaterial color={colors.paper} />
        </mesh>

        {BOXES.map((cfg) => (
          <DropBox
            key={cfg.id}
            cfg={cfg}
            color={cfg.tone === "primary" ? colors.primary : colors.secondary}
            edgeColor={colors.ink}
            reduceMotion={reduceMotion}
          />
        ))}
      </group>
    </>
  );
}

export function WizardReviewScene({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <Canvas
      orthographic
      camera={{ position: [4, 3.6, 4], zoom: 85, near: 0.1, far: 20 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <CameraAim />
      <SceneContents reduceMotion={reduceMotion} />
    </Canvas>
  );
}
