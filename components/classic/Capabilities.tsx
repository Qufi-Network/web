'use client';

import { CAPABILITIES } from '../../content/story';
import { CapabilityIcon } from './Icons';
import { Item, Stagger } from './Reveal';

/**
 * The eight capabilities, as cards that turn over.
 *
 * The front carries what the thing is: an icon that draws itself as the card
 * arrives, a number, a name and one line. The back carries the paragraph. A
 * reader scanning gets eight names in one glance instead of eight paragraphs,
 * and the one they stop on gives them the detail without taking them anywhere.
 *
 * ## Colour
 *
 * The four product colours, twice round. It is the same set the products and
 * the people wear, which is what stops this page having a fifth palette, and
 * eight cards in four colours reads as a set of pairs rather than a rainbow.
 *
 * ## Not hover alone
 *
 * A card whose content only exists under a pointer is a card half the visitors
 * cannot read. It turns on focus as well, so a keyboard reaches it; and where
 * there is no hover at all, the flip is abandoned entirely and both faces are
 * stacked into one card. The paragraph is in the markup either way, so a
 * screen reader was never in any doubt.
 */

/*
 * The environment's four colours, twice round.
 *
 * These are the colours the products wear in the network and nowhere else on
 * this site are they changed. The amber was briefly swapped for blue because
 * mixing it into the ink for the back of a card turned it brown; the answer
 * was not a different colour but a different back. It is the site's own ink
 * now, with the tone on the index, the rule and the mark, so all four show as
 * themselves.
 */
const TONES = ['#3BE08F', '#A97BFF', '#FFB03A', '#4CC9FF'];

export function Capabilities() {
  return (
    <Stagger className="cx-grid cx-grid-4" gap={0.055}>
      {CAPABILITIES.map((cap, index) => (
        <Item
          key={cap.index}
          className="cx-flip"
          style={{ '--tone': TONES[index % TONES.length] } as React.CSSProperties}
        >
          {/* Focusable so the back is reachable without a pointer. */}
          <div className="cx-flip-in" tabIndex={0}>
            <div className="cx-flip-front">
              <span className="cx-flip-art">
                <CapabilityIcon index={cap.index} />
              </span>
              <p className="cx-flip-index">{cap.index}</p>
              <h3>{cap.title}</h3>
              <p className="cx-flip-lede">{cap.lede}</p>
              <span className="cx-flip-more" aria-hidden="true">
                <i />
              </span>
            </div>

            <div className="cx-flip-back">
              {/* The mark, cropped into the corner, as everywhere else. */}
              <span className="cx-sigil" aria-hidden="true">
                <i className="cx-sigil-fill" />
                <i className="cx-sigil-edge" />
              </span>

              <p className="cx-flip-index">{cap.index}</p>
              <h3>{cap.title}</h3>
              <p className="cx-flip-body">{cap.body}</p>
            </div>
          </div>
        </Item>
      ))}
    </Stagger>
  );
}
