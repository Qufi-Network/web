import type { Metadata } from 'next';
import { DocPage } from '../../components/site/DocPage';
import { Launcher } from '../../components/site/Launcher';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'uBTC, Quantum Settle, Quantum Vault and the Quantum Node Network: four products on one post-quantum verification core.',
};

/**
 * Products.
 *
 * Four doors, two to a row. Each one takes the visitor into that product rather
 * than opening a panel underneath, because the better version of "what is this"
 * is a walk through it, and the written version is at the far end of the walk.
 */
export default function Page() {
  return (
    <DocPage
      index="01"
      title="Products"
      lede="Four products on one post-quantum verification core: the unit, the trade instrument, the custody underneath them, and the network that agrees before anything moves."
    >
      <Launcher />

      <section className="doc-section">
        <h2>One core underneath</h2>
        <p>
          All four are built on the same protocol: hybrid post-quantum signing, lattice key
          encapsulation, threshold approval, a spent-nullifier registry, and a record that can be
          verified independently afterwards. They are four products rather than four codebases.
        </p>
      </section>
    </DocPage>
  );
}
