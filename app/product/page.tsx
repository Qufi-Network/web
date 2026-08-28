import type { Metadata } from 'next';
import { DocPage } from '../../components/site/DocPage';
import {
  NodeNetworkFigure,
  UbtcFigure,
  VaultFigure,
} from '../../components/site/ProductFigure';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'uBTC, Quantum Vault and the Quantum Node Network: three products on one post-quantum verification core.',
};

/**
 * Products.
 *
 * Three things built on the same core, in the order they depend on each other:
 * the unit, the custody underneath it, and the network that agrees before
 * either of them moves.
 *
 * Every status marker here is the honest one. uBTC runs on Bitcoin testnet4;
 * the other two have their primitives in the protocol and are not yet wired as
 * products, and the page says so rather than describing all three in the
 * present tense. Nothing on this page carries operator economics — capability
 * only, deliberately.
 */

const PRODUCTS = [
  {
    index: '01',
    name: 'uBTC',
    kind: 'Stable unit',
    tone: '#3BE08F',
    status: 'Live on Bitcoin testnet4',
    live: true,
    lede: 'Bitcoin held in a post-quantum vault, and a unit issued against it one for one.',
    Figure: UbtcFigure,
    body: [
      'A deposit goes into a Taproot vault whose spending conditions are committed to post-quantum keys. Once the deposit is confirmed and the collateral is checked, uBTC is issued against it; redeeming returns the underlying bitcoin and marks the instruction spent so it can never be replayed.',
      'Every step through that lifecycle is signed under two independent post-quantum schemes and verified before anything moves, which is what makes it a demonstration of the proof-gated model rather than a wrapper.',
    ],
    parts: [
      ['Signing', 'Hybrid post-quantum: two independent schemes, so one broken scheme does not break the instruction'],
      ['Collateral', 'The deposit is confirmed on Bitcoin, and the ratio checked, before anything is issued'],
      ['Replay', 'A spent-nullifier registry, checked atomically at redemption'],
      ['Record', 'A proof written for each mint and redemption, verifiable after the fact'],
    ],
  },
  {
    index: '02',
    name: 'Quantum Vault',
    kind: 'Custody',
    tone: '#FFB03A',
    status: 'Primitives in the protocol; not yet exposed as a product',
    live: false,
    lede: 'Custody the owner can leave without asking anyone.',
    Figure: VaultFigure,
    body: [
      'A vault is created together with a tree of pre-signed redemption transactions, each encrypted to the owner with lattice key encapsulation. The owner holds what is needed to complete them; the operator does not.',
      'Three ways out. One takes effect immediately. Two more open on their own after a delay written into the Bitcoin script itself, so the vault stays reachable even if the party who helped create it does not.',
    ],
    parts: [
      ['Immediate', 'Completed by the owner at any time, with no cooperation required'],
      ['Emergency', 'Opens on its own after a delay enforced by the script'],
      ['Recovery', 'A longer delay again, for the case where everything else has been lost'],
      ['Encryption', 'Lattice key encapsulation, so what unlocks the tree is only ever readable by its owner'],
    ],
  },
  {
    index: '03',
    name: 'Quantum Node Network',
    kind: 'Verification network',
    tone: '#4CC9FF',
    status: 'Threshold signing implemented; operator network in build',
    live: false,
    lede: 'Independent operators, and a threshold of them that has to agree.',
    Figure: NodeNetworkFigure,
    body: [
      'Verification is not something one machine does. Independent operators each hold a share of a key that was generated between them and never assembled anywhere, and a threshold of those operators has to co-sign before anything settles.',
      'That is what makes the layer neutral: no single operator can approve a movement, and no single operator can prevent one. The network is the thing being trusted, and it is made of parties who do not have to trust each other.',
    ],
    parts: [
      ['Key generation', 'Distributed, between the operators, with no point at which a whole key exists'],
      ['Approval', 'A threshold quorum co-signs as a group'],
      ['Verification', 'Each operator checks the post-quantum proof for itself before it signs'],
      ['Independence', 'No operator can approve alone, and none can block on their own'],
    ],
  },
] as const;

export default function Page() {
  return (
    <DocPage
      index="01"
      title="Products"
      lede="Three products on one post-quantum verification core: the unit, the custody underneath it, and the network that agrees before either of them moves."
    >
      {PRODUCTS.map(({ index, name, kind, tone, status, live, lede, body, parts, Figure }) => (
        <section
          key={name}
          className="product"
          style={{ '--tone': tone } as React.CSSProperties}
        >
          <div className="product-figure" aria-hidden="true">
            <Figure />
          </div>

          <div className="product-words">
            {/*
              What kind of thing it is, rather than its name again. The heading
              is directly underneath and says the name perfectly well.
            */}
            <p className="product-eyebrow">
              <b>{index}</b>
              {kind}
            </p>
            <h2 className="product-name">{name}</h2>
            <p className="product-lede">{lede}</p>

            {body.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="product-body">
                {paragraph}
              </p>
            ))}

            <dl className="product-parts">
              {parts.map(([term, detail]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{detail}</dd>
                </div>
              ))}
            </dl>

            {/*
              What is running and what is not, on every one of them. A page that
              describes three products in the same present tense when one of them
              is deployed and two are not is the thing this marker exists to stop.
            */}
            <p className="product-status" data-live={String(live)}>
              <i aria-hidden="true" />
              {status}
            </p>
          </div>
        </section>
      ))}

      <section className="doc-section">
        <h2>One core underneath</h2>
        <p>
          All three are built on the same protocol: hybrid post-quantum signing, lattice key
          encapsulation, threshold approval, a spent-nullifier registry, and a record that can be
          verified independently afterwards. They are three products rather than three codebases.
        </p>
      </section>
    </DocPage>
  );
}
