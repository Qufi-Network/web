'use client';

import { SPACES } from '../../experience/Spaces';
import { useNav } from '../../experience/navigation';
import { toneOf } from './tone';

/**
 * What a space says once the visitor is standing in it.
 *
 * A title, one sentence, the movement the structure performs, and a line about
 * whichever beat of that movement is on screen. That is the whole of it. There
 * is no surface behind these words and no border around them: the visitor is
 * inside a structure, and the type is in there with them.
 *
 * The sequence row is a readout of the scene rather than a control over it —
 * scrolling drives the structure, and the row reports where that got to. Past
 * the last beat the same scroll carries straight on into the next space, so
 * there is nothing here to press to continue.
 */
export function SpaceLayer() {
  const mode = useNav((s) => s.mode);
  const active = useNav((s) => s.active);
  const beat = useNav((s) => s.beat);
  const stage = useNav((s) => s.stage);
  const revealed = useNav((s) => s.revealed);

  const shown = active >= 0 && (mode === 'INSIDE' || mode === 'TRAVEL');
  const space = active >= 0 ? SPACES[active] : null;
  if (!space) return <div className="space" data-show="false" aria-hidden="true" />;

  const sequence = space.sequence ?? [];
  const line = space.stages?.[Math.min(beat, (space.stages?.length ?? 1) - 1)];

  return (
    <section
      className="space"
      data-show={String(shown && mode === 'INSIDE' && !(revealed && active === 0))}
      aria-hidden={!shown}
      style={{ '--tone': toneOf(space), '--at': stage } as React.CSSProperties}
    >
      <p className="space-eyebrow">
        <b>{space.index}</b>
        {space.nav}
        <i className="space-rule" aria-hidden="true" />
      </p>

      {space.lead ? <p className="space-lead">{space.lead}</p> : null}
      <h2 className="space-title">{space.title}</h2>
      <p className="space-body">{space.body}</p>

      {sequence.length ? (
        <p className="sequence">
          {sequence.map((step, index) => (
            <span key={step}>
              {index > 0 ? (
                <i className="sequence-arrow" aria-hidden="true">
                  {'→'}&nbsp;
                </i>
              ) : null}
              <span className="sequence-step" data-on={String(index <= beat)}>
                {step}
              </span>
              &nbsp;
            </span>
          ))}
        </p>
      ) : null}

      <p className="space-stage">{line}</p>

      <p className="space-scroll">
        <i aria-hidden="true" />
        Keep scrolling
      </p>
    </section>
  );
}
