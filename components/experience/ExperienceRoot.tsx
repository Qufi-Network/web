'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { NetworkProvider } from '../../experience/NetworkContext';
import { buildOpening, type OpeningHandles } from '../../experience/Opening';
import { experience } from '../../experience/ExperienceState';
import {
  enterSpace,
  nav,
  probe,
  request,
  returnToNetwork,
  spaceRuntime,
  stageTo,
  travelTo,
} from '../../experience/navigation';
import { resetStage, stage } from '../../experience/stage';
import { detectCapability, dprFor, type Capability } from '../../lib/capability';
import { Scene } from './Scene';
import { Boot } from '../overlay/Boot';
import { Centre } from '../overlay/Centre';
import { NetworkHUD } from '../overlay/NetworkHUD';
import { StaticNetwork } from './StaticNetwork';

/**
 * Mounts the environment.
 *
 * Everything that has to look at the device happens here and nowhere else:
 * capability detection, the motion preference, WebGL availability, and building
 * the opening. What is below can then assume it is running somewhere that can
 * actually render it.
 *
 * There is no scroll track under this and no document length to descend. The
 * viewport is the frame, the canvas fills it, and the visitor moves by moving.
 */
export function ExperienceRoot() {
  const [capability, setCapability] = useState<Capability | null>(null);
  const opening = useRef<OpeningHandles | null>(null);

  useEffect(() => {
    const detected = detectCapability();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setCapability(detected);
    experience.set({
      degraded: !detected.webgl,
      reducedMotion,
      tier: detected.tier,
      phase: detected.webgl ? 'INTRO' : 'EXIT',
    });

    if (!detected.webgl) return;

    resetStage();
    nav.set({ mode: 'INTRO', boot: 0, title: -1 });

    const built = buildOpening({ reducedMotion, nodeCount: detected.nodeCount });
    opening.current = built;
    if (!reducedMotion) built.timeline.play();

    // A tab that has been away for a while would otherwise resume mid-sequence
    // with a frame delta measured in seconds.
    const onVisibility = () => {
      if (document.hidden) built.timeline.pause();
      else if (!reducedMotion && nav.get().mode === 'INTRO') built.timeline.play();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Development instrumentation. Art-directing a twenty-second sequence means
    // looking at second fourteen repeatedly, and waiting fourteen seconds each
    // time is not a workflow.
    const debug =
      process.env.NODE_ENV !== 'production' &&
      new URLSearchParams(window.location.search).has('stats');
    if (debug) {
      (window as unknown as { __qufi?: unknown }).__qufi = {
        timeline: built.timeline,
        stage,
        nav,
        probe,
        request,
        spaceRuntime,
        experience,
        enterSpace,
        returnToNetwork,
        travelTo,
        stageTo,
        seek: (seconds: number) => built.timeline.pause().time(seconds, true),
        /** Straight to the global view, for harnesses that start from there. */
        online: () => {
          built.timeline.pause().progress(1, false);
          nav.set({ mode: 'ORBIT', entered: true, online: true, boot: 2, title: -1 });
        },
      };
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (debug) delete (window as unknown as { __qufi?: unknown }).__qufi;
      built.dispose();
      opening.current = null;
    };
  }, []);

  const onSkip = useCallback(() => {
    opening.current?.skip();
  }, []);

  // Server render and first paint are the accessible document alone. The scene
  // only exists once we know what this device is.
  if (!capability) return null;
  if (!capability.webgl) return <StaticNetwork />;

  return (
    <NetworkProvider capability={capability}>
      <div className="stage" aria-hidden="true">
        <Canvas
          flat
          frameloop="always"
          dpr={[1, dprFor(capability, window.innerWidth, window.innerHeight)]}
          gl={{
            antialias: capability.tier === 'ultra' || capability.tier === 'high',
            alpha: false,
            stencil: false,
            powerPreference: 'high-performance',
          }}
          camera={{
            fov: stage.camera.fov,
            near: 0.4,
            far: 900,
            position: [stage.camera.px, stage.camera.py, stage.camera.pz],
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x04060b, 1);
            // A driver reset under load takes the context with it. Without this
            // the visitor is left looking at a black rectangle with no way to
            // know anything went wrong; instead the still network and the full
            // document take over, which is the same place a machine without
            // WebGL lands.
            gl.domElement.addEventListener(
              'webglcontextlost',
              (event) => {
                event.preventDefault();
                opening.current?.timeline.pause();
                experience.set({ degraded: true, phase: 'EXIT' });
                setCapability((current) => (current ? { ...current, webgl: false } : current));
              },
              { once: true },
            );
          }}
        >
          <Scene />
        </Canvas>
      </div>

      <Boot onSkip={onSkip} />
      <NetworkHUD />
      <Centre />

      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
    </NetworkProvider>
  );
}
