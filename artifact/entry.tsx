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
 * one place by importing nothing from Next. If one changes, both change.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/sora';
import '@fontsource-variable/jetbrains-mono';
import '../app/globals.css';
import '../app/network.css';
import { ExperienceRoot } from '../components/experience/ExperienceRoot';

function Document() {
  return (
    <main className="document">
      <h1>QuFi</h1>
      <p className="lede">The verification layer for the post-quantum economy.</p>

      <p>
        QuFi sits beneath high-value digital settlement, providing an independent verification layer
        between action and settlement. It does not replace the environments that settle value; it
        verifies what they are about to settle.
      </p>

      <h2>01 — Core</h2>
      <p>
        <strong>The verification layer.</strong> An instruction is defined, the network checks it
        independently and away from the settlement path, and the settlement environment receives a
        verified result. Instruct, verify, settle.
      </p>

      <h2>02 — Post-quantum signing</h2>
      <p>
        QuFi enables verification designed for a world where today’s cryptographic assumptions can no
        longer be taken for granted. A signature is assembled under a post-quantum scheme, the
        network verifies it against that scheme, and what travels onward is the proof that
        verification happened.
      </p>

      <h2>03 — Proof</h2>
      <p>
        QuFi moves computationally intensive verification away from the settlement path and returns a
        compact proof. The expensive work happens inside the network; settlement receives the result
        rather than the work.
      </p>

      <h2>04 — Collateral confirmation</h2>
      <p>
        Assets can be verified before they move. An asset is held rather than passed, the field
        confirms it genuinely exists, and only then does the pathway open.
      </p>

      <h2>05 — Proof-gated movement</h2>
      <p>
        Movement becomes conditional on verified proof. Value arrives at the gateway and waits; the
        pathway opens only on a valid proof. What is verified passes, and what is not, does not.
      </p>

      <h2>06 — Recovery</h2>
      <p>
        Recovery pathways allow verified processes to continue when a route, environment or
        connection changes. When a route is lost the network detects the break, reorganises, and the
        process continues on the pathway that forms.
      </p>

      <h2>07 — Multiple settlement environments</h2>
      <p>
        QuFi is designed to operate beneath multiple settlement environments rather than replacing
        them. One verification layer runs underneath several architectures, and each environment
        settles what the layer has verified.
      </p>

      <h2>08 — High-value flows</h2>
      <p>
        Three kinds of value move through the network. Digital assets: tokenised value and high-value
        settlement. Money: stablecoins, deposits and cross-border settlement. Trade finance:
        invoices, receivables and other high-value financial flows.
      </p>

      <h2>Cryptography</h2>
      <dl>
        <div>
          <dt>Signatures</dt>
          <dd>Hybrid post-quantum signing</dd>
        </div>
        <div>
          <dt>Encryption</dt>
          <dd>Lattice key encapsulation</dd>
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

      <h2>Verify before value moves.</h2>
      <p>
        An independent verification layer designed for the post-quantum economy. QuFi is not trying
        to replace the systems that settle value — it is the verification layer beneath them.
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
