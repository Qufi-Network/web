'use client';

import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion';
import { useRef, useState } from 'react';
import { Helix } from './Helix';

/**
 * A product's lifecycle, walked rather than listed.
 *
 * The environment shows this by flying a camera through it. On the standard
 * site the equivalent is the scroll: the section pins, and each turn of the
 * wheel advances the process by one stage. The chain across the top builds as
 * it goes, so at any point the reader can see how far through they are and how
 * much is left, which a list of eight headings never told them.
 *
 * ## Why the chain and not a picture per stage
 *
 * Eight illustrations would be eight things to look at and nothing to
 * understand. One diagram that grows is a single object the reader keeps their
 * eye on while it changes, and what changes is exactly what the words are
 * describing. It is also honest about the shape of the thing: these stages are
 * a sequence, and a sequence is a line.
 *
 * ## When it does not pin
 *
 * On a phone, and for anybody who has asked for less motion, the stages become
 * an ordinary numbered list. Pinning a section on a small screen takes the
 * scroll away from somebody who is using it to get somewhere.
 */

export interface FlowStage {
  id: string;
  index: string;
  title: string;
  body: string;
  beats: string[];
}

export function FlowScroll({ stages, tone }: { stages: FlowStage[]; tone: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const [at, setAt] = useState(0);

  const { scrollYProgress } = useScroll({
    target: outer,
    offset: ['start start', 'end end'],
  });

  /*
   * Which stage the scroll is on.
   *
   * The progress runs 0 to 1 across the whole pinned length; dividing it into
   * as many bands as there are stages gives the index. Clamped at the top end
   * because progress reaches exactly 1 at the very bottom and would otherwise
   * ask for a stage that does not exist.
   */
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    const next = Math.min(stages.length - 1, Math.floor(value * stages.length));
    setAt((was) => (was === next ? was : next));
  });

  const stage = stages[at];
  const share = stages.length > 1 ? at / (stages.length - 1) : 1;

  return (
    <section
      className="cx-flow"
      ref={outer}
      data-still={String(Boolean(still))}
      style={
        {
          '--tone': tone,
          // One screen per stage, plus one so the last one is readable before
          // the section lets go.
          '--stages': stages.length,
        } as React.CSSProperties
      }
    >
      <div className="cx-flow-pin">
        <Helix density={0.5} />

        <div className="cx-flow-in">
          {/* The chain, building as the reader goes. */}
          <div className="cx-flow-chain" aria-hidden="true">
            <span className="cx-flow-rail">
              <motion.span
                className="cx-flow-rail-on"
                animate={{ scaleX: share }}
                transition={{ duration: 0.5, ease: [0.22, 0.61, 0.28, 1] }}
              />
            </span>

            <ol>
              {stages.map((item, index) => (
                <li key={item.id} data-on={String(index <= at)} data-here={String(index === at)}>
                  <span className="cx-flow-node" />
                  <span className="cx-flow-node-name">{item.title}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="cx-flow-words">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stage.id}
                initial={still ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={still ? undefined : { opacity: 0, y: -14 }}
                transition={{ duration: 0.38, ease: [0.22, 0.61, 0.28, 1] }}
              >
                <p className="cx-flow-step">
                  <b>{stage.index}</b>
                  <span>
                    of {String(stages.length).padStart(2, '0')}
                  </span>
                </p>
                <h3>{stage.title}</h3>
                <p className="cx-flow-body">{stage.body}</p>

                {stage.beats.length ? (
                  <ul className="cx-flow-beats">
                    {stage.beats.map((beat, index) => (
                      <motion.li
                        key={beat}
                        initial={still ? false : { opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 + index * 0.07, duration: 0.34 }}
                      >
                        {beat}
                      </motion.li>
                    ))}
                  </ul>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
