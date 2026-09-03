'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Eight icons, drawn rather than placed.
 *
 * Each one is a line drawing whose strokes are dashed to their own length and
 * offset by it, so at rest they are invisible and animating the offset to zero
 * draws them. That is the whole trick, and it is worth the small amount of
 * arithmetic because a drawing that arrives feels made, where a drawing that
 * fades in feels fetched.
 *
 * They are line-only on purpose: no fills, one weight, round caps. Eight icons
 * that share a construction read as a set; eight that share only a subject read
 * as eight icons.
 *
 * The subject of each is the mechanism, not a metaphor for it. Proof-gated
 * movement is a gate with something waiting at it. Recovery is a broken route
 * with a new one forming around the break. Nobody needs a shield.
 */

/*
 * Long enough to cover the longest path in the set.
 *
 * Measuring each path with `getTotalLength` would be exact and would cost a
 * layout pass per icon on mount. Overshooting the dash length is free and
 * looks identical, because a dash longer than its path is still one dash.
 */
const DRAW = 420;

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Drawn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const still = useReducedMotion();

  return (
    <motion.svg
      className="cx-icon"
      viewBox="0 0 64 64"
      initial={still ? false : 'rest'}
      whileInView="shown"
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      variants={{
        shown: { transition: { staggerChildren: 0.09, delayChildren: delay } },
      }}
      aria-hidden="true"
    >
      {children}
    </motion.svg>
  );
}

/** One stroke of an icon, drawing itself. */
function Line({ d, slow = 1 }: { d: string; slow?: number }) {
  return (
    <motion.path
      d={d}
      {...stroke}
      strokeDasharray={DRAW}
      variants={{
        rest: { strokeDashoffset: DRAW, opacity: 0 },
        shown: { strokeDashoffset: 0, opacity: 1 },
      }}
      transition={{
        strokeDashoffset: { duration: 0.9 * slow, ease: [0.22, 0.61, 0.28, 1] },
        opacity: { duration: 0.2 },
      }}
    />
  );
}

/** A node, which arrives rather than draws. */
function Dot({ cx, cy, r = 2.6, pulse = false }: { cx: number; cy: number; r?: number; pulse?: boolean }) {
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={r}
      fill="currentColor"
      variants={{
        rest: { scale: 0, opacity: 0 },
        shown: { scale: 1, opacity: pulse ? [1, 0.45, 1] : 1 },
      }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
      transition={{
        scale: { type: 'spring', stiffness: 380, damping: 22 },
        opacity: pulse
          ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.25 },
      }}
    />
  );
}

/* ---- 01 the layer ---------------------------------------------------------- */

function Core() {
  return (
    <Drawn>
      <Line d="M8 24 L32 12 L56 24 L32 36 Z" />
      <Line d="M8 32 L32 44 L56 32" />
      <Line d="M8 40 L32 52 L56 40" />
      <Dot cx={32} cy={24} r={3} pulse />
    </Drawn>
  );
}

/* ---- 02 signing ------------------------------------------------------------ */

function Signing() {
  return (
    <Drawn>
      <Line d="M14 40 C14 26 22 18 32 18 C42 18 50 26 50 40" />
      <Line d="M22 40 h20 v12 h-20 z" />
      <Line d="M32 44 v4" />
      <Dot cx={32} cy={18} />
    </Drawn>
  );
}

/* ---- 03 proof -------------------------------------------------------------- */

function Proof() {
  return (
    <Drawn>
      <Line d="M10 14 h30 l14 14 v22 H10 Z" />
      <Line d="M40 14 v14 h14" />
      <Line d="M18 38 l6 6 12 -14" slow={1.3} />
      <Dot cx={47} cy={21} r={2} />
    </Drawn>
  );
}

/* ---- 04 collateral --------------------------------------------------------- */

function Collateral() {
  return (
    <Drawn>
      <Line d="M32 8 L52 18 v14 c0 12 -9 20 -20 24 C21 52 12 44 12 32 V18 Z" />
      <Line d="M24 32 h16" />
      <Line d="M32 24 v16" />
      <Dot cx={32} cy={32} r={2.2} pulse />
    </Drawn>
  );
}

/* ---- 05 proof-gated movement ------------------------------------------------ */

function Gate() {
  return (
    <Drawn>
      <Line d="M22 10 v44" />
      <Line d="M42 10 v44" />
      <Line d="M6 32 h12" />
      <Line d="M46 32 h12" />
      <Dot cx={14} cy={32} r={3} pulse />
      <Dot cx={54} cy={32} r={2} />
    </Drawn>
  );
}

/* ---- 06 recovery ------------------------------------------------------------ */

function Recovery() {
  return (
    <Drawn>
      <Line d="M8 42 h14" />
      <Line d="M42 42 h14" />
      {/* The break, and the route that forms around it. */}
      <Line d="M26 42 h4" />
      <Line d="M34 42 h4" />
      <Line d="M22 42 C26 22 38 22 42 42" slow={1.4} />
      <Dot cx={8} cy={42} r={2.4} />
      <Dot cx={56} cy={42} r={2.4} pulse />
    </Drawn>
  );
}

/* ---- 07 settlement environments ---------------------------------------------- */

function Environments() {
  return (
    <Drawn>
      <Line d="M6 44 h52" />
      <Line d="M14 44 v-10 h12 v10" />
      <Line d="M26 44 v-18 h12 v18" />
      <Line d="M38 44 v-13 h12 v13" />
      <Line d="M6 52 h52" />
      <Dot cx={20} cy={52} r={2} />
      <Dot cx={32} cy={52} r={2} pulse />
      <Dot cx={44} cy={52} r={2} />
    </Drawn>
  );
}

/* ---- 08 flows ---------------------------------------------------------------- */

function Flows() {
  return (
    <Drawn>
      <Line d="M8 18 C24 18 24 32 40 32 h14" slow={1.2} />
      <Line d="M8 32 h46" />
      <Line d="M8 46 C24 46 24 32 40 32" slow={1.2} />
      <Dot cx={54} cy={32} r={3.2} pulse />
      <Dot cx={8} cy={18} r={2} />
      <Dot cx={8} cy={32} r={2} />
      <Dot cx={8} cy={46} r={2} />
    </Drawn>
  );
}

const SET: Record<string, () => React.JSX.Element> = {
  '01': Core,
  '02': Signing,
  '03': Proof,
  '04': Collateral,
  '05': Gate,
  '06': Recovery,
  '07': Environments,
  '08': Flows,
};

export function CapabilityIcon({ index }: { index: string }) {
  const Drawing = SET[index] ?? Core;
  return <Drawing />;
}

/* ---- the three steps of the model --------------------------------------------- */

export function ModelIcon({ step }: { step: 'instruct' | 'verify' | 'settle' }) {
  if (step === 'instruct') {
    return (
      <Drawn>
        <Line d="M14 12 h26 l10 10 v30 H14 Z" />
        <Line d="M22 28 h20" />
        <Line d="M22 36 h14" />
        <Dot cx={45} cy={17} r={2} />
      </Drawn>
    );
  }

  if (step === 'verify') {
    return (
      <Drawn>
        <Line d="M32 8 L52 18 v14 c0 12 -9 20 -20 24 C21 52 12 44 12 32 V18 Z" />
        <Line d="M23 32 l6 7 13 -15" slow={1.3} />
      </Drawn>
    );
  }

  return (
    <Drawn>
      <Line d="M32 10 L50 20 v20 L32 50 L14 40 V20 Z" />
      <Line d="M14 20 L32 30 L50 20" />
      <Line d="M32 30 v20" />
      <Dot cx={32} cy={30} r={2.4} pulse />
    </Drawn>
  );
}
