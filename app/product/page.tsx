import type { Metadata } from 'next';
import { DocPage } from '../../components/site/DocPage';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'What QuFi is: an independent verification layer between action and settlement, and the parts it is made of.',
};

/**
 * Products.
 *
 * The shell is finished and the content is not: what goes in here is the
 * product material the network only gestures at, and it is being written. The
 * placeholder says so plainly rather than filling the page with lorem — a page
 * that looks complete and is not is the harder thing to correct later.
 */
export default function Page() {
  return (
    <DocPage
      index="01"
      title="Products"
      lede="An independent verification layer between action and settlement."
    >
      <section className="doc-section">
        <h2>What it does</h2>
        <p>
          QuFi sits beneath high-value digital settlement. An instruction is defined, the network
          checks it independently and away from the settlement path, and the settlement environment
          receives a verified result rather than the work that produced it.
        </p>
      </section>

      <section className="doc-section">
        <h2>What it is made of</h2>
        <dl className="doc-list">
          <div>
            <dt>Post-quantum signing</dt>
            <dd>
              Verification designed for a world where today’s cryptographic assumptions can no
              longer be taken for granted.
            </dd>
          </div>
          <div>
            <dt>Proof generation</dt>
            <dd>
              Computationally intensive verification moved off the settlement path, returning a
              compact proof.
            </dd>
          </div>
          <div>
            <dt>Collateral confirmation</dt>
            <dd>Assets verified before they move.</dd>
          </div>
          <div>
            <dt>Proof-gated movement</dt>
            <dd>Movement made conditional on verified proof.</dd>
          </div>
          <div>
            <dt>Recovery pathways</dt>
            <dd>
              Verified processes continue when a route, environment or connection changes.
            </dd>
          </div>
          <div>
            <dt>Multiple settlement environments</dt>
            <dd>
              One verification layer beneath several architectures, rather than a replacement for
              any of them.
            </dd>
          </div>
        </dl>
      </section>

      <section className="doc-section doc-pending">
        <h2>In preparation</h2>
        <p>
          The full product material — architecture, integration surface and deployment — is being
          prepared and will be published here.
        </p>
      </section>
    </DocPage>
  );
}
