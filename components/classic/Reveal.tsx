'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';

/**
 * Things arriving as they are reached.
 *
 * One wrapper rather than a decision on every section, so the whole site
 * breathes at the same rate. The movement is deliberately small: eighteen
 * pixels and a fade. Anything larger turns reading into waiting, and this is a
 * site somebody chose because they wanted to read.
 *
 * `once` is set on every reveal. An element that re-animates each time it
 * crosses the fold is an element that punishes scrolling back.
 */

const RISE: Variants = {
  rest: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0 },
};

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const still = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={still ? false : 'rest'}
      whileInView="shown"
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      variants={RISE}
      transition={{ duration: 0.62, delay, ease: [0.22, 0.61, 0.28, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A list whose items arrive one after another.
 *
 * The stagger is short enough that a fast scroller sees a group rather than a
 * queue: eight cards at sixty milliseconds apart is half a second end to end.
 */
export function Stagger({
  children,
  className,
  gap = 0.06,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
}) {
  const still = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={still ? false : 'rest'}
      whileInView="shown"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      variants={{ shown: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

/** One item inside a `Stagger`. */
export function Item({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={RISE}
      transition={{ duration: 0.58, ease: [0.22, 0.61, 0.28, 1] }}
    >
      {children}
    </motion.div>
  );
}
