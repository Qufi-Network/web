'use client';

import { useEffect, useRef, useState } from 'react';
import { CHAPTERS } from '../../experience/Chapters';
import { stage } from '../../experience/stage';
import type { GlyphName } from './Glyph';
import { RouteMark, type RouteShape } from './RouteMark';
import { CardManifest } from './CardManifest';

/**
 * The thing the visitor has arrived at.
 *
 * One reading at a time, tethered to the participant out in the network it
 * belongs to, and moving with it as the camera travels. A grid of these would
 * be a feature list; reached one after another, each hanging off a node that
 * lights as its turn comes, they are a route through what the network does.
 *
 * There is exactly one card element. Only one is ever on screen and the presence
 * curve dips to nothing between consecutive readings, so the content is swapped
 * in that gap — eight cards stacked at the same point cost eight backdrop
 * filters and bought nothing.
 *
 * Everything except the icon is written on the animation frame: the anchor moves
 * with the camera every frame, and re-rendering a React tree to move one element
 * is not a reasonable way to do that.
 */

const SERIES = CHAPTERS.map((chapter, index) => ({
  index,
  items: (chapter.features ?? chapter.stops ?? []).map((item) => ({
    term: item.term,
    note: item.note,
    glyph: 'glyph' in item ? (item.glyph as string) : null,
  })),
})).filter((entry) => entry.items.length > 0);

/**
 * Which shape a reading forms when it has no subject of its own.
 *
 * Route stops are a sequence rather than a taxonomy, so they borrow the shape of
 * the journey they belong to and let the counter carry the position.
 */
const CHAPTER_SHAPE: Record<string, GlyphName> = {
  signal: 'verification',
  assets: 'assets',
  money: 'money',
  settlement: 'settlement',
  protocol: 'custody',
};

export function FeatureCard({ active }: { active: boolean }) {
  /**
   * The mark re-renders only when the subject actually changes, never on the
   * frame loop — it has a draw-on animation that would restart every frame.
   */
  const [shape, setShape] = useState<GlyphName>('verification');
  const shapeRef = useRef<GlyphName>('verification');

  /**
   * Readings arrive closed.
   *
   * A card that lands with a paragraph on it asks to be read at exactly the
   * moment the visitor is watching something move. Closed, it states what has
   * been reached and leaves the choice of whether to stop with them — and
   * scrolling on simply takes it back into the network unopened.
   */
  /**
   * Which reading is open, by index, rather than a plain boolean.
   *
   * Tying it to the item means a new reading is closed by definition — there is
   * nothing to reset — and the frame loop never has to call setState to correct
   * it. It used to, and any transient wobble in the scroll position was enough
   * to close a card the visitor had just opened.
   */
  const [openItem, setOpenItem] = useState(-1);

  const card = useRef<HTMLElement>(null);
  const term = useRef<HTMLHeadingElement>(null);
  const note = useRef<HTMLParagraphElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    if (!active) return;
    const element = card.current;
    if (!element) return;

    const tick = () => {
      const { featureAnchor: anchor, featurePresence: presence, featureIndex: index } = stage;
      const here = Math.floor(stage.depth);
      const series = SERIES.find((entry) => entry.index === here);
      const item = series?.items[index];
      const visible = Boolean(item) && anchor.visible > 0.01;

      element.dataset.show = String(visible);

      if (!visible || !item || !series) {
        frame.current = requestAnimationFrame(tick);
        return;
      }

      /*
       * The centre of the screen, always.
       *
       * These were placed beside the node each reading belongs to, which meant
       * they moved continuously as the camera travelled — technically faithful
       * and genuinely hard to read. A reading that arrives in the same place
       * every time can be read at a glance, and the tether still says which
       * part of the network it came out of.
       */
      const width = element.offsetWidth || 360;
      const height = element.offsetHeight || 200;
      const narrow = window.innerWidth < 900;

      /*
       * The half the words are not using.
       *
       * Sides alternate so consecutive readings do not stack in one place, but
       * the alternation is only a preference: several chapters carry their copy
       * down the left, and a reading that took its turn on the left would land
       * on top of it. Whatever the copy is occupying wins, and the reading takes
       * the other half.
       */
      let side = stage.featureSide || 1;
      if (!narrow) {
        // The active chapter's copy, not the first one in the document. Every
        // chapter has a .chapter-copy, so an unqualified query always returned
        // chapter one's - which is empty by the time any reading exists, so the
        // guard that keeps the card clear of the words never fired.
        const copy = document.querySelector<HTMLElement>(
          `[data-chapter="${here}"] .chapter-copy`,
        );
        const guard = copy?.getBoundingClientRect();
        if (guard && guard.width > 0) {
          const cardTop = window.innerHeight / 2 - height / 2;
          const cardBottom = window.innerHeight / 2 + height / 2;
          const sharesRows = cardBottom > guard.top - 20 && cardTop < guard.bottom + 20;
          if (sharesRows) {
            const copySide = (guard.left + guard.right) / 2 < window.innerWidth / 2 ? -1 : 1;
            if (side === copySide) side = -copySide as 1 | -1;
          }
        }
      }
      stage.featureSideUsed = narrow ? 0 : side;

      const offset = narrow ? 0 : side * window.innerWidth * 0.19;
      const restX = Math.round(
        Math.min(
          Math.max(window.innerWidth / 2 + offset, width / 2 + 24),
          window.innerWidth - width / 2 - 24,
        ),
      );
      /*
       * On a phone the copy runs across the top, so the card takes the middle
       * of whatever is left underneath it rather than the middle of the screen.
       * Centring on the viewport put it straight through the longer headlines.
       */
      let centreY = window.innerHeight / 2;
      if (narrow) {
        // The active chapter's copy, not the first one in the document. Every
        // chapter has a .chapter-copy, so an unqualified query always returned
        // chapter one's - which is empty by the time any reading exists, so the
        // guard that keeps the card clear of the words never fired.
        const copy = document.querySelector<HTMLElement>(
          `[data-chapter="${here}"] .chapter-copy`,
        );
        const guard = copy?.getBoundingClientRect();
        const floor = guard && guard.height > 0 ? guard.bottom + 20 : 0;
        centreY = Math.max(centreY, floor + height / 2);
      }
      const restY = Math.round(
        Math.min(Math.max(centreY, height / 2 + 24), window.innerHeight - height / 2 - 24),
      );

      /*
       * The card holds still.
       *
       * It used to fly from the participant it belongs to out to its berth,
       * which was the right idea and the wrong mechanism: the anchor is a live
       * projection of a node in a moving scene, so the card inherited every bit
       * of that motion, and scrubbing the scroll bounced it back and forth
       * along the path. A panel of text that never settles cannot be read.
       *
       * The arrival is carried by scale and by the particles thrown off at the
       * node instead - both of which say "out of the network" without ever
       * moving the thing the visitor is trying to read.
       */
      element.style.setProperty('--anchor-x', `${restX}px`);
      element.style.setProperty('--anchor-y', `${restY}px`);
      element.style.setProperty('--presence', presence.toFixed(3));

      /*
       * Depth, not opacity.
       *
       * Presence runs up as a reading arrives and back down as it leaves, so
       * mapping it to scale gives the same gesture in both directions: the card
       * comes forward out of the network, holds, and recedes back into it.
       */
      const eased = 1 - Math.pow(1 - presence, 2.2);
      element.style.setProperty('--depth', (0.78 + eased * 0.22).toFixed(3));
      /*
       * Softness only at the very start of the approach.
       *
       * A reading spends most of its life mid-presence, so anything that stays
       * soft across the middle of the range is a card that is blurred the whole
       * time it is on screen. It clears inside the first sixth and everything
       * after that is sharp.
       */
      const haze = Math.max(0, (0.16 - presence) / 0.16) * 2.2;
      element.style.setProperty('--haze', haze.toFixed(2));
      element.dataset.item = String(index);
      element.dataset.open = String(openItem === index);

      if (term.current && term.current.textContent !== item.term) {
        term.current.textContent = item.term;
      }
      if (note.current && note.current.textContent !== item.note) {
        note.current.textContent = item.note;
      }
      if (count.current) {
        const label = `${String(index + 1).padStart(2, '0')} / ${String(series.items.length).padStart(2, '0')}`;
        if (count.current.textContent !== label) count.current.textContent = label;
      }

      const wanted = (item.glyph ??
        CHAPTER_SHAPE[CHAPTERS[here]?.id] ??
        'verification') as GlyphName;
      if (shapeRef.current !== wanted) {
        shapeRef.current = wanted;
        setShape(wanted);
      }

      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [active, openItem]);

  if (!active || SERIES.length === 0) return null;

  return (
    <>
      <CardManifest target={card} />

      <article className="feature-card" ref={card} data-show="false" data-open="false">
        <span className="card-edge" aria-hidden="true" />
        <button
          type="button"
          className="feature-head"
          onClick={() => setOpenItem((current) => (current === stage.featureIndex ? -1 : stage.featureIndex))}
          aria-expanded={openItem === stage.featureIndex}
        >
          {/* A lit dot while it is a control; the figure only once opened, so
              the closed state stays a single readable line. */}
          <span className="feature-dot" aria-hidden="true" />
          <span className="feature-mark" data-shape={shape}>
            {openItem >= 0 ? <RouteMark shape={shape as RouteShape} size={44} /> : null}
          </span>
          <span className="feature-titles">
            <span className="feature-index" ref={count} />
            <h3 ref={term} />
          </span>
          <span className="feature-toggle" aria-hidden="true" />
        </button>
        <div className="feature-body">
          <p ref={note} />
        </div>
      </article>
    </>
  );
}
