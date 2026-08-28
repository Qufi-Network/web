'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { QufiMark } from '../overlay/QufiMark';
import { QUFI_WORD, QUFI_WORD_SIZE } from '../../assets/word';
import { SiteLinks } from '../overlay/SiteLinks';

/**
 * A page that is not the network.
 *
 * Two things on this site are documents rather than places, and they are held
 * apart from the environment on purpose: the network is one continuous thing,
 * and cutting a page into it would put a document in the middle of a location.
 * So these are real routes with real scrolling, wearing the same mark, the same
 * type and the same near-black — and carrying the same three controls the
 * network carries, in the same corner, so moving between the three places is
 * one gesture from any of them.
 *
 * The shell is here and the content is passed in, so a section is a heading and
 * some markup rather than a layout decision.
 */
export function DocPage({
  index,
  title,
  lede,
  children,
}: {
  /** Two-digit mark, in the same register as the network coordinates. */
  index: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  useEffect(() => {
    /*
     * The environment owns the viewport and the stylesheet says so, because
     * there is nothing to scroll inside it. A document has to undo that for as
     * long as it is on screen, and put it back on the way out — otherwise
     * returning to the network leaves the body scrollable behind a fixed canvas
     * and the wheel starts moving the page instead of the camera.
     */
    document.documentElement.dataset.page = 'document';
    return () => {
      delete document.documentElement.dataset.page;
    };
  }, []);

  return (
    <div className="doc">
      <header className="doc-top">
        <Link className="doc-mark" href="/" aria-label="Back to the QuFi network">
          <QufiMark variant="corner" shown />
          <img
            className="hud-mark-word"
            src={QUFI_WORD}
            alt=""
            width={QUFI_WORD_SIZE.width}
            height={QUFI_WORD_SIZE.height}
          />
        </Link>

        <SiteLinks />
      </header>

      <main className="doc-body">
        <p className="doc-eyebrow">
          <b>{index}</b>
          {title}
        </p>
        <h1 className="doc-title">{title}</h1>
        {lede ? <p className="doc-lede">{lede}</p> : null}
        {children}
      </main>

    </div>
  );
}
