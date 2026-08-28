'use client';

import Link from 'next/link';
import { PRODUCTS } from './catalogue';
import { JOURNEYS } from '../../experience/lifecycle/journeys';

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
 */
export function Launcher() {
  return (
    <div className="doors">
      {PRODUCTS.map((product) => {
        const walkable = Boolean(JOURNEYS[product.id]);
        return (
          <Link
            key={product.id}
            className="door"
            href={`/product/${product.id}`}
            style={{ '--tone': product.tone } as React.CSSProperties}
          >
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
              What clicking does. It matters that this is not the same on all
              four: two of them are a journey and two of them are, for now, a
              page — and a door that lies about what is behind it is worse than
              a plain one.
            */}
            <span className="door-go">
              <span>{walkable ? 'Walk it' : 'Read it'}</span>
              <i aria-hidden="true" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
