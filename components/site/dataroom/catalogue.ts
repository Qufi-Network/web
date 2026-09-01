/**
 * The data room, as data.
 *
 * Every section, every document, and everything known about each one. The
 * navigation, the section pages, the cards, the detail pages and the search
 * index are all derived from this file, so a document added here appears
 * everywhere at once and cannot appear in one place and not another.
 *
 * ## Nothing here pretends to be written
 *
 * The library is being assembled. A document that does not exist yet carries
 * the status that says so, and what it offers a reader is its description, its
 * planned contents and what they will find in it when it lands — not invented
 * prose. A data room that fabricates its own contents is worse than an empty
 * one, because the reader cannot tell which half is real.
 *
 * Reading times, versions and dates are absent for the same reason: they are
 * facts about a document, and there is no document to have them yet.
 */

/** How far along a document is. */
export type DocStatus = 'complete' | 'review' | 'development' | 'planned' | 'confidential';

export const STATUS_LABEL: Record<DocStatus, string> = {
  complete: 'Complete',
  review: 'In review',
  development: 'In development',
  planned: 'Planned',
  confidential: 'Confidential',
};

/** One-line explanation of what a status means, shown beside the chip. */
export const STATUS_MEANS: Record<DocStatus, string> = {
  complete: 'Final document available.',
  review: 'Ready for internal or institutional review.',
  development: 'Structure exists and the content is being written.',
  planned: 'Scoped, not yet started.',
  confidential: 'Restricted. Access is granted individually.',
};

export interface DataSection {
  id: string;
  index: string;
  title: string;
  /** What this part of the room is for. */
  lede: string;
}

export interface DataDoc {
  id: string;
  section: string;
  index: string;
  title: string;
  /** What kind of document it is: a memorandum, a specification, a paper. */
  kind: string;
  status: DocStatus;
  description: string;
  /** What the reader will discover. The spine of every detail page. */
  discover: string[];
  /** Tags, used by search and by the filters. */
  topics: string[];
  /** Why this document exists, where that is worth stating separately. */
  purpose?: string;
  /** The planned contents, for a document being written. */
  contents?: string[];
  /** Ids of documents worth reading alongside it. */
  related?: string[];
}

/* --------------------------------------------------------------- sections -- */

export const SECTIONS: DataSection[] = [
  {
    id: 'company',
    index: '01',
    title: 'Company & investment',
    lede: 'The company, the opportunity and the strategic vision.',
  },
  {
    id: 'product',
    index: '02',
    title: 'Product',
    lede: 'What QuFi is building, and how the pieces fit together.',
  },
  {
    id: 'technology',
    index: '03',
    title: 'Technology',
    lede: 'The architecture, the protocol and the cryptography underneath them.',
  },
  {
    id: 'security',
    index: '04',
    title: 'Security & cryptography',
    lede: 'Trust boundaries, key protection and the threat model.',
  },
  {
    id: 'network',
    index: '05',
    title: 'Network & infrastructure',
    lede: 'How the verification network is built and operated.',
  },
  {
    id: 'market',
    index: '06',
    title: 'Market & strategy',
    lede: 'Where QuFi sits in the global market, and how it gets there.',
  },
  {
    id: 'team',
    index: '07',
    title: 'Team & governance',
    lede: 'Who leads the company, and how the protocol is governed.',
  },
  {
    id: 'legal',
    index: '08',
    title: 'Legal & corporate',
    lede: 'Structured for formal diligence. Access granted individually.',
  },
  {
    id: 'supporting',
    index: '09',
    title: 'Supporting materials',
    lede: 'Presentations, diagrams, research and brand assets.',
  },
];

/* -------------------------------------------------------------- documents -- */

export const DOCUMENTS: DataDoc[] = [
  /* ---- 01 company & investment ------------------------------------------ */
  {
    id: 'investor-memorandum',
    section: 'company',
    index: '01',
    title: 'QuFi Investor Memorandum',
    kind: 'Memorandum',
    status: 'development',
    description:
      'The primary institutional investment document for QuFi. It explains the company vision, the market opportunity, the problem being solved, the technology, the products, the business strategy and the investment thesis.',
    purpose: 'The first document an investor evaluating QuFi should read.',
    discover: [
      'The QuFi vision',
      'Why verification infrastructure is needed',
      'The market opportunity',
      'The problem with existing financial infrastructure',
      'QuFi’s technology strategy',
      'Product strategy',
      'Business model',
      'Competitive positioning',
      'Growth strategy',
      'Team',
      'The investment opportunity',
    ],
    topics: ['Investment', 'Strategy', 'Market', 'Business model'],
    related: ['investment-thesis', 'product-overview', 'strategic-vision'],
  },
  {
    id: 'investment-thesis',
    section: 'company',
    index: '02',
    title: 'QuFi Investment Thesis',
    kind: 'Thesis',
    status: 'development',
    description:
      'A concise strategic explanation of why QuFi represents a significant infrastructure opportunity.',
    discover: [
      'The core investment thesis',
      'Why verification is becoming infrastructure',
      'Why post-quantum security matters',
      'Why institutional finance requires stronger trust systems',
      'The potential scale of the QuFi network',
    ],
    topics: ['Investment', 'Strategy', 'Post-quantum'],
    related: ['investor-memorandum', 'market-opportunity', 'strategic-vision'],
  },
  {
    id: 'corporate-overview',
    section: 'company',
    index: '03',
    title: 'QuFi Corporate Overview',
    kind: 'Overview',
    status: 'development',
    description: 'A high-level overview of QuFi as a company.',
    discover: [
      'Company mission',
      'Vision',
      'Core technology',
      'Product portfolio',
      'Strategic direction',
      'Market positioning',
    ],
    topics: ['Company', 'Strategy'],
    related: ['investor-memorandum', 'product-overview'],
  },
  {
    id: 'strategic-vision',
    section: 'company',
    index: '04',
    title: 'QuFi Strategic Vision',
    kind: 'Vision',
    status: 'development',
    description:
      'The long-term vision for QuFi as a universal verification layer for global value.',
    discover: [
      'The future of global value infrastructure',
      'The role of verification',
      'Network effects',
      'Institutional adoption',
      'Global interoperability',
    ],
    topics: ['Strategy', 'Vision', 'Network'],
    related: ['investment-thesis', 'ecosystem-strategy'],
  },

  /* ---- 02 product -------------------------------------------------------- */
  {
    id: 'product-overview',
    section: 'product',
    index: '01',
    title: 'QuFi Product Overview',
    kind: 'Overview',
    status: 'development',
    description: 'A complete overview of the QuFi product ecosystem.',
    discover: [
      'The QuFi product stack',
      'How the products connect',
      'Core protocol capabilities',
      'Institutional products',
      'Developer infrastructure',
      'Ecosystem opportunities',
    ],
    topics: ['Product', 'Protocol', 'Ecosystem'],
    related: ['architecture', 'protocol', 'ubtc-overview'],
  },
  {
    id: 'architecture',
    section: 'product',
    index: '02',
    title: 'QuFi Architecture',
    kind: 'Architecture',
    status: 'development',
    description: 'A visual and technical explanation of the QuFi layered architecture.',
    discover: [
      'Application layer',
      'Policy layer',
      'Verification layer',
      'Cryptographic layer',
      'Network layer',
      'Settlement layer',
      'End-to-end transaction flows',
      'Architectural principles',
    ],
    topics: ['Architecture', 'Protocol', 'Verification', 'Settlement'],
    related: ['protocol', 'technical-whitepaper', 'verification-network'],
  },
  {
    id: 'protocol',
    section: 'product',
    index: '03',
    title: 'QuFi Protocol',
    kind: 'Specification',
    status: 'development',
    description:
      'The functional specification of how the QuFi protocol processes, verifies and governs actions.',
    discover: [
      'Protocol primitives',
      'Intent and instructions',
      'Authorization',
      'Identity',
      'Policy evaluation',
      'Verification',
      'Cryptographic proofs',
      'Consensus',
      'Finality',
      'State transitions',
      'Settlement',
      'Failure recovery',
    ],
    topics: ['Protocol', 'Policy', 'Consensus', 'Settlement', 'Verification'],
    related: ['architecture', 'technical-whitepaper', 'consensus-model'],
  },
  {
    id: 'product-roadmap',
    section: 'product',
    index: '04',
    title: 'QuFi Product Roadmap',
    kind: 'Roadmap',
    status: 'development',
    description: 'The strategic evolution of QuFi products and infrastructure.',
    discover: [
      'Core protocol development',
      'Verification network expansion',
      'uBTC',
      'Institutional products',
      'Developer ecosystem',
      'Global infrastructure vision',
    ],
    topics: ['Product', 'Roadmap', 'Strategy'],
    related: ['product-overview', 'ubtc-overview'],
  },
  {
    id: 'ubtc-overview',
    section: 'product',
    index: '05',
    title: 'uBTC Product Overview',
    kind: 'Overview',
    status: 'development',
    description:
      'The first major application built on QuFi verification infrastructure.',
    discover: [
      'How uBTC works',
      'Bitcoin collateral',
      'Reserve verification',
      'Minting',
      'Redemption',
      'Proof-gated movement',
      'Cross-chain utility',
    ],
    topics: ['uBTC', 'Bitcoin', 'Settlement', 'Product'],
    related: ['product-overview', 'interoperability', 'protocol'],
  },
  /*
   * The other three products.
   *
   * The site walks all four and the room described only one, which meant a
   * reader who had just watched the vault walkthrough and searched for "vault"
   * was told the room held nothing about it. Each of these says what the
   * product page already says and no more — the mechanism, and where it has
   * got to. Nothing here promises content that has not been written.
   */
  {
    id: 'settle-overview',
    section: 'product',
    index: '06',
    title: 'Qu-Settle Product Overview',
    kind: 'Overview',
    status: 'development',
    description:
      'A letter of credit written as a post-quantum multi-signature instrument with three parties to it — buyer, seller and an independent verifier — where two signatures against verified documents release the payment.',
    purpose:
      'Trade finance is the clearest case for verification before settlement: the money is committed before the goods move, and the question of whether what was promised was done is answered by documents. This document sets out how that question is put to the network rather than to a bank.',
    discover: [
      'The three-party instrument, and why the verifier is a party rather than a service',
      'How a buyer commits payment against an instrument before anything ships',
      'What two-of-three release means in practice, and what neither party can do alone',
      'Which documents are checked — bill of lading, inspection, insurance — and against what',
      'Why the undertaking is signed under two independent post-quantum schemes',
      'The rollout: Bitcoin first, then atomic settlement against the unit trade is priced in',
    ],
    contents: [
      'The instrument',
      'The three parties',
      'Commitment of the buyer’s payment',
      'Document verification',
      'Two-of-three release',
      'Signature architecture',
      'Settlement environments',
      'Rollout sequence',
    ],
    topics: ['Qu-Settle', 'Trade finance', 'Settlement', 'Verification', 'Product'],
    related: ['product-overview', 'protocol', 'verification-network'],
  },
  {
    id: 'vault-overview',
    section: 'product',
    index: '07',
    title: 'Qu-Vault Product Overview',
    kind: 'Overview',
    status: 'development',
    description:
      'Script-path-only Taproot custody with the key path given up, key material wrapped under lattice key encapsulation, a signed and chain-anchored registry of ownership, and a palm-vein biometric required before anything leaves.',
    purpose:
      'Custody is usually a promise about where a key is kept. This document describes custody as a set of conditions written before the vault holds anything, and an owner of record that survives the loss of the coin.',
    discover: [
      'Why the key path is abandoned, and what it means that every way to spend is a committed script',
      'What quantum-wrapped means here: encapsulation rather than storage, and what sits on the machine',
      'How the Quantum Registry records who owns what, signed and anchored to Bitcoin',
      'The two conditions required to move bitcoin out, and why neither is sufficient alone',
      'What the palm-vein hardware reads, and where it sits in the authorisation path',
      'What the ownership certificate proves after the fact, without QuFi',
    ],
    contents: [
      'Taproot construction and the abandoned key path',
      'Script path conditions',
      'Lattice key encapsulation',
      'The Quantum Registry',
      'Chain anchoring',
      'Biometric authorisation',
      'The ownership certificate',
      'Recovery and compromise',
    ],
    topics: ['Qu-Vault', 'Custody', 'Bitcoin', 'Biometrics', 'Registry', 'Product'],
    related: ['product-overview', 'ubtc-overview', 'key-management'],
  },
  {
    id: 'nodes-overview',
    section: 'product',
    index: '08',
    title: 'Quantum Node Network Product Overview',
    kind: 'Overview',
    status: 'development',
    description:
      'The verification network as a product: independent operators each holding a share of a key that was never assembled anywhere, and a threshold of them that has to co-sign before anything settles.',
    purpose:
      'The neutrality of the verification layer is a structural property, not a policy. This document explains the structure that produces it.',
    discover: [
      'How distributed key generation avoids a whole key ever existing',
      'What a threshold quorum co-signing as a group means for settlement',
      'Why each operator verifies the post-quantum proof for itself before signing',
      'Why no single operator can approve a movement, and none can block one',
      'Where the operator network has reached, and what is still in build',
    ],
    contents: [
      'Distributed key generation',
      'Threshold signing',
      'Independent verification',
      'Quorum and liveness',
      'Operator independence',
      'Network build status',
    ],
    topics: ['Qu-Nodes', 'Verification', 'Threshold signing', 'Network', 'Product'],
    related: ['product-overview', 'verification-network', 'consensus-model'],
  },

  /* ---- 03 technology ----------------------------------------------------- */
  {
    id: 'technical-whitepaper',
    section: 'technology',
    index: '01',
    title: 'QuFi Technical Whitepaper',
    kind: 'Whitepaper',
    status: 'development',
    description:
      'The flagship technical reference for QuFi: a detailed explanation of the architecture, the protocol execution model, the verification system, the cryptographic architecture and the network design.',
    discover: [
      'Technical architecture',
      'Protocol execution',
      'Verification and evidence',
      'Policy engine',
      'Cryptographic architecture',
      'Post-quantum security',
      'HSM architecture',
      'Consensus and finality',
      'State commitments',
      'Network architecture',
      'Settlement interoperability',
      'Security model',
      'Technical roadmap',
    ],
    contents: [
      '01 Executive technical overview',
      '02 Technical architecture',
      '03 Protocol execution model',
      '04 Verification and evidence model',
      '05 Policy engine and programmable governance',
      '06 Cryptographic architecture',
      '07 Post-quantum security model',
      '08 Key management and HSM architecture',
      '09 Consensus and finality',
      '10 State model and immutable commitments',
      '11 Network architecture',
      '12 Settlement and interoperability',
      '13 Security and threat model',
      '14 Technical roadmap and future architecture',
    ],
    topics: ['Post-quantum', 'ML-DSA', 'Falcon', 'Consensus', 'Verification', 'Settlement', 'HSM'],
    related: ['architecture', 'protocol', 'pq-cryptography', 'security-architecture'],
  },
  {
    id: 'pq-cryptography',
    section: 'technology',
    index: '02',
    title: 'Post-Quantum Cryptography Architecture',
    kind: 'Architecture',
    status: 'development',
    description: 'A dedicated explanation of QuFi’s cryptographic strategy.',
    discover: [
      'Why quantum security matters',
      'ML-DSA',
      'Falcon',
      'SHA3',
      'Cryptographic domain separation',
      'External signatures',
      'Internal protocol signatures',
      'Crypto agility',
      'Migration strategy',
    ],
    topics: ['Post-quantum', 'ML-DSA', 'Falcon', 'SHA3', 'Cryptography'],
    related: ['technical-whitepaper', 'security-architecture', 'pq-readiness'],
  },
  {
    id: 'verification-network',
    section: 'technology',
    index: '03',
    title: 'QuFi Verification Network',
    kind: 'Architecture',
    status: 'development',
    description: 'A technical explanation of the decentralised verification network.',
    discover: [
      'Verifier nodes',
      'Node roles',
      'Independent verification',
      'Attestations',
      'Quorum',
      'Consensus',
      'Byzantine resilience',
      'Network topology',
      'Geographic distribution',
      'Network incentives',
    ],
    topics: ['Verification', 'Consensus', 'Network', 'Quorum'],
    related: ['consensus-model', 'node-architecture', 'architecture'],
  },
  {
    id: 'security-architecture',
    section: 'technology',
    index: '04',
    title: 'QuFi Security Architecture',
    kind: 'Architecture',
    status: 'development',
    description: 'The security architecture governing the QuFi ecosystem.',
    discover: [
      'Zero-trust architecture',
      'Trust boundaries',
      'Threat modelling',
      'Key protection',
      'HSM security',
      'Access controls',
      'Policy enforcement',
      'Incident response',
      'Recovery',
    ],
    topics: ['Security', 'HSM', 'Zero-trust', 'Policy'],
    related: ['threat-model', 'key-management', 'technical-whitepaper'],
  },
  {
    id: 'interoperability',
    section: 'technology',
    index: '05',
    title: 'Interoperability & Settlement Architecture',
    kind: 'Architecture',
    status: 'development',
    description: 'How QuFi connects to external financial and blockchain systems.',
    discover: [
      'Blockchain integrations',
      'Bitcoin integration',
      'Cross-chain verification',
      'Banking rails',
      'Payment networks',
      'Custodians',
      'Institutional settlement',
      'APIs and integration layers',
    ],
    topics: ['Settlement', 'Interoperability', 'Bitcoin', 'Cross-chain'],
    related: ['ubtc-overview', 'architecture', 'protocol'],
  },

  /* ---- 04 security & cryptography ---------------------------------------- */
  {
    id: 'crypto-security-model',
    section: 'security',
    index: '01',
    title: 'QuFi Cryptographic Security Model',
    kind: 'Security model',
    status: 'planned',
    description: 'The cryptographic boundaries the protocol relies on, and what each one guarantees.',
    discover: [
      'Cryptographic boundaries',
      'Signature models',
      'Hashing',
      'Domain separation',
      'Key protection',
      'Proof verification',
    ],
    topics: ['Cryptography', 'Security', 'Proofs'],
    related: ['pq-cryptography', 'key-management', 'threat-model'],
  },
  {
    id: 'key-management',
    section: 'security',
    index: '02',
    title: 'QuFi Key Management Policy',
    kind: 'Policy',
    status: 'planned',
    description: 'How keys are generated, protected, rotated, revoked and recovered.',
    discover: [
      'Key generation',
      'HSM protection',
      'Key rotation',
      'Key revocation',
      'Backup',
      'Recovery',
      'Separation of duties',
    ],
    topics: ['Keys', 'HSM', 'Security', 'Recovery'],
    related: ['security-architecture', 'crypto-security-model'],
  },
  {
    id: 'threat-model',
    section: 'security',
    index: '03',
    title: 'QuFi Threat Model',
    kind: 'Threat model',
    status: 'planned',
    description: 'The adversaries the system is designed against, and what is done about each.',
    discover: [
      'Attack surfaces',
      'Adversarial scenarios',
      'Byzantine actors',
      'Network attacks',
      'Cryptographic threats',
      'Operational threats',
      'Mitigation strategies',
    ],
    topics: ['Security', 'Threat model', 'Byzantine'],
    related: ['security-architecture', 'consensus-model'],
  },
  {
    id: 'pq-readiness',
    section: 'security',
    index: '04',
    title: 'QuFi Post-Quantum Readiness Strategy',
    kind: 'Strategy',
    status: 'planned',
    description: 'How the system stays secure across a change of cryptographic era.',
    discover: [
      'Quantum threats',
      'Migration strategy',
      'Cryptographic agility',
      'Future algorithm upgrades',
    ],
    topics: ['Post-quantum', 'Migration', 'Crypto agility'],
    related: ['pq-cryptography', 'technical-whitepaper'],
  },

  /* ---- 05 network & infrastructure ---------------------------------------- */
  {
    id: 'node-architecture',
    section: 'network',
    index: '01',
    title: 'QuFi Node Architecture',
    kind: 'Architecture',
    status: 'planned',
    description: 'What a verification node is made of, and what each part does.',
    discover: [
      'Node components',
      'Verification engines',
      'Policy execution',
      'Cryptographic services',
      'Networking',
      'Storage',
      'Monitoring',
    ],
    topics: ['Nodes', 'Network', 'Verification'],
    related: ['verification-network', 'consensus-model', 'network-operations'],
  },
  {
    id: 'consensus-model',
    section: 'network',
    index: '02',
    title: 'QuFi Consensus Model',
    kind: 'Specification',
    status: 'planned',
    description: 'How independent operators reach agreement, and what happens when they cannot.',
    discover: [
      'Consensus mechanism',
      'Quorum thresholds',
      'Validator behaviour',
      'Byzantine resilience',
      'Finality',
      'Failure scenarios',
    ],
    topics: ['Consensus', 'Quorum', 'Finality', 'Byzantine'],
    related: ['verification-network', 'protocol', 'threat-model'],
  },
  {
    id: 'network-operations',
    section: 'network',
    index: '03',
    title: 'QuFi Network Operations',
    kind: 'Operations',
    status: 'planned',
    description: 'Running the network: what is watched, and what happens when something breaks.',
    discover: [
      'Monitoring',
      'Node health',
      'Network observability',
      'Incident response',
      'Scaling',
      'Geographic deployment',
    ],
    topics: ['Operations', 'Network', 'Monitoring'],
    related: ['node-architecture', 'verification-network'],
  },

  /* ---- 06 market & strategy ------------------------------------------------ */
  {
    id: 'market-opportunity',
    section: 'market',
    index: '01',
    title: 'Market Opportunity',
    kind: 'Analysis',
    status: 'planned',
    description: 'The markets QuFi addresses, and what is driving them.',
    discover: [
      'Digital assets',
      'Tokenization',
      'Institutional blockchain',
      'Payments',
      'Cross-border settlement',
      'Post-quantum infrastructure',
    ],
    topics: ['Market', 'Tokenization', 'Payments', 'Institutional'],
    related: ['investment-thesis', 'competitive-landscape'],
  },
  {
    id: 'competitive-landscape',
    section: 'market',
    index: '02',
    title: 'Competitive Landscape',
    kind: 'Analysis',
    status: 'planned',
    description: 'Who else is in this space, and where QuFi differs.',
    discover: [
      'Existing blockchain infrastructure',
      'Settlement networks',
      'Verification technologies',
      'Custody systems',
      'Post-quantum approaches',
    ],
    topics: ['Market', 'Competition', 'Settlement', 'Custody'],
    related: ['market-opportunity', 'investment-thesis'],
  },
  {
    id: 'go-to-market',
    section: 'market',
    index: '03',
    title: 'Go-To-Market Strategy',
    kind: 'Strategy',
    status: 'planned',
    description: 'How QuFi reaches the institutions and developers it needs.',
    discover: [
      'Institutional strategy',
      'Developer adoption',
      'Network expansion',
      'Partnerships',
      'Geographic growth',
    ],
    topics: ['Strategy', 'Institutional', 'Partnerships'],
    related: ['ecosystem-strategy', 'market-opportunity'],
  },
  {
    id: 'ecosystem-strategy',
    section: 'market',
    index: '04',
    title: 'Ecosystem Strategy',
    kind: 'Strategy',
    status: 'planned',
    description: 'Who participates in the network, and why it is worth their while.',
    discover: [
      'Developers',
      'Institutions',
      'Node operators',
      'Partners',
      'Applications',
      'Incentives',
    ],
    topics: ['Ecosystem', 'Incentives', 'Nodes', 'Strategy'],
    related: ['go-to-market', 'strategic-vision'],
  },

  /* ---- 07 team & governance ------------------------------------------------ */
  {
    id: 'team-overview',
    section: 'team',
    index: '01',
    title: 'Team Overview',
    kind: 'Overview',
    status: 'review',
    description:
      'The people who lead QuFi: technology, business and growth. Photographs and titles are on the front of this room; biographies and prior experience are being written.',
    discover: [
      'Who leads each part of the company',
      'Relevant prior experience',
      'How responsibility is divided',
    ],
    topics: ['Team', 'Leadership', 'Governance'],
    related: ['governance-model', 'corporate-overview'],
  },
  {
    id: 'governance-model',
    section: 'team',
    index: '02',
    title: 'Governance Model',
    kind: 'Governance',
    status: 'planned',
    description: 'How the protocol, the policy layer and the network are governed.',
    discover: [
      'Protocol governance',
      'Policy governance',
      'Network governance',
      'Institutional participation',
      'Decision-making',
    ],
    topics: ['Governance', 'Policy', 'Network'],
    related: ['team-overview', 'protocol'],
  },

  /* ---- 08 legal & corporate ------------------------------------------------ */
  {
    id: 'corporate-structure',
    section: 'legal',
    index: '01',
    title: 'Corporate Structure & Incorporation',
    kind: 'Corporate',
    status: 'confidential',
    description:
      'Incorporation documents, corporate structure and shareholder information, held for formal diligence.',
    discover: [
      'Corporate structure',
      'Incorporation documents',
      'Shareholder information',
    ],
    topics: ['Legal', 'Corporate', 'Diligence'],
    related: ['ip-ownership', 'compliance'],
  },
  {
    id: 'ip-ownership',
    section: 'legal',
    index: '02',
    title: 'IP & Technology Ownership',
    kind: 'Corporate',
    status: 'confidential',
    description: 'Ownership of the technology, filings, and legal opinions where they exist.',
    discover: ['IP and technology ownership', 'Filings', 'Legal opinions'],
    topics: ['Legal', 'IP', 'Diligence'],
    related: ['corporate-structure', 'compliance'],
  },
  {
    id: 'compliance',
    section: 'legal',
    index: '03',
    title: 'Compliance & Regulatory Strategy',
    kind: 'Corporate',
    status: 'confidential',
    description: 'Regulatory posture, compliance policies and the contracts that depend on them.',
    discover: ['Compliance', 'Regulatory strategy', 'Contracts', 'Policies'],
    topics: ['Legal', 'Compliance', 'Regulatory'],
    related: ['corporate-structure', 'ip-ownership'],
  },

  /* ---- 09 supporting materials --------------------------------------------- */
  {
    id: 'presentations',
    section: 'supporting',
    index: '01',
    title: 'Presentations & Product Visuals',
    kind: 'Materials',
    status: 'planned',
    description: 'Decks, product visuals and technical diagrams, kept alongside the written material.',
    discover: ['Presentations', 'Product visuals', 'Technical diagrams'],
    topics: ['Materials', 'Visuals'],
    related: ['brand-assets'],
  },
  {
    id: 'research',
    section: 'supporting',
    index: '02',
    title: 'Research & Reference',
    kind: 'Materials',
    status: 'planned',
    description: 'Research, reference material and press, gathered for people going deeper.',
    discover: ['Research', 'Reference materials', 'Press'],
    topics: ['Materials', 'Research', 'Press'],
    related: ['presentations'],
  },
  {
    id: 'brand-assets',
    section: 'supporting',
    index: '03',
    title: 'Brand Assets',
    kind: 'Materials',
    status: 'planned',
    description: 'Marks, wordmarks and the colour system, for anyone presenting QuFi.',
    discover: ['Logos and marks', 'Colour system', 'Usage'],
    topics: ['Materials', 'Brand'],
    related: ['presentations'],
  },
];

/* ------------------------------------------------------------- the indexes -- */

export const START_HERE: string[] = [
  'investor-memorandum',
  'product-overview',
  'architecture',
  'protocol',
  'technical-whitepaper',
];

/** Why each of the first five is where it is in the order. */
export const START_HERE_WHY: Record<string, string> = {
  'investor-memorandum':
    'Understand the investment opportunity, the market problem, the technology thesis, the strategy and the growth potential.',
  'product-overview': 'Discover what QuFi is building and how the products fit together.',
  architecture: 'Understand the layered architecture behind the QuFi ecosystem.',
  protocol:
    'Explore how QuFi governs verification, authorization, policy, consensus and settlement.',
  'technical-whitepaper':
    'A deep technical explanation of the technology, the cryptography and the verification infrastructure.',
};

export function docsIn(section: string): DataDoc[] {
  return DOCUMENTS.filter((doc) => doc.section === section);
}

export function findDoc(id: string): DataDoc | undefined {
  return DOCUMENTS.find((doc) => doc.id === id);
}

export function findSection(id: string): DataSection | undefined {
  return SECTIONS.find((section) => section.id === id);
}

/** Every topic in use, in order of how often it is used. */
export function allTopics(): string[] {
  const count = new Map<string, number>();
  for (const doc of DOCUMENTS) {
    for (const topic of doc.topics) count.set(topic, (count.get(topic) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}

/** What the room holds, counted rather than claimed. */
export function roomStats() {
  const byStatus = (status: DocStatus) => DOCUMENTS.filter((d) => d.status === status).length;
  return {
    documents: DOCUMENTS.length,
    sections: SECTIONS.length,
    technology: docsIn('technology').length + docsIn('security').length + docsIn('network').length,
    product: docsIn('product').length,
    investment: docsIn('company').length,
    available: byStatus('complete') + byStatus('review'),
  };
}
