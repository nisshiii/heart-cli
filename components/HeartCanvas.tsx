"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type HeartBeatProps = {
  reducedMotion: boolean;
};

const CORE_COLOR = "#ff2d55";

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => setReducedMotion(mediaQuery.matches);

    update();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  return reducedMotion;
}

function buildHeartPath() {
  const raw: THREE.Vector3[] = [];
  const samples = 240;

  for (let i = 0; i <= samples; i += 1) {
    const t = (i / samples) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    raw.push(new THREE.Vector3(x, y, 0));
  }

  const box = new THREE.Box3().setFromPoints(raw);
  const size = new THREE.Vector3();
  box.getSize(size);

  const targetWidth = 2.2;
  const targetHeight = 2.0;
  const scale = Math.min(targetWidth / size.x, targetHeight / size.y);

  const scaled = raw.map((point) => point.clone().multiplyScalar(scale));
  const scaledBox = new THREE.Box3().setFromPoints(scaled);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  const centered = scaled.map((point) => point.clone().sub(center));

  let leftIndex = 0;
  for (let i = 1; i < centered.length; i += 1) {
    if (centered[i].x < centered[leftIndex].x) {
      leftIndex = i;
    }
  }

  const reordered = [
    ...centered.slice(leftIndex),
    ...centered.slice(0, leftIndex)
  ];

  const baselineShift = reordered[0].y;
  const baselineY = 0.08;
  const shifted = reordered.map(
    (point) => new THREE.Vector3(point.x, point.y - baselineShift + baselineY, 0)
  );

  const heartCurve = new THREE.CatmullRomCurve3(shifted, true, "catmullrom", 0.6);
  const heartPoints = heartCurve.getPoints(360);

  let minX = heartPoints[0].x;
  let maxX = heartPoints[0].x;

  for (const point of heartPoints) {
    if (point.x < minX) {
      minX = point.x;
    }
    if (point.x > maxX) {
      maxX = point.x;
    }
  }

  const leadInStart = minX - 1.7;
  const leadOutEnd = maxX + 1.7;
  const leadSamples = 40;

  const leadIn: THREE.Vector3[] = [];
  const leadOut: THREE.Vector3[] = [];

  for (let i = 0; i <= leadSamples; i += 1) {
    const x = THREE.MathUtils.lerp(leadInStart, minX, i / leadSamples);
    leadIn.push(new THREE.Vector3(x, baselineY, 0));
  }

  for (let i = 1; i <= leadSamples; i += 1) {
    const x = THREE.MathUtils.lerp(minX, leadOutEnd, i / leadSamples);
    leadOut.push(new THREE.Vector3(x, baselineY, 0));
  }

  const pathPoints = [...leadIn, ...heartPoints, ...leadOut];

  return new THREE.CatmullRomCurve3(pathPoints, false, "catmullrom", 0.35);
}

function HeartBeat({ reducedMotion }: HeartBeatProps) {
  const groupRef = useRef<THREE.Group>(null);

  const path = useMemo(() => buildHeartPath(), []);
  const coreGeometry = useMemo(
    () => new THREE.TubeGeometry(path, 920, 0.02, 10, false),
    [path]
  );
  const glowGeometry = useMemo(
    () => new THREE.TubeGeometry(path, 920, 0.05, 12, false),
    [path]
  );
  const traceGeometry = useMemo(
    () => new THREE.TubeGeometry(path, 700, 0.012, 6, false),
    [path]
  );

  const coreCount = coreGeometry.index?.count ?? coreGeometry.attributes.position.count;
  const glowCount = glowGeometry.index?.count ?? glowGeometry.attributes.position.count;

  useEffect(() => {
    coreGeometry.setDrawRange(0, reducedMotion ? coreCount : 0);
    glowGeometry.setDrawRange(0, reducedMotion ? glowCount : 0);

    return () => {
      coreGeometry.dispose();
      glowGeometry.dispose();
      traceGeometry.dispose();
    };
  }, [coreGeometry, glowGeometry, traceGeometry, coreCount, glowCount, reducedMotion]);

  useFrame((state) => {
    if (reducedMotion) {
      return;
    }

    const t = state.clock.getElapsedTime();
    const cycle = 3.2;
    const hold = 0.35;
    const total = cycle + hold;
    const local = t % total;
    const raw = Math.min(local / cycle, 1);
    const eased = raw * raw * (3 - 2 * raw);

    const coreDraw = Math.max(2, Math.floor(coreCount * eased));
    const glowDraw = Math.max(2, Math.floor(glowCount * eased));

    coreGeometry.setDrawRange(0, coreDraw);
    glowGeometry.setDrawRange(0, glowDraw);

    const pulse = 1 + Math.sin(t * 2.4) * 0.02;

    if (groupRef.current) {
      groupRef.current.scale.setScalar(pulse);
      groupRef.current.rotation.x = -0.2 + Math.sin(t * 0.3) * 0.02;
      groupRef.current.rotation.y = 0.35 + Math.sin(t * 0.2) * 0.03;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={traceGeometry}>
        <meshBasicMaterial
          color={CORE_COLOR}
          opacity={0.15}
          transparent
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={glowGeometry}>
        <meshBasicMaterial
          color={CORE_COLOR}
          opacity={0.2}
          transparent
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={coreGeometry}>
        <meshBasicMaterial
          color={CORE_COLOR}
          opacity={0.95}
          transparent
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function HeartCanvas() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="canvas-wrap" aria-hidden="true">
      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 0, 5], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <HeartBeat reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
