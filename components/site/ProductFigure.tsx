'use client';

/**
 * Three products, drawn.
 *
 * Same vocabulary as the network — stroked geometry, a few lit points, no fills
 * and no rounded joins — but drawn rather than simulated: these are CSS
 * animations on a fixed set of paths, not a scene with a frame loop. They can
 * sit at the top of a document page and cost nothing.
 *
 * Each one says something true about its product and moves in the way that
 * thing moves. uBTC keeps two bodies in step and the tie between them travels.
 * A vault turns, and a redemption descends one of its three paths. A node
 * network lights its quorum one operator at a time and then signs.
 */

interface Props {
  className?: string;
}

/**
 * uBTC — two bodies, tied.
 *
 * Bitcoin held in a vault on the left, the unit issued against it on the right,
 * and the tie between them that has to stay true in both directions: minted
 * against a deposit, redeemed for the underlying.
 */
export function UbtcFigure({ className = '' }: Props) {
  return (
    <svg
      className={`figure ${className}`.trim()}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
    >
      {/* Held: an isometric solid, closed. */}
      <g className="figure-hold">
        <path className="figure-line" d="M62 22 116 53v62L62 146 8 115V53Z" />
        <path className="figure-line" d="M62 22v62M62 84l54 31M62 84 8 115" />
        <circle className="figure-lit figure-beat" cx="62" cy="84" r="4.4" />
      </g>

      {/* Issued: the same volume, expressed as one unit. */}
      <g className="figure-issue">
        <path className="figure-line" d="M156 46 192 84 156 122 120 84Z" />
        <path className="figure-line figure-soft" d="M156 66 174 84 156 102 138 84Z" />
        <circle className="figure-lit figure-beat figure-late" cx="156" cy="84" r="4" />
      </g>

      {/* The tie. The only thing here that moves, because it is the claim. */}
      <path className="figure-line figure-tie" d="M116 84h4" />
      <path className="figure-line figure-soft" d="M118 74v20" />

      {/* One for one, in both directions. */}
      <path className="figure-line figure-soft" d="M40 168h120M40 168l10-6M40 168l10 6M160 168l-10-6M160 168l-10 6" />
    </svg>
  );
}

/**
 * Quantum Settle — two legs, one moment.
 *
 * Two parties either side of an instrument neither of them holds. The two
 * tokens travel in opposite directions and arrive together, because that is
 * what atomic means: both legs complete, or neither does. They are on the same
 * clock for exactly that reason.
 */
export function SettleFigure({ className = '' }: Props) {
  return (
    <svg
      className={`figure ${className}`.trim()}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
    >
      {/* Three parties: the buyer, the seller, and the verifier above them. */}
      <path className="figure-line" d="M32 128 54 150 32 172 10 150Z" />
      <path className="figure-line" d="M168 128 190 150 168 172 146 150Z" />
      <path className="figure-line" d="M100 16 122 38 100 60 78 38Z" />
      <circle className="figure-lit" cx="32" cy="150" r="3.4" />
      <circle className="figure-lit" cx="168" cy="150" r="3.4" />
      <circle className="figure-lit" cx="100" cy="38" r="3.4" />

      {/* The credit the three of them are party to. */}
      <path className="figure-line" d="M100 74 133 93v38l-33 19-33-19V93Z" />
      <path className="figure-line figure-soft" d="M80 102h40M80 114h40M80 126h26" />
      <path className="figure-line figure-soft" d="M100 60v14" />

      {/*
        Two of the three seals filled, and the third an outline. Release takes
        two signatures, so a drawing with three filled would be drawing a rule
        the product does not have.
      */}
      <circle className="figure-lit figure-sign" cx="100" cy="82" r="4.6" />
      <circle className="figure-lit figure-sign" cx="70" cy="140" r="4.6" />
      <circle className="figure-line" cx="130" cy="140" r="4.4" />

      {/* The documents, up from the seller to be checked. */}
      <path className="figure-line figure-soft" id="settle-docs" d="M154 138c-20-6-38-12-46-24" />
      <circle className="figure-lit figure-carry" r="2.8">
        <animateMotion dur="7s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;0.06;0.34;1" calcMode="linear">
          <mpath href="#settle-docs" />
        </animateMotion>
      </circle>

      {/*
        And the payment: in from the buyer, held while the checking happens,
        and out to the seller once it has been signed for. One token, because
        it is one payment, and the pause in the middle is the whole point.
      */}
      <path className="figure-line figure-soft" id="settle-flow" d="M40 144c18-16 38-24 60-24s42 8 60 24" />
      <circle className="figure-lit figure-carry" r="3.4">
        <animateMotion dur="7s" repeatCount="indefinite" keyPoints="0;0.5;0.5;1;1" keyTimes="0;0.24;0.66;0.9;1" calcMode="linear">
          <mpath href="#settle-flow" />
        </animateMotion>
      </circle>
    </svg>
  );
}

export function VaultFigure({ className = '' }: Props) {
  return (
    <svg
      className={`figure ${className}`.trim()}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
    >
      {/*
        The shell turns about its own centre rather than the middle of the
        square. An SVG transform resolves against the view box by default, so a
        cage drawn anywhere else wobbles instead of spinning.
      */}
      <g className="figure-turn figure-cage">
        <path className="figure-line" d="M100 18 150 47v58l-50 29-50-29V47Z" />
        <path className="figure-line figure-soft" d="M100 18v58M100 76l50 29M100 76 50 105" />
      </g>

      {/* What is being kept. */}
      <path className="figure-line" d="M100 54 122 76 100 98 78 76Z" />
      <path className="figure-line figure-soft" d="M100 65 111 76 100 87 89 76Z" />
      <circle className="figure-lit" cx="100" cy="76" r="4.2" />

      {/* Immediate, emergency, recovery. */}
      <path
        className="figure-line figure-route"
        id="vault-immediate"
        d="M100 134c0 26-42 22-42 48"
      />
      <path className="figure-line figure-soft" d="M100 134v48" />
      <path className="figure-line figure-soft" d="M100 134c0 26 42 22 42 48" />
      <circle className="figure-lit" cx="58" cy="182" r="4" />
      <circle className="figure-line figure-soft" cx="100" cy="182" r="3.6" fill="none" />
      <circle className="figure-line figure-soft" cx="142" cy="182" r="3.6" fill="none" />

      {/*
        And something takes it. The one path that needs nobody's cooperation is
        the one with anything on it.
      */}
      <circle className="figure-lit figure-carry" r="3.4">
        <animateMotion dur="4.2s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
          <mpath href="#vault-immediate" />
        </animateMotion>
      </circle>
    </svg>
  );
}

/**
 * Quantum Node Network — a threshold, not a majority of one.
 *
 * Nine independent operators on the ring; five of them lit and joined to the
 * middle, because what settles is what a quorum has agreed rather than what any
 * single signer decided. The count is the point, so it is drawn rather than
 * asserted.
 */
export function NodeNetworkFigure({ className = '' }: Props) {
  const nodes = Array.from({ length: 9 }, (_, i) => {
    const angle = ((-90 + i * 40) * Math.PI) / 180;
    return {
      x: 100 + Math.cos(angle) * 62,
      y: 100 + Math.sin(angle) * 62,
      quorum: i < 5,
    };
  });

  return (
    <svg
      className={`figure ${className}`.trim()}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="figure-line figure-soft figure-turn" cx="100" cy="100" r="62" />

      {nodes.map((node, i) =>
        node.quorum ? (
          <path
            key={`spoke-${i}`}
            className="figure-line"
            d={`M100 100 ${node.x.toFixed(1)} ${node.y.toFixed(1)}`}
          />
        ) : (
          <path
            key={`spoke-${i}`}
            className="figure-line figure-soft"
            d={`M100 100 ${node.x.toFixed(1)} ${node.y.toFixed(1)}`}
          />
        ),
      )}

      {nodes.map((node, i) =>
        node.quorum ? (
          <circle
            key={`node-${i}`}
            className="figure-lit figure-agree"
            style={{ animationDelay: `${i * 0.36}s` }}
            cx={node.x.toFixed(1)}
            cy={node.y.toFixed(1)}
            r="4.2"
          />
        ) : (
          <circle
            key={`node-${i}`}
            className="figure-line figure-soft"
            cx={node.x.toFixed(1)}
            cy={node.y.toFixed(1)}
            r="3.4"
            fill="none"
          />
        ),
      )}

      {/*
        What they co-sign, once they have. The delay is the five operators
        agreeing before it: nothing signs until the last of them has.
      */}
      <path className="figure-line" d="M100 84 116 100 100 116 84 100Z" />
      <circle className="figure-lit figure-sign" cx="100" cy="100" r="3.2" />
    </svg>
  );
}
