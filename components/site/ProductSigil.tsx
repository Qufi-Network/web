'use client';

import { QUFI_MARK } from '../../assets/mark';

/**
 * The mark, arriving.
 *
 * Large, in the bottom-right corner, and deliberately cropped by both edges, so
 * it reads as something coming into the frame rather than a logo placed in it.
 * The same gesture the opening on the front of the site uses, held still.
 *
 * It takes the product's colour rather than the site's blue: the artwork is used
 * as a mask over a flat fill, so the letterform is exact and the colour is
 * whatever the product wears everywhere else on the page.
 */
export function ProductSigil({ tone }: { tone: string }) {
  return (
    <div
      className="sigil"
      aria-hidden="true"
      style={
        {
          '--tone': tone,
          '--mark': `url(${QUFI_MARK})`,
        } as React.CSSProperties
      }
    >
      <span className="sigil-fill" />
      <span className="sigil-edge" />
    </div>
  );
}
