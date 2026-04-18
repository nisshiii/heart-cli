"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type HeartBeatProps = {
  reducedMotion: boolean;
};

const CORE_COLOR = "#ff2d55";
const POINT_COUNT = 7200;

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

function heartMask(x: number, y: number) {
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y;
}

function buildHeartPoints(count: number, bias = 0.45) {
  const points: THREE.Vector3[] = [];
  const max = 1.35;

  while (points.length < count) {
    const x = THREE.MathUtils.lerp(-max, max, Math.random());
    const y = THREE.MathUtils.lerp(-max, max, Math.random());
    if (heartMask(x, y) <= 0) {
      const r = Math.min(Math.sqrt((x * x + y * y) / (max * max)), 1);
      const weight = 1 - r * bias;
      if (Math.random() <= weight) {
        points.push(new THREE.Vector3(x, y, 0));
      }
    }
  }

  const bounds = new THREE.Box3().setFromPoints(points);
  const size = new THREE.Vector3();
  bounds.getSize(size);

  const targetWidth = 2.6;
  const targetHeight = 2.3;
  const scale = Math.min(targetWidth / size.x, targetHeight / size.y);

  const scaled = points.map((point) => point.clone().multiplyScalar(scale));
  const scaledBounds = new THREE.Box3().setFromPoints(scaled);
  const center = new THREE.Vector3();
  scaledBounds.getCenter(center);

  return scaled.map((point) => point.clone().sub(center));
}

function heartbeatWave(t: number) {
  const cycle = 1.8;
  const local = t % cycle;
  const spikeA = Math.exp(-Math.pow((local - 0.28) / 0.08, 2));
  const spikeB = Math.exp(-Math.pow((local - 0.72) / 0.12, 2)) * 0.65;
  return spikeA + spikeB;
}

function HeartBeat({ reducedMotion }: HeartBeatProps) {
  const groupRef = useRef<THREE.Group>(null);

  const data = useMemo(() => {
    const heartPoints = buildHeartPoints(POINT_COUNT, 0.4);
    const scatter = new Float32Array(POINT_COUNT * 3);
    const targets = new Float32Array(POINT_COUNT * 3);
    const seeds = new Float32Array(POINT_COUNT);

    const scatterWidth = 8.2;
    const scatterHeight = 5.6;
    const scatterDepth = 2.6;

    for (let i = 0; i < POINT_COUNT; i += 1) {
      const index = i * 3;
      const heart = heartPoints[i % heartPoints.length];

      targets[index] = heart.x;
      targets[index + 1] = heart.y;
      targets[index + 2] = (Math.random() - 0.5) * 0.35;

      scatter[index] = (Math.random() - 0.5) * scatterWidth;
      scatter[index + 1] = (Math.random() - 0.5) * scatterHeight;
      scatter[index + 2] = (Math.random() - 0.5) * scatterDepth;

      seeds[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(scatter.slice(), 3));

    return { geometry, scatter, targets, seeds };
  }, []);

  useEffect(() => {
    return () => {
      data.geometry.dispose();
    };
  }, [data]);

  useFrame((state) => {
    if (reducedMotion) {
      return;
    }

    const t = state.clock.getElapsedTime();
    const gatherDuration = 2.8;
    const gatherRaw = Math.min(t / gatherDuration, 1);
    const gather = gatherRaw * gatherRaw * (3 - 2 * gatherRaw);
    const beat = heartbeatWave(Math.max(0, t - gatherDuration));
    const breathe = Math.sin(t * 0.4) * 0.008;
    const pulse = 1 + beat * 0.07 + breathe;

    const positions = data.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < POINT_COUNT; i += 1) {
      const index = i * 3;
      const seed = data.seeds[i];
      const wander = Math.sin(t * 1.2 + seed) * 0.03;
      const drift = Math.cos(t * 0.9 + seed) * 0.02;

      const targetX = data.targets[index] * pulse + wander;
      const targetY = data.targets[index + 1] * pulse + drift;
      const targetZ = data.targets[index + 2] * pulse + Math.sin(t + seed) * 0.01;

      positions[index] = THREE.MathUtils.lerp(data.scatter[index], targetX, gather);
      positions[index + 1] = THREE.MathUtils.lerp(data.scatter[index + 1], targetY, gather);
      positions[index + 2] = THREE.MathUtils.lerp(data.scatter[index + 2], targetZ, gather);
    }

    data.geometry.attributes.position.needsUpdate = true;

    if (groupRef.current) {
      groupRef.current.rotation.x = -0.18 + Math.sin(t * 0.3) * 0.04;
      groupRef.current.rotation.y = 0.4 + Math.cos(t * 0.25) * 0.05;
    }
  });

  useEffect(() => {
    if (!reducedMotion) {
      return;
    }

    const positions = data.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < POINT_COUNT; i += 1) {
      const index = i * 3;
      positions[index] = data.targets[index];
      positions[index + 1] = data.targets[index + 1];
      positions[index + 2] = data.targets[index + 2];
    }

    data.geometry.attributes.position.needsUpdate = true;
  }, [data, reducedMotion]);

  return (
    <group ref={groupRef}>
      <points geometry={data.geometry} frustumCulled={false}>
        <pointsMaterial
          color={CORE_COLOR}
          size={0.028}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
      <points geometry={data.geometry} frustumCulled={false}>
        <pointsMaterial
          color={CORE_COLOR}
          size={0.095}
          sizeAttenuation
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

export default function HeartCanvas() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="canvas-wrap" aria-hidden="true">
      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 0, 6], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <HeartBeat reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
