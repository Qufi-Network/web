'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { NetworkProvider } from '../../experience/NetworkContext';
import { beatAt, buildIntroTimeline, type TimelineHandles } from '../../experience/IntroTimeline';
import { experience } from '../../experience/ExperienceState';
import { resetStage, stage } from '../../experience/stage';
import { detectCapability, dprFor, type Capability } from '../../lib/capability';
import { Scene } from './Scene';
import { IntroOverlay } from '../overlay/IntroOverlay';
import { Loader } from '../overlay/Loader';
import { ScrollPrompt } from '../overlay/ScrollPrompt';
import { Creed } from '../overlay/Creed';
import { CornerMark } from '../overlay/CornerMark';
import { ChapterLayer } from '../overlay/ChapterLayer';
import { NodeLabels } from '../overlay/NodeLabels';
import { FeatureCard } from '../overlay/FeatureCard';
import { CHAPTERS, CHAPTER_SPAN } from '../../experience/Chapters';
import { StaticNetwork } from './StaticNetwork';

/**
 * Mounts the experience.
 *
 * Everything that has to look at the device happens here and nowhere else:
 * capability detection, the motion preference, WebGL availability, and building
 * the timeline. The scene below it can then assume it is running somewhere that
 * can actually render it.
 */
export function ExperienceRoot() {
  const [capability, setCapability] = useState<Capability | null>(null);
  const [inside, setInside] = useState(false);
  const handles = useRef<TimelineHandles | null>(null);

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
    const built = buildIntroTimeline({
      reducedMotion,
      portrait: window.innerWidth < 860,
      nodeCount: detected.nodeCount,
    });
    handles.current = built;
    if (!reducedMotion) built.timeline.play();

    // A tab that has been away for a while would otherwise resume mid-sequence
    // with a frame delta measured in seconds.
    const onVisibility = () => {
      if (document.hidden) built.timeline.pause();
      else if (!reducedMotion) built.timeline.play();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Development instrumentation. Art-directing a thirty-second sequence means
    // looking at second nineteen repeatedly, and waiting nineteen seconds each
    // time is not a workflow. Gated behind both the build mode and an explicit
    // query parameter so it cannot reach a visitor.
    const debug =
      process.env.NODE_ENV !== 'production' &&
      new URLSearchParams(window.location.search).has('stats');
    if (debug) {
      (window as unknown as { __qufi?: unknown }).__qufi = {
        timeline: built.timeline,
        stage,
        experience,
        // Scrubbing with callbacks enabled re-fires every beat between here and
        // there, which is both wrong for a scrub and unstable. Suppress them and
        // set the beat that belongs to the destination instead.
        seek: (seconds: number) => {
          built.timeline.pause().time(seconds, true);
          experience.set({ beat: beatAt(seconds), elapsed: seconds });
        },
      };
    }

    // A refresh in the middle of the descent should start at the opening again,
    // not halfway down a track that no longer exists.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    return () => {
      delete document.documentElement.dataset.inside;
      document.removeEventListener('visibilitychange', onVisibility);
      if (debug) delete (window as unknown as { __qufi?: unknown }).__qufi;
      built.dispose();
      handles.current = null;
    };
  }, []);

  const onSkip = useCallback(() => {
    handles.current?.skip();
  }, []);

  const onEnter = useCallback(() => {
    const built = handles.current;
    if (built) {
      built.timeline.pause();
      built.enter();
    }
    experience.set({ phase: 'DISCOVER' });
    // Descent only becomes possible once the visitor has accepted the
    // invitation. Until then the page has no scroll to give.
    setInside(true);
    document.documentElement.dataset.inside = 'true';
    // Two frames so the scroll track has been laid out before we move into it.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => window.scrollTo({ top: 1, behavior: 'smooth' })),
    );
  }, []);

  // Server render and first paint are the accessible document alone. The scene
  // only exists once we know what this device is — but the loader has to be up
  // before that, because those are exactly the seconds it exists to explain.
  if (!capability) return <Loader />;
  if (!capability.webgl) return <StaticNetwork />;

  return (
    <NetworkProvider capability={capability}>
      <Loader />
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
            far: 400,
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
                handles.current?.timeline.pause();
                experience.set({ degraded: true, phase: 'EXIT' });
                setCapability((current) => (current ? { ...current, webgl: false } : current));
              },
              { once: true },
            );
          }}
        >
          <Scene scrolling={inside} />
        </Canvas>
      </div>
      <IntroOverlay onEnter={onEnter} onSkip={onSkip} />
      <Creed />
      <CornerMark />
      <ScrollPrompt />
      <NodeLabels active={inside} />
      <FeatureCard active={inside} />
      <ChapterLayer active={inside} />

      {/*
        The scroll track. It carries no content of its own — it exists so the
        document has a length for the descent to be measured against, which is
        what lets the scrollbar mean depth rather than page position.
      */}
      {inside ? (
        <div
          className="track"
          aria-hidden="true"
          style={{ height: `${CHAPTERS.length * CHAPTER_SPAN * 100}vh` }}
        />
      ) : null}
    </NetworkProvider>
  );
}
