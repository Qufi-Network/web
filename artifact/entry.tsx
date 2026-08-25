/**
 * Single-file build entry.
 *
 * The site is a Next.js app, but it is also entirely client-side — there is no
 * server component doing any work beyond emitting static markup. That makes it
 * possible to bundle the whole thing into one self-contained HTML file for
 * hosting somewhere that serves a single page, which is what the deploy script
 * does with this entry.
 *
 * The document markup below is the same content `app/page.tsx` renders, kept in
 * one place by importing nothing from Next.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/sora';
import '@fontsource-variable/jetbrains-mono';
import '../app/globals.css';
import '../app/descent.css';
import '../app/surfaces.css';
import '../app/economy.css';
import { ExperienceRoot } from '../components/experience/ExperienceRoot';

function Document() {
  return (
    <main className="document">
      <h1>QUFI Network</h1>
      <p className="lede">A network designed for the quantum era.</p>

      <p>
        Every signature protecting Bitcoin, Solana, SWIFT and the banking system today rests on
        mathematics a large quantum computer is expected to break. QUFI is the network that verifies
        value without relying on it — independent nodes that check every mint, transfer, approval
        and redemption using post-quantum cryptography, then settle the result.
      </p>

      <h2>How verification works</h2>
      <p>
        <strong>Instruct.</strong> Someone submits a mint, a transfer, an approval or a redemption.
        It carries a hybrid post-quantum signature — two independent schemes, so one broken scheme
        does not break the instruction.
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

      <h2>Assets, money and settlement</h2>
      <p>
        An economic transaction has two legs and a place they meet. QUFI carries all three: a
        representation of defined rights to a real-world asset, a monetary leg to trade it against,
        and settlement that links the movement of one to the movement of the other so neither
        completes on its own.
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

      <h2>Genesis nodes</h2>
      <p>
        QUFI begins with one thousand genesis nodes: independent operators who verify the first
        instructions the network settles, and hold a share of the threshold that approves them.
        Registering interest is not an allocation.
      </p>

      <h2>About this page</h2>
      <p>
        The network rendered on this page is a simulation. Its participants, relationships and
        traffic are generated locally to show the shape of the architecture; they are not live
        measurements of a running network, and no figures here describe real network activity.
      </p>
    </main>
  );
}

const mount = document.getElementById('qufi-root');
if (mount) {
  createRoot(mount).render(
    <StrictMode>
      <ExperienceRoot />
      <Document />
    </StrictMode>,
  );
}
