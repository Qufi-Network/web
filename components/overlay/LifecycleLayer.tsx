'use client';

import type { Journey } from '../../experience/lifecycle/journey';
import { useLife } from '../../experience/lifecycle/life';

/**
 * What the visitor is being told while it happens.
 *
 * The same reading column as a space on the front of the site — a coordinate, a
 * statement, the beats, and a line about whichever beat is on screen — because
 * this is the same kind of moment and should not look like a different site.
 *
 * The rail across the bottom is the one addition: a lifecycle has an order, and
 * being able to see how much of it is left is worth more here than it is on a
 * map where everything is equally reachable.
 */
export function LifecycleLayer({ journey }: { journey: Journey }) {
  const STAGES = journey.stages;
  const index = useLife((s) => s.stage);
  const beat = useLife((s) => s.beat);
  const local = useLife((s) => s.local);
  const at = useLife((s) => s.at);
  const ready = useLife((s) => s.ready);

  const stage = STAGES[index];
  // The last third of the last stage, the same point the ending uses.
  const ending = at > STAGES.length - 0.34;
  const line = stage.says[Math.min(beat, stage.says.length - 1)];

  return (
    <div
      className="life"
      data-show={String(ready)}
      data-ending={String(ending)}
      style={{ '--tone': journey.tone } as React.CSSProperties}
    >
      <p className="coordinate life-coordinate" aria-live="polite">
        <span className="coordinate-index">{stage.index}</span>
        <span className="coordinate-path">
          {journey.nav} / {stage.nav}
        </span>
      </p>

      <section className="space life-words" data-show="true" key={stage.id}>
        <p className="space-eyebrow">
          <b>{stage.index}</b>
          {stage.nav}
          <i className="space-rule" aria-hidden="true" />
        </p>

        <h2 className="space-title">{stage.title}</h2>
        <p className="space-body">{stage.body}</p>

        <p className="sequence">
          {stage.beats.map((word, i) => (
            <span key={word}>
              {i > 0 ? (
                <i className="sequence-arrow" aria-hidden="true">
                  {'→'}&nbsp;
                </i>
              ) : null}
              <span className="sequence-step" data-on={String(i <= beat)}>
                {word}
              </span>
              &nbsp;
            </span>
          ))}
        </p>

        <p className="space-stage">{line}</p>

        <p className="space-scroll" style={{ '--at': local } as React.CSSProperties}>
          <i aria-hidden="true" />
          {index === STAGES.length - 1 && local > 0.9 ? 'That is the whole of it' : 'Keep scrolling'}
        </p>
      </section>

      {/* The lifecycle has an order, and how much is left is worth showing. */}
      <ol className="life-rail" aria-hidden="true">
        {STAGES.map((entry, i) => (
          <li key={entry.id} data-state={i < index ? 'done' : i === index ? 'here' : 'ahead'}>
            <i />
            <span>{entry.nav}</span>
          </li>
        ))}
        <span
          className="life-rail-run"
          style={{ '--run': `${(at / STAGES.length) * 100}%` } as React.CSSProperties}
        />
      </ol>
    </div>
  );
}
