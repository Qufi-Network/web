'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { CRYPTOGRAPHY } from '../../content/story';

/**
 * The five primitives, one at a time.
 *
 * This was a definition list: five terms, five one-line answers, and no way to
 * find out what any of them meant. The lines are the right lines, but a reader
 * who does not already know what a spent-nullifier registry is learns nothing
 * from being told that there is one.
 *
 * So the terms became a set of buttons and the answer became a panel: what the
 * primitive is, what it actually means, what it stops, and a drawing of the
 * mechanism that redraws itself each time the selection changes. Five short
 * explanations behind five clicks, rather than five phrases nobody can use.
 *
 * The first is selected on arrival, so the panel is never empty and nobody has
 * to guess that the terms are pressable.
 */

const DRAW = 400;

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** One stroke, drawing itself whenever the panel changes. */
function Line({ d, delay = 0, slow = 1 }: { d: string; delay?: number; slow?: number }) {
  return (
    <motion.path
      d={d}
      {...stroke}
      strokeDasharray={DRAW}
      initial={{ strokeDashoffset: DRAW, opacity: 0 }}
      animate={{ strokeDashoffset: 0, opacity: 1 }}
      transition={{
        strokeDashoffset: { duration: 0.85 * slow, delay, ease: [0.22, 0.61, 0.28, 1] },
        opacity: { duration: 0.2, delay },
      }}
    />
  );
}

function Dot({
  cx,
  cy,
  r = 3,
  delay = 0,
  lit = false,
}: {
  cx: number;
  cy: number;
  r?: number;
  delay?: number;
  lit?: boolean;
}) {
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={r}
      fill={lit ? 'currentColor' : 'var(--paper)'}
      stroke="currentColor"
      strokeWidth={1.5}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 340, damping: 20, delay }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    />
  );
}

/**
 * A drawing of each mechanism.
 *
 * Not a metaphor for it. Two curves converging on one seal is what hybrid
 * signing is; three of five nodes lit is what a threshold is; an entry struck
 * through is what a spent nullifier is.
 */
function Diagram({ id }: { id: string }) {
  if (id === 'signatures') {
    return (
      <>
        <Line d="M12 30 C30 12 44 12 62 30" />
        <Line d="M12 66 C30 84 44 84 62 66" delay={0.08} />
        <Line d="M62 30 C74 40 74 56 62 66" delay={0.16} />
        <Line d="M84 48 h34" delay={0.3} />
        <Line d="M126 34 h32 v28 h-32 z" delay={0.4} />
        <Line d="M134 48 l6 7 12 -14" delay={0.6} slow={1.2} />
        <Dot cx={12} cy={30} delay={0.1} lit />
        <Dot cx={12} cy={66} delay={0.16} lit />
      </>
    );
  }

  if (id === 'encryption') {
    return (
      <>
        {/* The key, and the lattice closing around it. */}
        <Line d="M44 48 m-13 0 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0" />
        <Line d="M57 48 h30 v10" delay={0.1} />
        <Line d="M74 48 v8" delay={0.16} />
        <Line d="M104 20 h56 v56 h-56 z" delay={0.28} />
        <Line d="M104 38 h56 M104 58 h56 M122 20 v56 M142 20 v56" delay={0.4} slow={1.4} />
        <Dot cx={44} cy={48} r={2.4} delay={0.14} lit />
      </>
    );
  }

  if (id === 'approval') {
    return (
      <>
        <Line d="M30 30 L86 20 L142 34 L120 74 L52 72 Z" delay={0.1} slow={1.4} />
        <Line d="M86 20 L86 48 M30 30 L86 48 M142 34 L86 48 M52 72 L86 48 M120 74 L86 48" delay={0.3} slow={1.5} />
        {/* Three of five, which is what a threshold looks like. */}
        <Dot cx={30} cy={30} delay={0.15} lit />
        <Dot cx={86} cy={20} delay={0.22} lit />
        <Dot cx={142} cy={34} delay={0.29} />
        <Dot cx={120} cy={74} delay={0.36} lit />
        <Dot cx={52} cy={72} delay={0.43} />
        <Dot cx={86} cy={48} r={5} delay={0.55} lit />
      </>
    );
  }

  if (id === 'replay') {
    return (
      <>
        <Line d="M24 16 h84 l16 16 v56 h-100 z" />
        <Line d="M108 16 v16 h16" delay={0.12} />
        <Line d="M40 44 h50" delay={0.24} />
        <Line d="M40 58 h60" delay={0.3} />
        <Line d="M40 72 h38" delay={0.36} />
        {/* Struck through: presented once, and never again. */}
        <Line d="M32 58 h76" delay={0.62} slow={0.7} />
        <Line d="M140 40 v40" delay={0.5} />
        <Line d="M132 72 l8 8 8 -8" delay={0.58} />
        <Dot cx={140} cy={34} r={3} delay={0.5} lit />
      </>
    );
  }

  return (
    <>
      <Line d="M20 16 h72 l16 16 v56 h-88 z" />
      <Line d="M92 16 v16 h16" delay={0.12} />
      <Line d="M36 46 h44 M36 60 h52 M36 74 h30" delay={0.24} slow={1.3} />
      {/* Checked by somebody else, somewhere else, later. */}
      <Line d="M120 48 h22" delay={0.44} />
      <Line d="M150 26 h30 v44 h-30 z" delay={0.54} />
      <Line d="M157 48 l6 7 12 -15" delay={0.72} slow={1.2} />
      <Dot cx={120} cy={48} r={2.6} delay={0.48} lit />
    </>
  );
}

export function Crypto() {
  const [at, setAt] = useState(0);
  const still = useReducedMotion();
  const picked = CRYPTOGRAPHY[at];

  return (
    <div className="cx-crypto">
      {/* The terms, as a set of choices. */}
      <div className="cx-crypto-list" role="tablist" aria-label="Cryptographic primitives">
        {CRYPTOGRAPHY.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`cx-crypto-tab-${item.id}`}
            aria-selected={index === at}
            aria-controls="cx-crypto-panel"
            className="cx-crypto-term"
            onClick={() => setAt(index)}
          >
            {/* The marker slides between terms rather than appearing on each. */}
            {index === at ? (
              <motion.span
                className="cx-crypto-mark"
                layoutId="cx-crypto-mark"
                transition={
                  still ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }
                }
              />
            ) : null}
            <span className="cx-crypto-term-name">{item.term}</span>
            <span className="cx-crypto-term-said">{item.said}</span>
          </button>
        ))}
      </div>

      <div
        className="cx-crypto-panel"
        id="cx-crypto-panel"
        role="tabpanel"
        aria-labelledby={`cx-crypto-tab-${picked.id}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={picked.id}
            initial={still ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={still ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.34, ease: [0.22, 0.61, 0.28, 1] }}
          >
            <span className="cx-crypto-art">
              <svg viewBox="0 0 180 96" fill="none" aria-hidden="true">
                <Diagram id={picked.id} />
              </svg>
            </span>

            <h3>{picked.said}</h3>
            <p className="cx-crypto-body">{picked.body}</p>

            <p className="cx-crypto-against">
              <span>Stops</span>
              {picked.against}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
