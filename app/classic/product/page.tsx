import type { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCTS } from '../../../components/site/catalogue';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'uBTC, Quantum Settle, Quantum Vault and the Quantum Node Network: four products on one post-quantum verification core.',
};

/**
 * The four products, listed.
 *
 * In the environment this is four doors that take you into a walk. Here it is
 * a list, which is what a list is for: a reader can see all four at once, tell
 * which are running, and go to the one they came for without travelling
 * through the other three.
 */
export default function Page() {
  return (
    <>
      <section className="cx-page-head">
        <div className="cx-wrap">
          <p className="cx-eyebrow">Products</p>
          <h1 className="cx-page-title">Four products on one core</h1>
          <p className="cx-page-lede">
            The unit, the trade instrument, the custody underneath them, and the network that
            agrees before anything moves.
          </p>
        </div>
      </section>

      <section className="cx-sec">
        <div className="cx-wrap">
          <div className="cx-grid cx-grid-2">
            {PRODUCTS.map((product) => (
              <Link
                key={product.id}
                className="cx-product"
                href={`/classic/product/${product.id}`}
                style={{ '--tone': product.tone } as React.CSSProperties}
              >
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
                {product.alias ? <span className="cx-product-alias">{product.alias}</span> : null}
                <span className="cx-product-lede">{product.lede}</span>
                <span className="cx-product-status">{product.status}</span>

                <span className="cx-product-go">
                  Read about it
                  <i aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="cx-sec cx-sec-tint">
        <div className="cx-wrap">
          <header className="cx-sec-head">
            <p className="cx-eyebrow">One core</p>
            <h2 className="cx-sec-title">Four products rather than four codebases</h2>
            <p className="cx-sec-lede">
              All four are built on the same protocol: hybrid post-quantum signing, lattice key
              encapsulation, threshold approval, a spent-nullifier registry, and a record that
              can be verified independently afterwards.
            </p>
          </header>
        </div>
      </section>
    </>
  );
}
