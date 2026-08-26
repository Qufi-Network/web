'use client';

import { useMemo, useState } from 'react';
import { SPACES, SPINES } from '../../experience/Spaces';
import { enterSpace, useNav } from '../../experience/navigation';
import { toneOf } from './tone';

/**
 * A navigation system rather than a menu.
 *
 * The one piece of the interface that shows the whole network at once, and it
 * is a map of the real thing: every point sits where its structure sits in the
 * volume, seen from above, joined by the pathways that actually join them. So
 * moving between two spaces on this and moving between them in the scene are
 * the same operation described twice.
 *
 * Every point names itself on approach — pointer or keyboard — because a map of
 * eight unlabelled dots tells you how the network is shaped and nothing about
 * what is in it. The name is not the only way in, though: every point is a
 * button, so the whole thing still works from a thumb, where there is no hover
 * to discover anything by.
 *
 * The name sits on the point rather than in a line under the map. A single
 * readout has to decide between what the pointer is over on the map and what it
 * is over in the scene, and those are two different questions with two
 * different answers — it showed one while the map showed the other. Naming each
 * point in place removes the question, and the coordinate in the top corner is
 * already the answer to "where am I".
 */
export function Constellation() {
  const active = useNav((s) => s.active);
  const [hoverOnMap, setHoverOnMap] = useState(-1);

  const points = useMemo(() => {
    // Fit the layout to the box rather than assuming a range: move a structure
    // in the map file and this follows it.
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const space of SPACES) {
      minX = Math.min(minX, space.anchor[0]);
      maxX = Math.max(maxX, space.anchor[0]);
      minZ = Math.min(minZ, space.anchor[2]);
      maxZ = Math.max(maxZ, space.anchor[2]);
    }
    const spanX = Math.max(1, maxX - minX);
    const spanZ = Math.max(1, maxZ - minZ);
    const pad = 12;
    return SPACES.map((space) => {
      const x = pad + ((space.anchor[0] - minX) / spanX) * (100 - pad * 2);
      return {
        space,
        x,
        y: pad + ((space.anchor[2] - minZ) / spanZ) * (100 - pad * 2),
        // A label on a point near the right edge has to open leftward or it
        // leaves the map.
        side: x > 58 ? 'left' : 'right',
      };
    });
  }, []);

  return (
    <nav className="constellation" aria-label="Network spaces">
      <p className="constellation-title">Navigate network</p>

      <div className="constellation-map">
        <svg viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none">
          {SPINES.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              className="constellation-link"
              x1={points[a].x}
              y1={points[a].y}
              x2={points[b].x}
              y2={points[b].y}
            />
          ))}
        </svg>

        {points.map(({ space, x, y, side }, index) => (
          <button
            key={space.id}
            type="button"
            className="constellation-node"
            style={
              {
                left: `${x}%`,
                top: `${y}%`,
                '--tone': toneOf(space),
              } as React.CSSProperties
            }
            data-active={String(active === index)}
            data-near={String(hoverOnMap === index)}
            data-side={side}
            aria-current={active === index ? 'true' : undefined}
            onPointerEnter={() => setHoverOnMap(index)}
            onPointerLeave={() => setHoverOnMap((current) => (current === index ? -1 : current))}
            onFocus={() => setHoverOnMap(index)}
            onBlur={() => setHoverOnMap((current) => (current === index ? -1 : current))}
            onClick={() => enterSpace(index)}
          >
            <span className="constellation-label" aria-hidden="true">
              <i>{space.index}</i>
              {space.nav}
            </span>
            <span className="sr-only">{`${space.index} ${space.nav}`}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
