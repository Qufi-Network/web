'use client';

import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Link from 'next/link';
import { NetworkProvider } from '../../experience/NetworkContext';
import { experience } from '../../experience/ExperienceState';
import { resetStage, stage } from '../../experience/stage';
import { detectCapability, dprFor, type Capability } from '../../lib/capability';
import { AdaptiveQuality } from '../../experience/systems/AdaptiveQuality';
import { CameraDirector } from '../../experience/systems/CameraDirector';
import { InteractionSystem } from '../../experience/systems/InteractionSystem';
import { NetworkDriver } from '../../experience/systems/NetworkDriver';
import { ParticleField } from '../../experience/systems/ParticleField';
import { SubstrateLayer } from '../../experience/systems/SubstrateLayer';
import { SceneSystem } from '../../experience/lifecycle/SceneSystem';
import { LifecycleDirector } from '../../experience/lifecycle/LifecycleDirector';
import type { Journey } from '../../experience/lifecycle/journey';
import { life } from '../../experience/lifecycle/life';
import { LifecycleLayer } from '../overlay/LifecycleLayer';
import { LifecycleMarks } from '../overlay/LifecycleMarks';
import { QufiMark } from '../overlay/QufiMark';
import { QUFI_WORD, QUFI_WORD_SIZE } from '../../assets/word';

/**
 * The uBTC lifecycle, as a place you move through.
 *
 * Same engine as the front of the site and the same wheel: one route, and
 * everything derived from where you are on it. What differs is what the route
 * follows — an instruction from the vault being created to the bitcoin coming
 * back out, rather than a map of the architecture.
 *
 * It does not wear the front page's clothes. That is a network of faceted
 * crystals in cyan; this is a ledger — boxes, blocks, rings and grids, in
 * bitcoin gold, the unit's green and a cool violet for the machinery between
 * them. Same hand, different subject, and a visitor arriving from the network
 * should know immediately that they have gone somewhere else.
 */
export function LifecycleRoot({ journey }: { journey: Journey }) {
  const [capability, setCapability] = useState<Capability | null>(null);

  useEffect(() => {
    const detected = detectCapability();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setCapability(detected);
    experience.set({ degraded: !detected.webgl, reducedMotion, tier: detected.tier });
    if (!detected.webgl) return;

    resetStage();
    life.reset();
    // No opening sequence here: the visitor has already been through one to get
    // to this page, and a second is a toll rather than an arrival.
    stage.dim = 1;
    stage.reveal = detected.nodeCount + 8;
    stage.coherence = 1;
    life.set({ ready: true });

    const debug =
      process.env.NODE_ENV !== 'production' &&
      new URLSearchParams(window.location.search).has('stats');
    if (debug) {
      (window as unknown as { __ubtc?: unknown }).__ubtc = { life, stage, journey };
    }
    return () => {
      if (debug) delete (window as unknown as { __ubtc?: unknown }).__ubtc;
    };
  }, []);

  if (!capability) return null;

  if (!capability.webgl) {
    // No GPU: the stages are the content, and they are in the markup already.
    return null;
  }

  return (
    <NetworkProvider capability={capability}>
      <div className="stage" style={{ '--tone': journey.tone } as React.CSSProperties} aria-hidden="true">
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
          camera={{ fov: 44, near: 0.4, far: 900, position: [0, 8, 90] }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x04060b, 1);
            gl.domElement.addEventListener(
              'webglcontextlost',
              (event) => {
                event.preventDefault();
                setCapability((current) => (current ? { ...current, webgl: false } : current));
              },
              { once: true },
            );
          }}
        >
          <NetworkDriver />
          <LifecycleDirector journey={journey} />
          <InteractionSystem />
          <CameraDirector />
          <AdaptiveQuality />

          {/*
            The field and the substrate only, for depth. The participants, the
            relationships and the Core are the front page's signature and they
            are deliberately not here: this is the same engine drawing a
            different subject, and it should look like one.
          */}
          <ParticleField />
          <SubstrateLayer />
          <SceneSystem journey={journey} />
        </Canvas>
      </div>

      {/* The way back is the only navigation this page has. */}
      <Link className="hud-mark life-mark" href="/product" aria-label="Back to products">
        <QufiMark variant="corner" shown />
        <img
          className="hud-mark-word"
          src={QUFI_WORD}
          alt=""
          width={QUFI_WORD_SIZE.width}
          height={QUFI_WORD_SIZE.height}
        />
      </Link>

      <LifecycleMarks marks={journey.marks} />
      <LifecycleLayer journey={journey} />

      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
    </NetworkProvider>
  );
}
