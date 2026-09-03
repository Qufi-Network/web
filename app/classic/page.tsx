import type { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCTS } from '../../components/site/catalogue';
import { TEAM } from '../../content/team';
import { CLOSING, HERO } from '../../content/story';
import { roomStats } from '../../components/site/dataroom/catalogue';
import { PAPERS } from '../../components/site/dataroom/papers';
import { Helix } from '../../components/classic/Helix';
import { Capabilities } from '../../components/classic/Capabilities';
import { Crypto } from '../../components/classic/Crypto';
import { ModelScroll } from '../../components/classic/ModelScroll';
import { Item, Reveal, Stagger } from '../../components/classic/Reveal';

export const metadata: Metadata = {
  description:
    'QuFi is an independent verification layer beneath high-value digital settlement. Post-quantum signing, proof generation off the settlement path, collateral confirmation, proof-gated movement and recovery pathways.',
};

/**
 * The front of the standard site.
 *
 * The order is the order somebody unfamiliar needs: what it is, how the model
 * works in three steps, what it can do, what has been built on it, who is
 * behind it, and where the documents are. No scrolling puzzle and no reveal
 * that hides anything. Everything is on the page and the page can be read top
 * to bottom in about four minutes.
 *
 * The motion is the one thing this site borrows from the environment. A helix
 * turning behind the headline, a field of nodes behind the closing line,
 * icons that draw themselves as they are reached, sections that rise as they
 * arrive. All of it in the blue the mark is drawn in, and all of it off the
 * moment a visitor says they want less of it.
 */
export default function Page() {
  const stats = roomStats();

  return (
    <>
      {/* ---- what it is ---- */}
      <section className="cx-hero cx-hero-helix">
        <Helix />

        <div className="cx-wrap cx-hero-words">
          <Reveal>
            <p className="cx-eyebrow">QuFi Network</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="cx-hero-title">{HERO.title}</h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="cx-hero-lede">{HERO.lede}</p>
          </Reveal>
          <Reveal delay={0.22}>
            <p className="cx-hero-body">{HERO.body}</p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="cx-hero-go">
              <Link className="cx-btn cx-btn-solid" href="/classic/product">
                See the products
                <i aria-hidden="true" />
              </Link>
              <Link className="cx-btn" href="/classic/data-room">
                Open the data room
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/*
        The model, taken sideways. Three coloured panels that travel as the
        page is scrolled, each with a helix turning behind it.
      */}
      <ModelScroll />

      {/* ---- what it does ---- */}
      <section className="cx-sec">
        <div className="cx-wrap">
          <Reveal className="cx-sec-head">
            <p className="cx-eyebrow">Capabilities</p>
            <h2 className="cx-sec-title">Eight things the layer does</h2>
            <p className="cx-sec-lede">
              In the order they build: the layer, how it signs, what it produces, what it can
              hold, what it will let through, what happens when something breaks, where it sits,
              and what moves over it. Turn a card over for the detail.
            </p>
          </Reveal>

          <Capabilities />
        </div>
      </section>

      {/* ---- what is built on it ---- */}
      <section className="cx-sec cx-sec-tint">
        <div className="cx-wrap">
          <Reveal className="cx-sec-head">
            <p className="cx-eyebrow">Products</p>
            <h2 className="cx-sec-title">Four products on one core</h2>
            <p className="cx-sec-lede">
              The unit, the trade instrument, the custody underneath them, and the network that
              agrees before anything moves. Four products rather than four codebases.
            </p>
          </Reveal>

          <Stagger className="cx-grid cx-grid-2" gap={0.09}>
            {PRODUCTS.map((product) => (
              <Item key={product.id} style={{ '--tone': product.tone } as React.CSSProperties}>
                <Link className="cx-product" href={`/classic/product/${product.id}`}>
                  {/* The mark, arriving into the corner. */}
                  <span className="cx-sigil" aria-hidden="true">
                    <i className="cx-sigil-fill" />
                    <i className="cx-sigil-edge" />
                  </span>

                  <span className="cx-product-top">
                    <span className="cx-product-index">{product.index}</span>
                    <span className="cx-product-kind">{product.kind}</span>
                    <span className="cx-chip" data-live={String(product.live)}>
                      <i aria-hidden="true" />
                      {product.live ? 'Live' : 'In build'}
                    </span>
                  </span>

                  <span className="cx-product-name">{product.name}</span>
                  {product.alias ? (
                    <span className="cx-product-alias">{product.alias}</span>
                  ) : null}
                  <span className="cx-product-lede">{product.lede}</span>
                  <span className="cx-product-status">{product.status}</span>

                  <span className="cx-product-go">
                    Read about it
                    <i aria-hidden="true" />
                  </span>
                </Link>
              </Item>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---- what it is made of ---- */}
      <section className="cx-sec">
        <div className="cx-wrap cx-split">
          <Reveal className="cx-sec-head">
            <p className="cx-eyebrow">Cryptography</p>
            <h2 className="cx-sec-title">What it is made of</h2>
            <p className="cx-sec-lede">
              The same five primitives underneath all four products. Pick one to see what it
              means and what it stops. Nothing here is a claim about throughput; it is a
              description of the construction.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <Crypto />
          </Reveal>
        </div>
      </section>

      {/* ---- who ---- */}
      <section className="cx-sec cx-sec-tint">
        <div className="cx-wrap">
          <Reveal className="cx-sec-head">
            <p className="cx-eyebrow">Leadership team</p>
            <h2 className="cx-sec-title">
              QuFi is governed and led by a team of recognised industry pioneers and leaders.
            </h2>
          </Reveal>

          <Stagger className="cx-grid cx-grid-3" gap={0.1}>
            {TEAM.map((person) => (
              <Item
                key={person.id}
                className="cx-person"
                style={{ '--tone': person.tone } as React.CSSProperties}
              >
                {/* The mark, arriving in the corner in this person's colour. */}
                <span className="cx-sigil" aria-hidden="true">
                  <i className="cx-sigil-fill" />
                  <i className="cx-sigil-edge" />
                </span>

                <span className="cx-person-photo">
                  <img src={person.photo} alt={person.name} width={480} height={480} />
                  <i aria-hidden="true" />
                </span>
                <h3>{person.name}</h3>
                <p>{person.role}</p>
              </Item>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---- where the documents are ---- */}
      <section className="cx-sec cx-sec-band">
        {/* The same helix as the hero, on colour rather than on paper. */}
        <Helix scheme="onColour" density={0.6} />

        <div className="cx-wrap">
          <Reveal>
            <div className="cx-cta">
              <div className="cx-cta-words">
                <p className="cx-eyebrow">Data room</p>
                <h2 className="cx-sec-title">
                  {stats.documents} documents across nine sections
                </h2>
                <p className="cx-sec-lede">
                  The technology, the products, the architecture and the strategy.{' '}
                  {PAPERS.length} are written and open in the browser; the rest carry their
                  status and show you what will be in them.
                </p>
                <Link className="cx-btn cx-btn-solid" href="/classic/data-room">
                  Open the data room
                  <i aria-hidden="true" />
                </Link>
              </div>

              <dl className="cx-cta-stats">
                <div>
                  <dt>Documents</dt>
                  <dd>{stats.documents}</dd>
                </div>
                <div>
                  <dt>Sections</dt>
                  <dd>{stats.sections}</dd>
                </div>
                <div>
                  <dt>Ready to read</dt>
                  <dd>{PAPERS.length}</dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- the line it ends on ---- */}
      <section className="cx-close">
        <div className="cx-wrap">
          <Reveal>
            <h2>{CLOSING.title}</h2>
            <p>{CLOSING.body}</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
