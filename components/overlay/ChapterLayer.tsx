'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAPTERS } from '../../experience/Chapters';
import { useNetwork } from '../../experience/NetworkContext';
import { GenesisForm } from './GenesisForm';
import { RouteMark, type RouteShape } from './RouteMark';
import { QUFI_MARK } from '../../assets/mark';
import { CardManifest } from './CardManifest';
import { stage } from '../../experience/stage';

/**
 * Everything the visitor reads below the opening.
 *
 * Statements appear at a point inside their chapter and leave when the chapter
 * does. They are positioned against the frame rather than against the scene, so
 * the camera can move through the network underneath without dragging the words
 * around with it.
 *
 * The whole layer is driven by one animation frame loop writing CSS custom
 * properties and data attributes, not by React state. Scroll-linked copy that
 * re-renders a tree on every scroll event is the single most reliable way to
 * make a site like this feel heavy.
 */

interface Props {
  /** Chapters only exist once the visitor has accepted the invitation. */
  active: boolean;
}

/**
 * Splits a statement so the accent phrase can be lit on its own.
 *
 * Done here rather than by pre-splitting the copy into fragments, so the
 * chapter file still reads as the sentence somebody wrote.
 */
function renderStatement(text: string, accent?: string) {
  if (!accent) return text;
  const at = text.indexOf(accent);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className="hero-accent">{accent}</span>
      {text.slice(at + accent.length)}
    </>
  );
}

export function ChapterLayer({ active }: Props) {
  const { engine, capability } = useNetwork();
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [live, setLive] = useState(false);
  const genesisPanel = useRef<HTMLDivElement>(null);

  /**
   * Travelling to a journey is a scroll, not a route change.
   *
   * Everything in this site is a position in one continuous descent, so
   * selecting a destination has to move the visitor along that descent rather
   * than jump them somewhere else. Smooth, because the point is that they see
   * the network carry them there.
   */
  const travelTo = useCallback((id: string) => {
    const index = CHAPTERS.findIndex((chapter) => chapter.id === id);
    if (index < 0) return;
    const range = document.documentElement.scrollHeight - window.innerHeight;
    // A little past the start of the chapter, so the visitor arrives inside it
    // rather than on its threshold.
    const target = ((index + 0.14) / CHAPTERS.length) * range;
    window.scrollTo({ top: Math.round(target), behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!active) return;
    const element = root.current;
    if (!element) return;

    const lines = Array.from(element.querySelectorAll<HTMLElement>('[data-line]'));
    const blocks = Array.from(element.querySelectorAll<HTMLElement>('[data-chapter]'));

    const tick = () => {
      const index = Math.floor(stage.depth);
      const local = stage.chapterLocal;

      /*
       * The register arrives after the words, not with them.
       *
       * Driven from the same scroll position as everything else rather than
       * from a transition, so scrolling back up puts the words alone on the
       * screen again exactly as they were.
       */
      const closing = element.querySelector<HTMLElement>('.chapter-enter');
      if (closing) {
        const local = stage.depth - (CHAPTERS.length - 1);
        // Same window the scene clears on, in ScrollDirector.
        const arrival = Math.max(0, Math.min(1, (local - 0.5) / 0.2));
        stage.genesis = arrival;
        closing.style.setProperty('--genesis', arrival.toFixed(3));
        const panel = closing.querySelector<HTMLElement>('.genesis-panel');
        if (panel) panel.style.pointerEvents = arrival > 0.6 ? 'auto' : 'none';
      }

      for (const block of blocks) {
        const owner = Number(block.dataset.chapter);
        // A chapter is present while the camera is in it, and fades at both
        // ends so nothing ever hard-cuts.
        const distance = stage.depth - owner;
        // The final chapter has nowhere to hand over to, so it does not fade at
        // its trailing edge — otherwise the site dims to nothing exactly where
        // the visitor is being asked to do something.
        const last = owner === CHAPTERS.length - 1;
        const leaving = last ? 1 : (1.05 - distance) / 0.22;
        const presence =
          distance < -0.12 || (!last && distance > 1.05)
            ? 0
            : Math.min(1, Math.min((distance + 0.12) / 0.16, leaving));
        block.style.setProperty('--presence', presence.toFixed(3));
        block.style.pointerEvents = presence > 0.6 ? 'auto' : 'none';
      }

      // Statements replace one another; only the most recent one that has been
      // reached is on screen. Letting them accumulate stacked four declarations
      // on top of each other and pushed the earliest ones off the top of the
      // frame. Supporting text is not a statement and stays with whichever one
      // it was written under.
      let latestStatement = -1;
      for (const line of lines) {
        if (line.dataset.kind !== 'statement') continue;
        if (Number(line.dataset.owner) !== index) continue;
        if (local >= Number(line.dataset.line)) latestStatement = Number(line.dataset.seq);
      }

      for (const line of lines) {
        const owner = Number(line.dataset.owner);
        const reached = owner === index && local >= Number(line.dataset.line);
        const shown =
          line.dataset.kind === 'statement'
            ? reached && Number(line.dataset.seq) === latestStatement
            : reached;
        line.dataset.shown = String(shown);
      }


      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [active]);

  return (
    <div className="chapters" ref={root} data-active={active}>
      {CHAPTERS.map((chapter, index) => (
        <section
          key={chapter.id}
          data-chapter={index}
          className={`chapter chapter-${chapter.id}`}
          // Chapters carrying route cards or a handover question need their
          // copy higher up the frame, or the two occupy the same corner.
          data-furniture={chapter.routes ? 'routes' : chapter.handover ? 'handover' : undefined}
          // A chapter whose readings arrive as cards has two things competing
          // for one column on a phone. Marked here so the narrow layout can
          // give the room to the one the visitor can actually open.
          data-readings={chapter.features || chapter.stops ? 'true' : undefined}
          aria-hidden={!active}
        >
          <div className="chapter-copy">
            {/*
              Statements share one grid cell so they occupy the same place on
              screen and swap, rather than flowing one after another.
            */}
            <div className="statement-stack">
              {chapter.lines.map((line, i) =>
                line.statement ? (
                  <div
                    key={`s${i}`}
                    className="line"
                    data-line={line.at}
                    data-owner={index}
                    data-kind="statement"
                    data-seq={i}
                  >
                    {line.eyebrow ? <p className="eyebrow">{line.eyebrow}</p> : null}
                    <p className={line.emphasis ? 'statement statement-hero' : 'statement'}>
                      {renderStatement(line.statement, line.accent)}
                    </p>
                  </div>
                ) : null,
              )}
            </div>
            {chapter.caption ? <p className="caption">{chapter.caption}</p> : null}
            <div className="body-stack">
              {chapter.lines.map((line, i) =>
                line.body ? (
                  <div
                    key={`b${i}`}
                    className="line"
                    data-line={line.at}
                    data-owner={index}
                    data-kind="body"
                    data-seq={i}
                  >
                    <p className="body">{line.body}</p>
                  </div>
                ) : null,
              )}
            </div>
          </div>



          {chapter.routes ? (
            <>
              <p className="routes-heading">Choose your QUFI journey</p>
              <ul className="routes">
                {chapter.routes.map((route) => (
                  <li key={route.label}>
                    <button
                      type="button"
                      className="pane edge-light"
                      // The card wears the colour the network takes on once the
                      // visitor is inside that journey, so the choice and the
                      // place it leads to are visibly the same thing.
                      data-journey={route.chapter}
                      onClick={() => travelTo(route.chapter)}
                    >
                      <span className="swirl" aria-hidden="true" />
                      <RouteMark shape={route.chapter as RouteShape} />
                      <span className="route-label">{route.label}</span>
                      <span className="route-line">{route.line}</span>
                      <span className="route-cta">{route.cta}</span>
                      {/* The mark rising out of the corner. Deliberately only
                          part of it — a whole logo dropped in a card corner is
                          a watermark; a fragment coming up out of the edge
                          reads as the network surfacing under the card. */}
                      <img className="route-mark-corner" src={QUFI_MARK} alt="" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {/*
            The question at the end of a journey. It is what makes the three
            read as one story rather than as three destinations: the asset
            journey ends by asking how the thing will move, and the answer is
            the next journey.
          */}
          {chapter.handover ? (
            <div className="handover" data-line={0.88} data-owner={index} data-kind="body">
              <p className="handover-question">{chapter.handover.question}</p>
              <button type="button" onClick={() => travelTo(chapter.handover!.chapter)}>
                <span className="handover-mark" aria-hidden="true" />
                {chapter.handover.answer}
              </button>
            </div>
          ) : null}

          {chapter.id === 'live' ? (
            <div className="readout-panel">
              <button
                type="button"
                className="live-toggle"
                data-live={live}
                onClick={() => setLive((value) => !value)}
              >
                <span className="live-dot" aria-hidden="true" />
                {live ? 'Simulated topology' : 'Show topology readout'}
              </button>
              <dl data-open={live}>
                <div>
                  <dt>Source</dt>
                  <dd>Generated in this browser</dd>
                </div>
                <div>
                  <dt>Participants</dt>
                  <dd>{engine.nodeCount.toLocaleString('en-GB')}</dd>
                </div>
                <div>
                  <dt>Relationships</dt>
                  <dd>{engine.edgeCount.toLocaleString('en-GB')}</dd>
                </div>
                <div>
                  <dt>Quorums</dt>
                  <dd>{engine.snapshot.quorumCount.toLocaleString('en-GB')}</dd>
                </div>
                <div>
                  <dt>Render tier</dt>
                  <dd>{capability.tier}</dd>
                </div>
                <div>
                  <dt>Live data</dt>
                  <dd>Connects at mainnet</dd>
                </div>
              </dl>
            </div>
          ) : null}

          {chapter.genesis ? (
            <div className="genesis-panel pane edge-light" data-always="true" ref={genesisPanel}>
              <p className="eyebrow">{chapter.genesis.eyebrow}</p>
              <h2 className="genesis-heading">{chapter.genesis.heading}</h2>
              <p className="genesis-body">{chapter.genesis.body}</p>
              <GenesisForm />
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
