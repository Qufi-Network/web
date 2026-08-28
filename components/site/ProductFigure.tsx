'use client';

/**
 * Three products, drawn.
 *
 * Same vocabulary as the network — stroked geometry, a few lit points, no fills
 * and no rounded joins — but standing still. The environment on the front of
 * this site is a simulation that has to be watched; these are diagrams that have
 * to be read, and a figure that keeps moving under a paragraph is competing with
 * the paragraph.
 *
 * Each one says something true about its product rather than decorating it: the
 * two bodies uBTC keeps in step, the three ways out of a vault, the threshold
 * that has to agree before a node network signs. What moves is only ever the
 * part where the movement is the point.
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
      <path className="figure-line" d="M62 22 116 53v62L62 146 8 115V53Z" />
      <path className="figure-line" d="M62 22v62M62 84l54 31M62 84 8 115" />
      <circle className="figure-lit" cx="62" cy="84" r="4.4" />

      {/* Issued: the same volume, expressed as one unit. */}
      <path className="figure-line" d="M156 46 192 84 156 122 120 84Z" />
      <path className="figure-line figure-soft" d="M156 66 174 84 156 102 138 84Z" />
      <circle className="figure-lit" cx="156" cy="84" r="4" />

      {/* The tie. The only thing here that moves, because it is the claim. */}
      <path className="figure-line figure-tie" d="M116 84h4" />
      <path className="figure-line figure-soft" d="M118 74v20" />

      {/* One for one, in both directions. */}
      <path className="figure-line figure-soft" d="M40 168h120M40 168l10-6M40 168l10 6M160 168l-10-6M160 168l-10 6" />
    </svg>
  );
}

/**
 * Quantum Vault — one core, three ways out.
 *
 * The cage is the custody and the three descending paths are the redemption
 * tree that actually exists in the protocol: an immediate path, and two that
 * open on their own after a delay. The lit one is the one that does not need
 * anybody else.
 */
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
      <path className="figure-line" d="M100 134c0 26-42 22-42 48" />
      <path className="figure-line figure-soft" d="M100 134v48" />
      <path className="figure-line figure-soft" d="M100 134c0 26 42 22 42 48" />
      <circle className="figure-lit" cx="58" cy="182" r="4" />
      <circle className="figure-line figure-soft" cx="100" cy="182" r="3.6" fill="none" />
      <circle className="figure-line figure-soft" cx="142" cy="182" r="3.6" fill="none" />
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
          <circle key={`node-${i}`} className="figure-lit" cx={node.x.toFixed(1)} cy={node.y.toFixed(1)} r="4.2" />
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

      {/* What they co-sign. */}
      <path className="figure-line" d="M100 84 116 100 100 116 84 100Z" />
      <circle className="figure-lit" cx="100" cy="100" r="3.2" />
    </svg>
  );
}
