'use client';

import Link from 'next/link';
import { PRODUCTS } from './catalogue';
import { Timeline } from './Timeline';

/**
 * The written product.
 *
 * What used to be the panel under the picker, now at the far end of a walk. The
 * content is unchanged — the lede, the two paragraphs, the parts, the rollout,
 * what goes on the chain — because the walk is a different way of saying the
 * same thing rather than a different thing.
 */
export function ProductDetail({ id }: { id: string }) {
  const product = PRODUCTS.find((entry) => entry.id === id);
  if (!product) return null;

  return (
    <section
      className="panel"
      style={{ '--tone': product.tone } as React.CSSProperties}
    >
      <p className="panel-eyebrow">
        <b>{product.index}</b>
        {product.kind}
      </p>
      <h1 className="panel-name">{product.name}</h1>
      {product.alias ? <p className="panel-alias">{product.alias}</p> : null}
      <p className="panel-lede">{product.lede}</p>

      {product.body.map((paragraph) => (
        <p key={paragraph.slice(0, 32)} className="panel-body">
          {paragraph}
        </p>
      ))}

      <dl className="panel-parts">
        {product.parts.map(([term, detail]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{detail}</dd>
          </div>
        ))}
      </dl>

      {product.timeline ? (
        <Timeline
          title={product.timeline.title}
          lead={product.timeline.lead}
          stops={product.timeline.stops}
        />
      ) : null}

      {product.anchor ? (
        <div className="anchor">
          <h2 className="anchor-title">{product.anchor.title}</h2>
          <p className="anchor-lead">{product.anchor.lead}</p>

          <div className="anchor-payload" aria-hidden="true">
            {product.anchor.payload.map((field) => (
              <div key={field.value} className="anchor-field" data-lit={String(Boolean(field.lit))}>
                <span className="anchor-value">{field.value}</span>
                <span className="anchor-size">{field.size}</span>
              </div>
            ))}
          </div>

          <p className="anchor-note">{product.anchor.note}</p>

          {product.anchor.proof ? (
            <a
              className="anchor-proof"
              href={product.anchor.proof.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span className="anchor-proof-label">{product.anchor.proof.label}</span>
              <span className="anchor-proof-txid">{product.anchor.proof.txid}</span>
              <span className="anchor-proof-go" aria-hidden="true">
                mempool.space ↗
              </span>
            </a>
          ) : null}

          <p className="anchor-writes">
            {['Mint', 'Transfer', 'Redeem'].map((word, index) => (
              <span key={word}>
                {index > 0 ? <i aria-hidden="true">·</i> : null}
                {word}
              </span>
            ))}
          </p>
        </div>
      ) : null}

      <p className="panel-status" data-live={String(product.live)}>
        <i aria-hidden="true" />
        {product.status}
      </p>

      <p className="panel-back">
        <Link className="back" href="/product">
          <i className="back-arrow" aria-hidden="true" />
          All products
        </Link>
      </p>
    </section>
  );
}
