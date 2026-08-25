'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { FrameMonitor } from '../../lib/perf';
import { dprFor } from '../../lib/capability';
import { useNetwork } from '../NetworkContext';

/**
 * Holds the frame rate by trading resolution.
 *
 * Counts are fixed when the scene mounts — changing them mid-sequence would be
 * visible, and the opening is composed against a particular density. Pixel ratio
 * is the one lever that can move during the sequence without anyone seeing it.
 */
export function AdaptiveQuality() {
  const { capability } = useNetwork();
  const setDpr = useThree((state) => state.setDpr);
  const clock = useRef(0);
  const monitor = useRef<FrameMonitor | null>(null);

  if (!monitor.current) {
    const available = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    const budgeted =
      typeof window === 'undefined'
        ? 1
        : dprFor(capability, window.innerWidth, window.innerHeight);
    monitor.current = new FrameMonitor(Math.min(budgeted, available));
  }

  useEffect(() => {
    setDpr(monitor.current!.current);
  }, [setDpr]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 15);
    clock.current += delta;
    const next = monitor.current!.sample(delta, clock.current);
    if (next !== null) setDpr(next);
  });

  return null;
}
