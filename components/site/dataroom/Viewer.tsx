'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QUFI_MARK } from '../../../assets/mark';
import { QUFI_WORD, QUFI_WORD_SIZE } from '../../../assets/word';
import type { Paper } from './papers';

/**
 * A paper, read in the browser.
 *
 * The pages are drawn onto canvases by pdf.js rather than handed to the
 * browser's own PDF viewer, and that is the whole design. The native viewer
 * arrives with a toolbar carrying a download button, a print button and a
 * "save as" in its context menu; none of those can be removed, and the
 * `#toolbar=0` fragment that used to hide them is a Chrome-only courtesy that
 * has never applied to Firefox or Safari. Drawing the pages ourselves means
 * there is no toolbar to argue with.
 *
 * What the reader gets instead: the page, a way through the pages, and a zoom.
 * What they do not get is a control that hands them the file — because this
 * document is shown, not given.
 *
 * ## On how far this goes
 *
 * A page rendered to a canvas has been decoded in the reader's own machine.
 * Somebody who opens developer tools can take the bytes out of the network
 * panel, and no amount of client-side work changes that. This removes every
 * ordinary route — the toolbar, the context menu, the keyboard save, the
 * direct URL — and stops there rather than pretending to be a lock.
 */

/*
 * Rendered at several device pixels per CSS pixel.
 *
 * These are decks: dense diagrams, small captions, tables of numbers. At 1x
 * the captions turn to mush, which is worse than useless for a document whose
 * whole job is to be read. Three is where the smallest type in these three
 * papers stops being an approximation of itself.
 */
const OVERSAMPLE = 3;

/*
 * And a ceiling, because a canvas is memory.
 *
 * Three times a full-width landscape page on a retina display is a bitmap of
 * about twenty-four million pixels, and twelve of them is most of a gigabyte.
 * The scale is reduced for any page that would cross this, so a large screen
 * gets the sharpest render it can hold rather than the sharpest render that
 * exists.
 */
const MAX_PIXELS = 9_000_000;

interface Rendered {
  page: number;
  width: number;
  height: number;
}

export function Viewer({
  id,
  paper,
  title,
  light = false,
}: {
  id: string;
  paper: Paper;
  title: string;
  /**
   * Which way up the pages are shown.
   *
   * The three papers are dark decks: near-black grounds, light type, coloured
   * diagrams. That is right beside the environment and wrong on a white site,
   * where three dark rectangles read as holes in the page. The standard site
   * asks for them light and the environment leaves them as they are, and
   * either way the reader can change their mind.
   */
  light?: boolean;
}) {
  const hold = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'broken'>('loading');
  const [pages, setPages] = useState<Rendered[]>([]);
  const [at, setAt] = useState(1);
  const [wide, setWide] = useState(false);
  const [flipped, setFlipped] = useState(light);

  /*
   * Everything that would ordinarily produce a copy.
   *
   * The context menu on a canvas offers "save image as", which would hand over
   * a page as a PNG; Ctrl+S saves the document; Ctrl+P prints it to a PDF,
   * which is the same thing wearing a hat. All three are turned off while the
   * viewer is mounted, and all three are turned back on when it is not.
   */
  useEffect(() => {
    const noMenu = (event: Event) => event.preventDefault();
    const noKeys = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && ['s', 'p'].includes(event.key.toLowerCase())) event.preventDefault();
    };
    document.addEventListener('contextmenu', noMenu);
    document.addEventListener('keydown', noKeys);
    return () => {
      document.removeEventListener('contextmenu', noMenu);
      document.removeEventListener('keydown', noKeys);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    let doc: { destroy: () => void } | null = null;

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf/pdf.worker.min.mjs';

        // Nothing in these decks needs a script, a font hack or an
        // attachment, and a PDF that asks for one is a PDF doing something
        // else — so the renderer is given the document and no permissions.
        const task = pdfjs.getDocument({
          url: `/data-room/paper/${id}`,
          isEvalSupported: false,
        } as Parameters<typeof pdfjs.getDocument>[0]);
        const file = await task.promise;
        if (!alive) {
          file.destroy();
          return;
        }
        doc = file;

        const width = hold.current?.clientWidth ?? 900;
        const drawn: Rendered[] = [];

        for (let n = 1; n <= file.numPages; n++) {
          if (!alive) break;
          const page = await file.getPage(n);
          const natural = page.getViewport({ scale: 1 });
          // Fit the page to the column, then draw it at more than that so the
          // small type in the diagrams survives.
          const fit = width / natural.width;

          // As sharp as the page can be without asking for a bitmap the
          // machine will not give us.
          let scale = fit * OVERSAMPLE;
          const wanted = natural.width * scale * (natural.height * scale);
          if (wanted > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / wanted);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = 'paper-page';
          canvas.dataset.page = String(n);
          canvas.setAttribute('aria-label', `${title}, page ${n}`);

          const context = canvas.getContext('2d');
          if (!context) continue;
          await page.render({ canvas, canvasContext: context, viewport }).promise;

          if (!alive) break;

          /*
           * The page, with our own mark over the one baked into it.
           *
           * The badge is a sibling of the canvas rather than something painted
           * into it, which matters twice over: the CSS inversion applies to
           * the canvas alone, so the mark keeps its own colours whichever way
           * the pages are shown; and it is a mask over a fill, so it stays
           * sharp at any zoom while the render underneath is fixed pixels.
           */
          const sheet = document.createElement('div');
          sheet.className = 'paper-sheet';
          sheet.appendChild(canvas);

          if (paper.logo) {
            const badge = document.createElement('span');
            badge.className = 'paper-badge';
            badge.style.left = `${paper.logo.x * 100}%`;
            badge.style.top = `${paper.logo.y * 100}%`;
            badge.style.width = `${paper.logo.w * 100}%`;
            badge.style.height = `${paper.logo.h * 100}%`;
            badge.innerHTML =
              '<i class="paper-badge-mark"></i><i class="paper-badge-word"></i>';
            sheet.appendChild(badge);
          }

          hold.current?.appendChild(sheet);
          drawn.push({ page: n, width: natural.width, height: natural.height });
          setPages([...drawn]);
          if (n === 1) setState('ready');
        }
      } catch (error) {
        if (!alive) return;
        // A 404 from the route is a paper that has not been put on the host;
        // anything else is a paper that would not parse. The reader is told
        // which, because "something went wrong" helps nobody.
        const missing = String(error).includes('404') || String(error).includes('Not available');
        setState(missing ? 'missing' : 'broken');
      }
    })();

    return () => {
      alive = false;
      doc?.destroy();
    };
  }, [id, title]);

  /* Which page is in front of the reader, for the readout. */
  useEffect(() => {
    const node = hold.current;
    if (!node || state !== 'ready') return;
    const watch = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setAt(Number((entry.target as HTMLElement).dataset.page ?? 1));
          }
        }
      },
      { root: null, threshold: 0.5 },
    );
    for (const canvas of node.querySelectorAll('canvas')) watch.observe(canvas);
    return () => watch.disconnect();
  }, [state, pages.length]);

  const goto = useCallback((n: number) => {
    const target = hold.current?.querySelector(`canvas[data-page="${n}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div
      className="reader"
      data-wide={String(wide)}
      data-state={state}
      data-light={String(flipped)}
      style={
        {
          '--badge-mark': `url(${QUFI_MARK})`,
          '--badge-word': `url(${QUFI_WORD})`,
          '--badge-ratio': `${QUFI_WORD_SIZE.width} / ${QUFI_WORD_SIZE.height}`,
        } as React.CSSProperties
      }
    >
      <div className="reader-bar">
        <p className="reader-where">
          {state === 'ready' ? (
            <>
              Page <b>{at}</b> of {paper.pages}
            </>
          ) : state === 'loading' ? (
            'Opening…'
          ) : (
            'None'
          )}
        </p>

        <div className="reader-controls">
          <button
            type="button"
            className="reader-step"
            onClick={() => goto(Math.max(1, at - 1))}
            disabled={state !== 'ready' || at <= 1}
            aria-label="Previous page"
          >
            <i className="reader-arrow reader-arrow-up" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="reader-step"
            onClick={() => goto(Math.min(paper.pages, at + 1))}
            disabled={state !== 'ready' || at >= paper.pages}
            aria-label="Next page"
          >
            <i className="reader-arrow" aria-hidden="true" />
          </button>
          {/*
            Light or dark, whichever the reader wants.
            
            The inversion is a CSS filter rather than a second render: hue is
            rotated back after the lightness is flipped, so the ground turns
            white and the type black while the diagrams keep the colours they
            were drawn in. Doing the same thing honestly, pixel by pixel, would
            mean processing fifty million pixels across twelve pages, and the
            filter runs on the GPU for nothing.
          */}
          <button
            type="button"
            className="reader-flip"
            onClick={() => setFlipped((was) => !was)}
            aria-pressed={flipped}
          >
            {flipped ? 'Dark pages' : 'Light pages'}
          </button>

          <button
            type="button"
            className="reader-wide"
            onClick={() => setWide((was) => !was)}
            aria-pressed={wide}
          >
            {wide ? 'Fit width' : 'Full width'}
          </button>
        </div>
      </div>

      {/*
        The pages. `user-select: none` and the drag guard are here rather than
        in the stylesheet alone because a canvas can be dragged out of the page
        and dropped into a folder, which is a download by another name.
      */}
      <div
        className="reader-pages"
        ref={hold}
        onDragStart={(event) => event.preventDefault()}
      />

      {state === 'loading' ? (
        <p className="reader-say">Rendering {paper.pages} pages…</p>
      ) : null}

      {state === 'missing' ? (
        <p className="reader-say">
          This document is not on the server. The data room knows about it; the file has not
          been placed on the host yet.
        </p>
      ) : null}

      {state === 'broken' ? (
        <p className="reader-say">This document could not be opened.</p>
      ) : null}

      {state === 'ready' ? (
        <p className="reader-note">
          Shown in the browser and not offered for download. Confidential and proprietary.
        </p>
      ) : null}
    </div>
  );
}
