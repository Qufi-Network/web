import { ExperienceRoot } from '../components/experience/ExperienceRoot';

/**
 * The document underneath the experience.
 *
 * This markup is always served, always crawlable and always available to a
 * screen reader — the immersive layer sits on top of it rather than replacing
 * it. If WebGL is missing the same content simply becomes visible.
 *
 * Everything stated here is drawn from what QUFI actually does. The network the
 * visitor sees is a simulation, and the page says so.
 */
export default function Page() {
  return (
    <>
      <ExperienceRoot />

      <main className="document">
        <h1>QUFI Network</h1>
        <p className="lede">A network designed for the quantum era.</p>

        <p>
          Every signature protecting Bitcoin, Solana, SWIFT and the banking system today rests on
          mathematics a large quantum computer is expected to break. QUFI is the network that
          verifies value without relying on it — independent nodes that check every mint, transfer,
          approval and redemption using post-quantum cryptography, then settle the result.
        </p>

        <h2>How verification works</h2>
        <p>
          <strong>Instruct.</strong> Someone submits a mint, a transfer, an approval or a
          redemption. It carries a hybrid post-quantum signature — two independent schemes, so one
          broken scheme does not break the instruction.
        </p>
        <p>
          <strong>Verify.</strong> Independent nodes check the signature, confirm the collateral
          genuinely exists, and check the registry to make sure the instruction has not been used
          before. A threshold of nodes must agree, then co-sign as a group.
        </p>
        <p>
          <strong>Settle.</strong> The instruction executes, the nullifier is marked spent so it can
          never be replayed, and a record is written that anyone can verify independently.
        </p>

        <h2>Cryptography</h2>
        <dl>
          <div>
            <dt>Signatures</dt>
            <dd>ML-DSA-65 and SPHINCS+, used together as a hybrid</dd>
          </div>
          <div>
            <dt>Encryption</dt>
            <dd>ML-KEM lattice key encapsulation</dd>
          </div>
          <div>
            <dt>Approval</dt>
            <dd>Threshold quorum — no single signer can approve alone</dd>
          </div>
          <div>
            <dt>Replay</dt>
            <dd>Spent-nullifier registry</dd>
          </div>
          <div>
            <dt>Record</dt>
            <dd>Independently verifiable after the fact</dd>
          </div>
        </dl>

        <h2>About this page</h2>
        <p>
          The network rendered on this page is a simulation. Its participants, relationships and
          traffic are generated locally to show the shape of the architecture; they are not live
          measurements of a running network, and no figures here describe real network activity.
        </p>
      </main>
    </>
  );
}
