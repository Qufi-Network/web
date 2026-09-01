'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DataRoomGlyph, NetworkGlyph, ProductGlyph } from '../site/Glyph';

/**
 * The three places this site has.
 *
 * Everything else in this interface moves the camera; these leave. That
 * difference has to be visible before it is clicked, so they are the only
 * controls on the page with an edge around them — a thin frame that takes on
 * the subject's own colour on approach, in the same geometry and the same
 * palette as everything behind it.
 *
 * They are real links to real routes rather than another state of the scene:
 * the network is one continuous thing and cutting a document into it would put
 * a page in the middle of a place. The network itself is in the row too, so the
 * same three controls sit in the same corner wherever the visitor is, and the
 * one they are already on says so rather than pretending to be a way somewhere.
 */

/**
 * The colours are the one-pager's own.
 *
 * Verification is cyan there, post-quantum signing is green and held assets are
 * gold, on every diagram it draws. Carrying the same three here means the row
 * is legible as part of the same material rather than as a set of tabs that
 * happen to sit above it.
 */
export const SITE_LINKS = [
  { href: '/', label: 'Network', Glyph: NetworkGlyph, tone: '#4CC9FF' },
  { href: '/product', label: 'Products', Glyph: ProductGlyph, tone: '#3BE08F' },
  { href: '/data-room', label: 'Data room', Glyph: DataRoomGlyph, tone: '#FFB03A' },
] as const;

export function SiteLinks({ tabbable = true }: { tabbable?: boolean }) {
  const path = usePathname();

  return (
    <nav className="links" aria-label="QuFi">
      {SITE_LINKS.map(({ href, label, Glyph, tone }) => {
        /*
         * A section of the site, not one page of it.
         *
         * Exact matching lit the control only on `/product` and `/data-room`
         * themselves, so walking into a product or opening a document took the
         * highlight away — the row said the visitor was nowhere at exactly the
         * moment they were deepest in.
         */
        const here = path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            className="link"
            href={href}
            style={{ '--tone': tone } as React.CSSProperties}
            data-here={String(here)}
            aria-current={here ? 'page' : undefined}
            tabIndex={tabbable ? 0 : -1}
          >
            <span className="link-face" aria-hidden="true">
              <Glyph />
            </span>
            {/*
              The label is the name on a desk and the accessible name everywhere:
              three of these will not fit across a phone with their words
              attached, so the words are hidden and the name is carried by the
              element instead of by what is drawn.
            */}
            <span className="link-label">{label}</span>
            <span className="sr-only">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
