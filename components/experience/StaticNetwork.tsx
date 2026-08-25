'use client';

import { useEffect, useMemo } from 'react';
import { buildTopology } from '../../network/topology';

/**
 * What the visitor gets when WebGL is unavailable.
 *
 * Not an apology screen. The same topology generator runs, projected to flat
 * SVG — a still photograph of the network instead of the live one — and the
 * document content that is otherwise held behind the experience is revealed.
 * Nobody arrives at a black rectangle.
 */

const WIDTH = 1200;
const HEIGHT = 700;
const FOCAL = 620;
const CAMERA_Z = 96;

export function StaticNetwork() {
  useEffect(() => {
    document.documentElement.dataset.webgl = 'false';
    return () => {
      delete document.documentElement.dataset.webgl;
    };
  }, []);

  const { nodes, edges } = useMemo(() => {
    const snapshot = buildTopology({ nodeCount: 260 });
    const project = (p: [number, number, number]) => {
      const depth = CAMERA_Z - p[2];
      const scale = FOCAL / Math.max(depth, 12);
      return {
        x: WIDTH / 2 + p[0] * scale,
        y: HEIGHT / 2 - p[1] * scale,
        scale,
      };
    };

    const projected = snapshot.nodes.map((node) => ({
      ...project(node.position),
      importance: node.importance,
    }));

    return {
      nodes: projected,
      // Enough relationships to show the structure, few enough to keep the
      // markup small on a device that has already told us it is limited.
      edges: snapshot.edges.slice(0, 420).map((edge) => ({
        a: projected[edge.source],
        b: projected[edge.target],
        strength: edge.strength,
      })),
    };
  }, []);

  return (
    <div className="static-network" aria-hidden="true">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid slice">
        <g stroke="#1769FF" fill="none">
          {edges.map((edge, i) => (
            <line
              key={i}
              x1={edge.a.x}
              y1={edge.a.y}
              x2={edge.b.x}
              y2={edge.b.y}
              strokeWidth={0.5}
              strokeOpacity={0.06 + edge.strength * 0.1}
            />
          ))}
        </g>
        <g fill="#4E93FF">
          {nodes.map((node, i) => (
            <circle
              key={i}
              cx={node.x}
              cy={node.y}
              r={Math.max(0.7, node.scale * 0.055 * (0.4 + node.importance))}
              fillOpacity={0.25 + node.importance * 0.5}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
