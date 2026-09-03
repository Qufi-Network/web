'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Helix } from './Helix';
import { ModelIcon } from './Icons';

/**
 * Instruct, verify, settle, taken sideways.
 *
 * The three steps are the spine of the whole company, and a row of three
 * paragraphs was not carrying that. Here the section pins itself and the cards
 * travel horizontally as the page is scrolled, so the reader moves through the
 * model in the same direction the model runs. Each card is a full panel in its
 * own blue with a helix turning behind it.
 *
 * ## How the pinning works
 *
 * The outer element is three viewports tall and does nothing but provide the
 * scroll distance. The inner one sticks to the top of the screen and stays
 * there for that distance, and the track inside it is translated in X by
 * exactly how far it overflows. That is the whole mechanism, and it is worth
 * saying plainly because a pinned section usually looks like magic and is
 * usually one `sticky` and one `transform`.
 *
 * ## When it does not happen
 *
 * Hijacking the scroll is a strong move and a bad one on a phone, where a
 * horizontal track inside a vertical gesture is a fight. Below the breakpoint
 * the same cards simply stack, and a visitor who has asked for reduced motion
 * gets the stack at any width. Nothing is lost either way: the cards are the
 * content, and the sideways travel is only how they are met.
 */

const STEPS = [
  {
    id: 'instruct',
    step: '01',
    title: 'Instruct',
    lede: 'A transaction or financial action is defined.',
    body: 'Somebody wants to move something of value, or change who owns it, or release a payment against a condition. That intention is written down as an instruction the network can read.',
    tone: '#0d3fa8',
  },
  {
    id: 'verify',
    step: '02',
    title: 'Verify',
    lede: 'The expensive work happens away from the settlement path.',
    body: 'QuFi checks the instruction independently: the signatures under two post-quantum schemes, the policy, the collateral, the state it claims. What comes out is a compact proof that the check happened and what it found.',
    tone: '#1055d6',
  },
  {
    id: 'settle',
    step: '03',
    title: 'Settle',
    lede: 'The settlement environment receives the proof and settles the result.',
    body: 'The chain, the institution or the payment network gets the answer rather than the work. It settles what has been verified, and nothing that has not.',
    tone: '#1769ff',
  },
] as const;

export function ModelScroll() {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();

  /*
   * How far the track actually overflows, measured.
   *
   * This was written as a guess in viewport units, and a guess is wrong at
   * every width except the one it was made at: at 1440 the track overflows by
   * about a hundred viewport widths' worth less than the hundred and forty-six
   * it was being pushed, so the last card slid off the left before the section
   * had finished and the reader spent the last third of the scroll looking at
   * an empty blue screen. Measuring costs one layout read and is right
   * everywhere.
   */
  const [travel, setTravel] = useState(0);

  useEffect(() => {
    const measure = () => {
      const node = track.current;
      if (!node) return;
      setTravel(Math.max(0, node.scrollWidth - node.clientWidth));
    };
    measure();
    const watch = new ResizeObserver(measure);
    if (track.current) watch.observe(track.current);
    window.addEventListener('resize', measure);
    return () => {
      watch.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: outer,
    offset: ['start start', 'end end'],
  });

  const x = useTransform(scrollYProgress, [0, 1], [0, -travel]);

  return (
    <section className="cx-model-scroll" ref={outer} data-still={String(Boolean(still))}>
      <div className="cx-model-pin">
        <div className="cx-model-head">
          <p className="cx-band-say">The model</p>
          <p className="cx-model-hint" aria-hidden="true">
            <span>Scroll</span>
            <i />
          </p>
        </div>

        <motion.div
          className="cx-model-track"
          ref={track}
          style={still ? undefined : { x }}
        >
          {STEPS.map((item) => (
            <article
              key={item.id}
              className="cx-slab"
              style={{ '--tone': item.tone } as React.CSSProperties}
            >
              {/* The helix, thinned down: three of them share one screen. */}
              <Helix scheme="onColour" density={0.55} />

              <div className="cx-slab-words">
                <span className="cx-slab-art">
                  <ModelIcon step={item.id} />
                </span>
                <p className="cx-slab-step">{item.step}</p>
                <h2>{item.title}</h2>
                <p className="cx-slab-lede">{item.lede}</p>
                <p className="cx-slab-body">{item.body}</p>
              </div>

              <span className="cx-slab-rule" aria-hidden="true" />
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
