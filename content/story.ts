/**
 * What QuFi says about itself.
 *
 * Held apart from any page that renders it, because three things now say it:
 * the accessible document under the network, the network's own spaces, and the
 * standard site. Copy that lives inside one of those and is retyped into the
 * others is copy that will disagree with itself within a month.
 *
 * The eight capabilities are in the order the network visits them, which is
 * also the order they build in: the layer, then how it signs, then what it
 * produces, then what it can hold, then what it will let through, then what
 * happens when something breaks, then where it sits, then what moves over it.
 *
 * Nothing here is a measurement. Every number is what the architecture is, not
 * what a running network is currently doing.
 */

export interface Capability {
  index: string;
  title: string;
  /** One line, for a card or a heading. */
  lede: string;
  /** The full paragraph, for the document and the written site. */
  body: string;
}

export const HERO = {
  title: 'The verification layer for the post-quantum economy.',
  lede: 'QuFi sits beneath high-value digital settlement, providing an independent verification layer between action and settlement.',
  body: 'It does not replace the environments that settle value; it verifies what they are about to settle.',
  line: 'Verify before value moves.',
};

export const CAPABILITIES: Capability[] = [
  {
    index: '01',
    title: 'Core',
    lede: 'Instruct, verify, settle.',
    body: 'The verification layer. An instruction is defined, the network checks it independently and away from the settlement path, and the settlement environment receives a verified result.',
  },
  {
    index: '02',
    title: 'Post-quantum signing',
    lede: 'Signed under a scheme built for what is coming.',
    body: 'QuFi enables verification designed for a world where today’s cryptographic assumptions can no longer be taken for granted. A signature is assembled under a post-quantum scheme, the network verifies it against that scheme, and what travels onward is the proof that verification happened.',
  },
  {
    index: '03',
    title: 'Proof',
    lede: 'The expensive work happens off the settlement path.',
    body: 'QuFi moves computationally intensive verification away from the settlement path and returns a compact proof. The expensive work happens inside the network; settlement receives the result rather than the work.',
  },
  {
    index: '04',
    title: 'Collateral confirmation',
    lede: 'Held rather than passed, and confirmed before anything opens.',
    body: 'Assets can be verified before they move. An asset is held rather than passed, the field confirms it genuinely exists, and only then does the pathway open.',
  },
  {
    index: '05',
    title: 'Proof-gated movement',
    lede: 'What is verified passes. What is not, does not.',
    body: 'Movement becomes conditional on verified proof. Value arrives at the gateway and waits; the pathway opens only on a valid proof.',
  },
  {
    index: '06',
    title: 'Recovery',
    lede: 'A lost route is a route that reforms.',
    body: 'Recovery pathways allow verified processes to continue when a route, environment or connection changes. When a route is lost the network detects the break, reorganises, and the process continues on the pathway that forms.',
  },
  {
    index: '07',
    title: 'Multiple settlement environments',
    lede: 'One layer underneath several architectures.',
    body: 'QuFi is designed to operate beneath multiple settlement environments rather than replacing them. One verification layer runs underneath several architectures, and each environment settles what the layer has verified.',
  },
  {
    index: '08',
    title: 'High-value flows',
    lede: 'Digital assets, money, and trade finance.',
    body: 'Three kinds of value move through the network. Digital assets: tokenised value and high-value settlement. Money: stablecoins, deposits and cross-border settlement. Trade finance: invoices, receivables and other high-value financial flows.',
  },
];

/**
 * The cryptography, as five primitives.
 *
 * Each is one line for a list and a paragraph for somebody who wants to know
 * what the line means. The paragraphs say only what the products already say
 * about themselves: nothing here is a new claim, it is the same construction
 * described once rather than four times.
 */
export interface Primitive {
  id: string;
  term: string;
  /** The one-line answer, which is what the list shows. */
  said: string;
  /** What that actually means, for somebody who stops on it. */
  body: string;
  /** The thing it protects against, said plainly. */
  against: string;
}

export const CRYPTOGRAPHY: Primitive[] = [
  {
    id: 'signatures',
    term: 'Signatures',
    said: 'Hybrid post-quantum signing',
    body: 'Every instruction is signed under two independent post-quantum schemes rather than one. Both have to verify before anything moves, so a break in either scheme leaves the instruction still standing on the other.',
    against: 'One scheme turning out to be broken.',
  },
  {
    id: 'encryption',
    term: 'Encryption',
    said: 'Lattice key encapsulation',
    body: 'Key material is wrapped under a lattice scheme rather than stored. What sits on a machine is a wrapping, and a wrapping spends nothing: possession of the file is not possession of the key.',
    against: 'A machine being taken, and the keys going with it.',
  },
  {
    id: 'approval',
    term: 'Approval',
    said: 'Threshold quorum, with no single signer able to approve alone',
    body: 'The key is generated between independent operators and never assembled anywhere. A threshold of them has to co-sign before anything settles, and each one verifies the proof for itself before it does.',
    against: 'Any one operator approving a movement, or blocking one.',
  },
  {
    id: 'replay',
    term: 'Replay',
    said: 'Spent-nullifier registry',
    body: 'An instruction that has been acted on is marked spent, and the mark is checked atomically at the moment of use. The same authorisation cannot be presented twice, however it is copied.',
    against: 'A valid instruction being replayed to move value again.',
  },
  {
    id: 'record',
    term: 'Record',
    said: 'Independently verifiable after the fact',
    body: 'What the network produces is a proof somebody else can check. Verification does not depend on QuFi still being there, still being reachable, or still agreeing: the evidence stands on its own.',
    against: 'Having to trust the verifier about what the verifier did.',
  },
];

export const CLOSING = {
  title: 'Verify before value moves.',
  body: 'An independent verification layer designed for the post-quantum economy. QuFi is not trying to replace the systems that settle value. It is the verification layer beneath them.',
};
