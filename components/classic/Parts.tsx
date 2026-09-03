'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';

/**
 * What a product is made of, one part at a time.
 *
 * This was a definition list, which is the right shape for a reference and the
 * wrong one for a page somebody is reading to decide whether they care. Five
 * terms with five sentences beside them is five sentences nobody finishes.
 *
 * Now the parts are a stack, drawn in perspective, and picking one lights that
 * layer and brings its sentence forward. The stack is the point: these are not
 * five features side by side, they are five layers of one construction, and a
 * drawing that shows them stacked says that before any of the words do.
 */

export function Parts({
  parts,
  tone,
}: {
  parts: ReadonlyArray<readonly [string, string]>;
  tone: string;
}) {
  const [at, setAt] = useState(0);
  const still = useReducedMotion();
  const picked = parts[at];

  return (
    <div className="cx-parts" style={{ '--tone': tone } as React.CSSProperties}>
      {/*
        The stack, seen from slightly above. Each slab is one part; the chosen
        one comes forward and takes the colour, and the rest stay as outlines.
      */}
      <div className="cx-parts-stack" aria-hidden="true">
        {parts.map(([term], index) => (
          <button
            key={term}
            type="button"
            className="cx-parts-slab"
            data-on={String(index === at)}
            style={{ '--i': index, '--of': parts.length } as React.CSSProperties}
            onClick={() => setAt(index)}
            tabIndex={-1}
          >
            <span />
          </button>
        ))}
      </div>

      <div className="cx-parts-body">
        <div className="cx-parts-list" role="tablist" aria-label="What it is made of">
          {parts.map(([term], index) => (
            <button
              key={term}
              type="button"
              role="tab"
              id={`cx-part-${index}`}
              aria-selected={index === at}
              aria-controls="cx-parts-panel"
              className="cx-parts-term"
              onClick={() => setAt(index)}
            >
              {index === at ? (
                <motion.span
                  className="cx-parts-mark"
                  layoutId="cx-parts-mark"
                  transition={
                    still ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }
                  }
                />
              ) : null}
              <span className="cx-parts-n">{String(index + 1).padStart(2, '0')}</span>
              <span className="cx-parts-name">{term}</span>
            </button>
          ))}
        </div>

        <div
          className="cx-parts-panel"
          id="cx-parts-panel"
          role="tabpanel"
          aria-labelledby={`cx-part-${at}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={picked[0]}
              initial={still ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={still ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.32, ease: [0.22, 0.61, 0.28, 1] }}
            >
              <p className="cx-parts-panel-term">{picked[0]}</p>
              <p className="cx-parts-panel-said">{picked[1]}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
