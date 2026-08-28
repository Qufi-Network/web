'use client';

import Link from 'next/link';
import { PRODUCTS } from './catalogue';
import { QUFI_MARK } from '../../assets/mark';

/**
 * Four ways in, two to a row.
 *
 * Every one of these is a door rather than a tab: clicking it does not open a
 * panel underneath, it takes the visitor into that product and starts the walk.
 * So they are built like doors — large, with the figure at the size it deserves
 * and the product's own colour on the frame — and there are two across, because
 * four across makes four small things and the whole point is that these are not
 * small things.
 *
 * The written product is at the far end of the walk rather than here. A visitor
 * who wants to read rather than travel gets there in one more click; a visitor
 * who wants to understand gets the better version first.
 *
 * Going near one brings the mark into its bottom corner, cropped by both edges
 * and in that product's colour — the card answering before it has been asked.
 */
export function Launcher() {
  return (
    <div className="doors">
      {PRODUCTS.map((product) => {
        return (
          <Link
            key={product.id}
            className="door"
            href={`/product/${product.id}`}
            style={
              {
                '--tone': product.tone,
                '--mark': `url(${QUFI_MARK})`,
              } as React.CSSProperties
            }
          >
            {/*
              The mark, arriving into the corner of the card the visitor is
              reaching for. Cropped by two edges so it reads as coming in rather
              than as a logo that was always sitting there, and wearing the
              product's colour so the card answers in the product's voice.
            */}
            <span className="door-sigil" aria-hidden="true">
              <i className="door-sigil-fill" />
              <i className="door-sigil-edge" />
            </span>

            <span className="door-figure" aria-hidden="true">
              <product.Figure />
            </span>

            <span className="door-words">
              <span className="door-index" aria-hidden="true">
                {product.index}
              </span>
              <span className="door-name">{product.name}</span>
              <span className="door-kind">{product.kind}</span>
              <span className="door-lede">{product.lede}</span>
            </span>

            {/*
              What clicking does. All four are a journey now, so all four say
              so — a door that lies about what is behind it is worse than a
              plain one, and so is one that undersells it.
            */}
            <span className="door-go">
              <span>Walk it</span>
              <i aria-hidden="true" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
