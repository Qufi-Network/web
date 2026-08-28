import {
  NodeNetworkFigure,
  SettleFigure,
  UbtcFigure,
  VaultFigure,
} from './ProductFigure';

/**
 * The products, as data.
 *
 * Held apart from the page that renders them because two things read it — the
 * row of figures at the top and the panel underneath — and a product that
 * appeared in one and not the other would be a page contradicting itself.
 *
 * Named `catalogue` rather than `products` because the component beside it is
 * `Products`, and two files whose names differ only in case are two files on
 * one filesystem and one file on another.
 *
 * Every status here is the honest one, and nothing carries operator economics —
 * capability and dates only, deliberately.
 */

export interface Stop {
  /** Where it is going. */
  where: string;
  /** What it is doing there. */
  what: string;
  /** When, in the words the business uses. */
  when: string;
  state: 'live' | 'building' | 'planned';
}

export interface Product {
  id: string;
  index: string;
  name: string;
  /** The family name, where the product has one. */
  alias?: string;
  /** What kind of thing it is. The heading says the name. */
  kind: string;
  tone: string;
  status: string;
  live: boolean;
  lede: string;
  Figure: (props: { className?: string }) => React.JSX.Element;
  body: string[];
  parts: Array<[string, string]>;
  timeline?: { title: string; lead: string; stops: Stop[] };
  /** What this product writes to the chain, when it writes to the chain. */
  anchor?: {
    title: string;
    lead: string;
    /** The OP_RETURN payload, field by field. */
    payload: Array<{ value: string; size: string; lit?: boolean }>;
    note: string;
    /** One of them, on the chain, that anybody can go and read. */
    proof?: { label: string; txid: string; href: string };
  };
  /** A place in the site where this product can be watched rather than read. */
  walk?: { href: string; label: string; note: string };
}

export const PRODUCTS: Product[] = [
  {
    id: 'ubtc',
    index: '01',
    name: 'uBTC',
    alias: 'Qu-Stable on Bitcoin',
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
    anchor: {
      title: 'Branded on the chain',
      lead: 'A uBTC mint, a transfer and a redemption are each anchored to Bitcoin, and each one carries the same prefix. They are identifiable as QuFi instructions on the chain itself rather than in anybody’s database.',
      payload: [
        { value: 'QUANTUM:', size: '8 bytes', lit: true },
        { value: 'SHA3-256 of the instruction', size: '32 bytes' },
      ],
      note: 'Forty bytes in an OP_RETURN output — well inside the eighty-byte limit, and machine-verifiable by anyone reading the chain. Mint, transfer and redeem all write it; the hash is what differs.',
      proof: {
        label: 'The first QUANTUM mint, on Bitcoin testnet4',
        txid: '638640bff205a2242749990cbcc6f03bef66ec2cc974d0eab45433ba0042f7ec',
        href: 'https://mempool.space/testnet4/tx/638640bff205a2242749990cbcc6f03bef66ec2cc974d0eab45433ba0042f7ec',
      },
    },
    walk: {
      href: '/product/ubtc',
      label: 'Walk the lifecycle',
      note: 'A vault created, bitcoin deposited, uBTC minted, transferred and redeemed — moving through the network while it happens.',
    },
    timeline: {
      title: 'Qu-Stable rollout',
      lead: 'The same unit, on more than one settlement environment. Bitcoin is where it runs today; the others take the same proof-gated lifecycle to the chains their holders are already on.',
      stops: [
        { where: 'Bitcoin', what: 'uBTC — deposit, mint, transfer, redeem', when: 'Live on testnet4', state: 'live' },
        { where: 'Stellar', what: 'Qu-Stable on Stellar', when: 'In progress', state: 'building' },
        { where: 'Solana', what: 'Qu-Stable on Solana', when: 'End of 2026', state: 'planned' },
        { where: 'Ethereum', what: 'Qu-Stable on Ethereum', when: 'End of 2026', state: 'planned' },
        { where: 'Other EVMs', what: 'Qu-Stable across EVM chains', when: 'Q1 2027', state: 'planned' },
      ],
    },
  },
  {
    id: 'settle',
    index: '02',
    name: 'Quantum Settle',
    alias: 'Qu-Settle',
    kind: 'Trade finance',
    tone: '#A97BFF',
    status: 'Coming soon',
    live: false,
    lede: 'A quantum-proof letter of credit, and the atomic swap that settles it.',
    Figure: SettleFigure,
    body: [
      'A letter of credit is an instruction that several parties have to agree to before anybody is paid. Qu-Settle writes that agreement as a multi-signature instrument under post-quantum signatures, so the undertaking survives the arrival of an adversary who can break today’s curves.',
      'Settlement is atomic: the document and the payment complete together or neither of them completes. There is no window in which one side has performed and the other has not, and no intermediary holding both while it decides.',
    ],
    parts: [
      ['Instrument', 'A letter of credit, written as an instruction rather than as a document held by a bank'],
      ['Signatures', 'Multi-signature approval under post-quantum schemes'],
      ['Settlement', 'An atomic swap: both legs complete together, or neither does'],
      ['Verification', 'The same proof-gated path as everything else on this core'],
    ],
    timeline: {
      title: 'Qu-Settle rollout',
      lead: 'Starting where the collateral already is, and then reaching the unit most trade is quoted in.',
      stops: [
        { where: 'Bitcoin', what: 'Letter of credit, multi-signature and post-quantum', when: 'First', state: 'building' },
        { where: 'USDT, cross-chain', what: 'Atomic settlement against the unit trade is priced in', when: 'Next', state: 'planned' },
      ],
    },
  },
  {
    id: 'vault',
    index: '03',
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
    id: 'nodes',
    index: '04',
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
];
