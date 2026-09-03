import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PRODUCTS } from '../../../../components/site/catalogue';
import { journeyFor } from '../../../../experience/lifecycle/journeys/index';
import { Parts } from '../../../../components/classic/Parts';
import { FlowScroll } from '../../../../components/classic/FlowScroll';

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ id: product.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = PRODUCTS.find((entry) => entry.id === id);
  if (!product) return {};
  return { title: product.name, description: product.lede };
}

/**
 * One product, written out.
 *
 * The environment says this by taking the visitor through it; here it is said
 * on a page, in the order somebody reading rather than travelling needs: what
 * it is, how to get at it if it is running, what it does, what it is made of,
 * the steps in order, what goes on the chain, and when the rest of it lands.
 *
 * The steps come out of the same journey the walkthrough is built from, so the
 * two cannot describe different products. What is a camera move over there is
 * a numbered list here.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = PRODUCTS.find((entry) => entry.id === id);
  if (!product) notFound();

  const journey = journeyFor(id);
  const tone = { '--tone': product.tone } as React.CSSProperties;

  return (
    <div style={tone}>
      <section className="cx-page-head cx-page-head-tone">
        <div className="cx-wrap">
          <p className="cx-crumbs">
            <Link href="/classic/product">Products</Link>
            <i aria-hidden="true">/</i>
            <span>{product.name}</span>
          </p>

          <p className="cx-eyebrow cx-eyebrow-tone">
            {product.index} · {product.kind}
          </p>
          <h1 className="cx-page-title">{product.name}</h1>
          {product.alias ? <p className="cx-page-alias">{product.alias}</p> : null}
          <p className="cx-page-lede">{product.lede}</p>

          <p className="cx-status-line">
            <span className="cx-chip" data-live={String(product.live)}>
              <i aria-hidden="true" />
              {product.live ? 'Live' : 'In build'}
            </span>
            {product.status}
          </p>

          {/*
            The door into the running application, high on the page rather than
            at the foot of it. A visitor who came to sign in should not have to
            read about the thing to find the thing.
          */}
          {product.app ? (
            <a
              className="cx-appdoor"
              href={product.app.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span className="cx-appdoor-words">
                <span className="cx-appdoor-label">{product.app.label}</span>
                <span className="cx-appdoor-note">{product.app.note}</span>
              </span>
              <span className="cx-appdoor-go">
                {new URL(product.app.href).host}
                <i aria-hidden="true" />
              </span>
            </a>
          ) : null}
        </div>
      </section>

      <section className="cx-sec">
        <div className="cx-wrap cx-prose">
          {product.body.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="cx-sec cx-sec-tint">
        <div className="cx-wrap cx-split">
          <header className="cx-sec-head">
            <p className="cx-eyebrow cx-eyebrow-tone">What it is made of</p>
            <h2 className="cx-sec-title">The parts</h2>
            <p className="cx-sec-lede">
              {product.parts.length} layers of one construction rather than{' '}
              {product.parts.length} features side by side. Pick a layer to see what it does.
            </p>
          </header>

          <Parts parts={product.parts} tone={product.tone} />
        </div>
      </section>

      {journey ? (
        <section className="cx-sec cx-sec-flat">
          <div className="cx-wrap">
            <header className="cx-sec-head">
              <p className="cx-eyebrow cx-eyebrow-tone">Step by step</p>
              <h2 className="cx-sec-title">How it runs</h2>
              <p className="cx-sec-lede">
                Scroll to move through it a stage at a time.
              </p>
            </header>
          </div>

          <FlowScroll
            stages={journey.stages.map((item) => ({
              id: item.id,
              index: item.index,
              title: item.title,
              body: item.body,
              beats: item.beats,
            }))}
            tone={product.tone}
          />
        </section>
      ) : null}

      {/* What this product writes to the chain, field by field. */}
      {product.anchor ? (
        <section className="cx-sec cx-sec-tint">
          <div className="cx-wrap">
            <header className="cx-sec-head">
              <p className="cx-eyebrow cx-eyebrow-tone">On the chain</p>
              <h2 className="cx-sec-title">{product.anchor.title}</h2>
              <p className="cx-sec-lede">{product.anchor.lead}</p>
            </header>

            <div className="cx-payload">
              {product.anchor.payload.map((field) => (
                <div key={field.value} data-lit={String(Boolean(field.lit))}>
                  <span className="cx-payload-value">{field.value}</span>
                  <span className="cx-payload-size">{field.size}</span>
                </div>
              ))}
            </div>

            <p className="cx-payload-note">{product.anchor.note}</p>

            {product.anchor.proof ? (
              <a
                className="cx-btn"
                href={product.anchor.proof.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                {product.anchor.proof.label}
                <i aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      {product.timeline ? (
        <section className="cx-sec">
          <div className="cx-wrap">
            <header className="cx-sec-head">
              <p className="cx-eyebrow cx-eyebrow-tone">What comes next</p>
              <h2 className="cx-sec-title">{product.timeline.title}</h2>
              <p className="cx-sec-lede">{product.timeline.lead}</p>
            </header>

            <ol className="cx-stops">
              {product.timeline.stops.map((stop) => (
                <li key={stop.where} data-state={stop.state}>
                  <span className="cx-stop-when">{stop.when}</span>
                  <div>
                    <h3>{stop.where}</h3>
                    <p>{stop.what}</p>
                  </div>
                  <span className="cx-chip" data-live={String(stop.state === 'live')}>
                    <i aria-hidden="true" />
                    {stop.state === 'live' ? 'Live' : stop.state === 'building' ? 'Building' : 'Planned'}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      <section className="cx-sec cx-sec-tint">
        <div className="cx-wrap">
          <header className="cx-sec-head">
            <p className="cx-eyebrow cx-eyebrow-tone">The others</p>
            <h2 className="cx-sec-title">Three more on the same core</h2>
          </header>

          <div className="cx-grid cx-grid-3">
            {PRODUCTS.filter((other) => other.id !== product.id).map((other) => (
              <Link
                key={other.id}
                className="cx-product"
                href={`/classic/product/${other.id}`}
                style={{ '--tone': other.tone } as React.CSSProperties}
              >
                <span className="cx-product-top">
                  <span className="cx-product-index">{other.index}</span>
                  <span className="cx-product-kind">{other.kind}</span>
                </span>
                <span className="cx-product-name">{other.name}</span>
                <span className="cx-product-lede">{other.lede}</span>
                <span className="cx-product-go">
                  Read about it
                  <i aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
