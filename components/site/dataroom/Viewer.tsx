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
 * whole job is to be read. Four is where the smallest type in these three
 * papers is genuinely crisp rather than merely legible, and it is what the
 * loupe needs: magnifying two and a half times into a three-times render was
 * already stretching it slightly, and into a four-times render it is not.
 */
const OVERSAMPLE = 4;

/*
 * And a ceiling, because a canvas is memory.
 *
 * A page is held at four bytes a pixel, so this is sixty-four megabytes each
 * and twelve of them is most of a gigabyte at the very largest. The scale is
 * reduced for any page that would cross it, so a large screen gets the
 * sharpest render it can hold rather than the sharpest render that exists.
 */
const MAX_PIXELS = 16_000_000;

/**
 * Anything darker than this in a photograph patch is the card behind it.
 *
 * The portraits sit on a near-black panel. Skin, even in shadow, is far above
 * this; the panel is at or near zero.
 */
const GROUND = 34;

/**
 * How wide the loupe is in CSS pixels, how much larger it shows, and how many
 * pixels it keeps behind that.
 *
 * The glass is backed at three device pixels per CSS pixel of its own, so the
 * copy it takes out of the page is not itself the thing that softens.
 */
const LOUPE = 220;
const LOUPE_POWER = 2.5;
const LOUPE_DPR = 3;

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

  /*
   * How many pages the version actually open has.
   *
   * The manifest knows both counts, but the light papers are separate
   * documents rather than recoloured ones and can differ in length: the
   * memorandum is six pages dark and seven light. The readout follows what was
   * loaded.
   */
  const [total, setTotal] = useState(paper.pages);

  /*
   * A paper that exists in a light version does not need correcting.
   *
   * Where one exists the light view loads it and shows it as drawn: no filter,
   * no photograph patched back in, no lockup covered. The whole apparatus for
   * inverting only runs for the papers that have no light version yet.
   *
   * Both follow the site rather than a control. There was a switch here that
   * let a reader ask for the other treatment, and it was wrong in the one way
   * that mattered: pressing it on the living network loaded the white deck,
   * and pressing it on the standard site loaded the dark one. Each version
   * belongs to one site. The environment gets the deck as it was drawn, the
   * standard site gets the one drawn for a white page, and neither offers the
   * other.
   */
  const drawn = light && Boolean(paper.light);
  const corrected = light && !paper.light;

  const loupe = useRef<HTMLDivElement>(null);

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
          url: `/data-room/paper/${id}${drawn ? '?v=light' : ''}`,
          isEvalSupported: false,
        } as Parameters<typeof pdfjs.getDocument>[0]);
        const file = await task.promise;
        if (!alive) {
          file.destroy();
          return;
        }
        doc = file;
        setTotal(file.numPages);

        const width = hold.current?.clientWidth ?? 900;
        const made: Rendered[] = [];

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
           * The page, exactly as it was drawn.
           *
           * Our own mark was briefly painted over the lockup baked into each
           * deck, on the reasoning that inverting a white logo would spoil it.
           * It does not: `hue-rotate` puts the blue Q back where it was and the
           * white wordmark becomes a black one, which is the mark as it looks
           * on paper anywhere else. The overlay was solving a problem the
           * filter had already solved, and solving it worse.
           */
          const sheet = document.createElement('div');
          sheet.className = 'paper-sheet';
          sheet.appendChild(canvas);

          /*
           * The photographs, laid back over the top with their ground removed.
           *
           * Each one is cut out of the render and appended as its own element,
           * which the inversion does not touch: the filter is on the page's
           * canvas alone. That keeps the faces as faces, and it also kept the
           * near-black card they sit on, which put a black rectangle in the
           * middle of a white page. So anything close to black in the patch is
           * knocked out to white as it is laid down. The faces are nowhere near
           * that dark and the coloured hexagons around them survive it.
           */
          for (const box of corrected ? (paper.photos ?? []) : []) {
            if (box.page !== n) continue;

            const patch = document.createElement('canvas');
            patch.className = 'paper-keep';
            patch.width = Math.max(1, Math.round(canvas.width * box.w));
            patch.height = Math.max(1, Math.round(canvas.height * box.h));
            patch.style.left = `${box.x * 100}%`;
            patch.style.top = `${box.y * 100}%`;
            patch.style.width = `${box.w * 100}%`;
            patch.style.height = `${box.h * 100}%`;

            const cut = patch.getContext('2d', { willReadFrequently: true });
            if (!cut) continue;
            cut.drawImage(
              canvas,
              Math.round(canvas.width * box.x),
              Math.round(canvas.height * box.y),
              patch.width,
              patch.height,
              0,
              0,
              patch.width,
              patch.height,
            );

            const pixels = cut.getImageData(0, 0, patch.width, patch.height);
            const data = pixels.data;
            for (let i = 0; i < data.length; i += 4) {
              const lum = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
              if (lum < GROUND) {
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
              }
            }
            cut.putImageData(pixels, 0, 0);
            sheet.appendChild(patch);
          }

          /*
           * And the mark, over the lockup the deck carries in its corner.
           *
           * On a white ground, because that is what the page around it has
           * become. The artwork is used as a mask over a fill rather than
           * placed as a picture: the file is white-on-transparent, drawn for a
           * dark deck, so as an image it would be invisible here.
           */
          if (corrected && paper.logo) {
            /*
             * The deck's lockup is erased with the page's own ground, copied.
             *
             * A flat plate was tried twice: white, then a colour sampled from
             * one pixel beside it. Both showed as a rectangle, because the
             * ground under these logos is not flat. It is a near-black with a
             * slight gradient across it, and inverted, the difference between
             * one shade and its neighbour is the difference between white and
             * cream.
             *
             * So a strip of the same band is copied over the logo instead,
             * taken from the empty ground immediately to its right. It matches
             * exactly, gradient and all, because it is the same pixels. And it
             * happens on the canvas, so it is inverted along with the page and
             * needs no correction of its own.
             */
            const paint = canvas.getContext('2d');
            if (paint) {
              const bx = Math.round(canvas.width * paper.logo.x);
              const by = Math.round(canvas.height * paper.logo.y);
              const bw = Math.round(canvas.width * paper.logo.w);
              const bh = Math.round(canvas.height * paper.logo.h);
              // Far enough right to clear the lockup, and clamped in bounds.
              const from = Math.min(canvas.width - bw, bx + bw + Math.round(bw * 0.15));
              paint.drawImage(canvas, from, by, bw, bh, bx, by, bw, bh);
            }

            /*
             * And our mark over the space that leaves. No ground of its own:
             * the page's is already correct underneath it.
             */
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

          hold.current?.insertBefore(sheet, loupe.current);
          made.push({ page: n, width: natural.width, height: natural.height });
          setPages([...made]);
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
  }, [id, title, drawn]);

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

  /*
   * The loupe.
   *
   * A small canvas that follows the pointer and copies the region under it out
   * of the page at two and a half times the size. Because it is a copy from
   * the source bitmap rather than a scaled picture of the page, and because the
   * pages are rendered at three device pixels per CSS pixel, the magnified view
   * is still drawing roughly one device pixel per pixel: nothing softens.
   *
   * `drawImage` of a two-hundred-pixel square is a few microseconds, so this
   * runs on the pointer event and needs no frame loop.
   */
  const magnify = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const glass = loupe.current;
    const face = glass?.firstElementChild as HTMLCanvasElement | null;
    if (!glass || !face) return;

    /*
     * Which page is under the pointer, found by geometry.
     *
     * Not by asking the event what it hit: the pages carry
     * `pointer-events: none`, because a canvas can be dragged out of a page and
     * dropped into a folder, which is a download wearing a different coat. So
     * the pointer never lands on one and `event.target` is always the strip.
     * Twelve rectangle tests per move is nothing.
     */
    let page: HTMLCanvasElement | null = null;
    let box: DOMRect | null = null;
    for (const found of hold.current?.querySelectorAll('canvas.paper-page') ?? []) {
      const rect = found.getBoundingClientRect();
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        page = found as HTMLCanvasElement;
        box = rect;
        break;
      }
    }

    if (!page || !box) {
      glass.dataset.on = 'false';
      return;
    }
    const ctx = face.getContext('2d');
    if (!ctx) return;

    // Where the pointer is in the page's own pixels.
    const atX = ((event.clientX - box.left) / box.width) * page.width;
    const atY = ((event.clientY - box.top) / box.height) * page.height;

    // How much of the page one loupe-width covers.
    const shown = (LOUPE / box.width) * page.width / LOUPE_POWER;

    ctx.clearRect(0, 0, face.width, face.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      page,
      atX - shown / 2,
      atY - shown / 2,
      shown,
      shown,
      0,
      0,
      face.width,
      face.height,
    );

    // Renamed off `hold`, which is the ref for the strip and was being shadowed
    // by this local: the loop above then read a DOMRect and found no `current`.
    const strip = glass.parentElement?.getBoundingClientRect();
    if (strip) {
      glass.style.left = `${event.clientX - strip.left}px`;
      glass.style.top = `${event.clientY - strip.top}px`;
    }
    glass.dataset.on = 'true';
  }, []);

  const goto = useCallback((n: number) => {
    const target = hold.current?.querySelector(`canvas[data-page="${n}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div
      className="reader"
      data-state={state}
      data-light={String(light)}
      data-correct={String(corrected)}
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
              Page <b>{at}</b> of {total}
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
            onClick={() => goto(Math.min(total, at + 1))}
            disabled={state !== 'ready' || at >= total}
            aria-label="Next page"
          >
            <i className="reader-arrow" aria-hidden="true" />
          </button>
          {/*
            The loupe is a hover, so it has no control. This says it is there,
            because a magnifier nobody knows about is a magnifier nobody uses.
          */}
          <span className="reader-loupe-say" aria-hidden="true">
            <i />
            Hover to magnify
          </span>
        </div>
      </div>

      {/*
        The pages. `user-select: none` and the drag guard are here rather than
        in the stylesheet alone because a canvas can be dragged out of the page
        and dropped into a folder, which is a download by another name.
      */}
      {/*
        The pages scroll sideways once they are larger than the column, which
        is the only honest way to show a zoomed page: the alternative is to
        shrink it back to fit, which is what the reader just asked us not to do.
      */}
      <div
        className="reader-pages"
        ref={hold}
        onDragStart={(event) => event.preventDefault()}
        onPointerMove={magnify}
        onPointerLeave={() => {
          if (loupe.current) loupe.current.dataset.on = 'false';
        }}
      >
        {/*
          The glass. A sibling of the pages rather than a child of any one of
          them, so it can cross from one page to the next without being clipped,
          and so there is one of it rather than twelve.

          The ring is on the frame and the pixels are on the canvas inside it,
          because the light view inverts the canvas with a filter and a filter
          takes the element's shadow with it: the white ring came out black.
        */}
        <div className="reader-loupe" ref={loupe} data-on="false" aria-hidden="true">
          <canvas width={LOUPE * LOUPE_DPR} height={LOUPE * LOUPE_DPR} />
        </div>
      </div>

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
