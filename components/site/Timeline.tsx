'use client';

import type { Stop } from './catalogue';

/**
 * Where a product is going, and when.
 *
 * One rail with stops on it. What is running is lit and behind you; what is
 * being built is where the rail stops being solid; what is planned is ahead of
 * that and drawn as intention rather than as fact. The line is the argument, so
 * the line is what moves: it draws itself from the start, the light travels
 * along the part that is real, and each stop arrives in turn behind it.
 *
 * The animation runs on arrival rather than on a loop. This sits inside a panel
 * that is replaced whenever another product is chosen, so every time the
 * visitor opens one the rail draws again — the transition between products is
 * this, rather than a fade.
 */
export function Timeline({
  title,
  lead,
  stops,
}: {
  title: string;
  lead: string;
  stops: Stop[];
}) {
  /**
   * How far along the rail is real.
   *
   * Up to and including the last stop that is running or being built. Past that
   * the rail is drawn but not lit, because nothing is travelling on it yet.
   */
  const reached = stops.reduce(
    (furthest, stop, index) => (stop.state === 'planned' ? furthest : index),
    0,
  );
  const solid = stops.length > 1 ? (reached / (stops.length - 1)) * 100 : 100;

  return (
    <div className="timeline">
      <h3 className="timeline-title">{title}</h3>
      <p className="timeline-lead">{lead}</p>

      <ol className="timeline-rail" style={{ '--solid': `${solid}%` } as React.CSSProperties}>
        {/* The rail itself, behind the stops. Drawn, then lit as far as it is real. */}
        <span className="rail-drawn" aria-hidden="true" />
        <span className="rail-live" aria-hidden="true" />
        <span className="rail-pulse" aria-hidden="true" />

        {stops.map((stop, index) => (
          <li
            key={stop.where}
            className="stop"
            data-state={stop.state}
            style={{ '--at': index } as React.CSSProperties}
          >
            <span className="stop-mark" aria-hidden="true" />
            <span className="stop-where">{stop.where}</span>
            <span className="stop-what">{stop.what}</span>
            <span className="stop-when">{stop.when}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
