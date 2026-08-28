'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PRODUCTS } from './catalogue';
import { ProductDetail } from './ProductDetail';
import { ProductSigil } from './ProductSigil';
import { LifecycleRoot } from '../experience/LifecycleRoot';
import { journeyFor } from '../../experience/lifecycle/journeys';
import { useLife } from '../../experience/lifecycle/life';

/**
 * One product: the walk, and then the writing.
 *
 * A visitor who clicks a product lands inside it and travels through what it
 * does. Only at the far end does the written version offer itself, because by
 * then they have seen the thing the writing is about and the writing has
 * something to attach to.
 *
 * A product without a journey goes straight to the writing rather than to an
 * empty scene: a walk has to be built out of what the product actually does,
 * and one assembled out of adjectives would be worse than the page it replaced.
 */
export function ProductPage({ id }: { id: string }) {
  const product = PRODUCTS.find((entry) => entry.id === id);
  const stages = journeyFor(id);
  const [reading, setReading] = useState(!stages);

  if (!product) return null;
  if (!stages || reading) {
    return (
      <div className="read" data-walked={String(Boolean(stages))}>
        <ProductSigil tone={product.tone} />
        <ProductDetail id={id} />
      </div>
    );
  }

  return (
    <>
      <LifecycleRoot stages={stages} tone={product.tone} />
      <ProductSigil tone={product.tone} />
      <Ending id={id} onRead={() => setReading(true)} />
    </>
  );
}

/**
 * What is offered at the end of the walk.
 *
 * Two things, and only once the visitor has arrived: the written product, and —
 * where there is one — the transaction on the chain that proves the walk was
 * describing something real. Nothing here is on screen a moment earlier, so the
 * walk never has a button competing with it.
 */
function Ending({ id, onRead }: { id: string; onRead: () => void }) {
  const at = useLife((s) => s.at);
  const stages = journeyFor(id);
  const product = PRODUCTS.find((entry) => entry.id === id);
  const total = stages?.length ?? 1;
  // The last third of the last stage.
  const done = at > total - 0.34;

  if (!product) return null;

  return (
    <div className="ending" data-show={String(done)} aria-hidden={!done}>
      <div className="ending-inner" style={{ '--tone': product.tone } as React.CSSProperties}>
        {product.anchor?.proof ? (
          <a
            className="ending-proof"
            href={product.anchor.proof.href}
            target="_blank"
            rel="noreferrer noopener"
            tabIndex={done ? 0 : -1}
          >
            <span className="ending-proof-lead">See it on testnet4</span>
            <span className="ending-proof-label">{product.anchor.proof.label}</span>
            <span className="ending-proof-txid">{product.anchor.proof.txid}</span>
          </a>
        ) : null}

        <div className="ending-row">
          <button type="button" className="ending-go" onClick={onRead} tabIndex={done ? 0 : -1}>
            View product
            <i aria-hidden="true" />
          </button>

          <Link className="ending-back" href="/product" tabIndex={done ? 0 : -1}>
            All products
          </Link>
        </div>
      </div>
    </div>
  );
}
