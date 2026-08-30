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

  /*
   * Whether the statement has been read.
   *
   * A stage says one thing and then spends the rest of itself showing it, and
   * the statement does not need to stay on the screen for all of that — on a
   * phone the words are underneath the scene, so what they are really doing
   * for the second half of a stage is taking height away from the thing they
   * are about. Past a third of the way in, the title and the paragraph go and
   * the steps carry on alone.
   *
   * Derived from the position like everything else here, so scrolling back
   * brings them back rather than leaving the visitor with a stage they can no
   * longer read.
   */
  const read = local > 0.34;

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

      <section
        className="space life-words"
        data-show="true"
        data-read={String(read)}
        key={stage.id}
      >
        <p className="space-eyebrow">
          <b>{stage.index}</b>
          {stage.nav}
          <i className="space-rule" aria-hidden="true" />
        </p>

        {/*
          The statement, in a wrapper that can be collapsed to nothing.

          A grid row going from one fraction to zero is the one way to animate
          a block down to no height without knowing how tall it was, and the
          height is what this is about.
        */}
        <div className="space-said">
          <div>
            <h2 className="space-title">{stage.title}</h2>
            <p className="space-body">{stage.body}</p>
          </div>
        </div>

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
