'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { QUFI_MARK } from '../../assets/mark';
import { QUFI_WORD, QUFI_WORD_SIZE } from '../../assets/word';

/**
 * The header and footer of the standard site.
 *
 * ## The mark on white
 *
 * Both pieces of QuFi artwork are white-on-transparent, drawn for a near-black
 * background. Placed on this site they would be invisible. They are used as
 * masks over a solid fill instead, so the letterforms stay exact and the ink
 * is a colour rather than a second asset — which also means the mark can go
 * blue in the header and grey in the footer without shipping two more PNGs.
 *
 * ## The way back
 *
 * Every page carries a link to the same page in the environment, because a
 * visitor who chose the site at the door and then wants to see the network
 * should not have to go back to the door and start again. `/classic/product/vault`
 * knows it is `/product/vault` over there.
 */

const NAV = [
  { href: '/classic/product', label: 'Products' },
  { href: '/classic/data-room', label: 'Data room' },
];

export function ClassicHeader() {
  const path = usePathname() ?? '/classic';
  const [away, setAway] = useState(false);
  const [open, setOpen] = useState(false);

  /* A route change closes the menu. Leaving it open over the new page is a bug
     that only shows up on a phone, where the menu covers the page. */
  useEffect(() => {
    setOpen(false);
  }, [path]);

  /* A small shadow, but only once the page has actually moved. */
  useEffect(() => {
    const onScroll = () => setAway(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The same place, in the other site. `/classic` itself maps to the door.
  const overThere = path === '/classic' ? '/' : path.replace(/^\/classic/, '');

  return (
    <header className="cx-top" data-away={String(away)}>
      <div className="cx-top-in">
        <Link className="cx-brand" href="/classic" aria-label="QuFi">
          <span className="cx-brand-mark" style={{ '--art': `url(${QUFI_MARK})` } as React.CSSProperties} />
          <span
            className="cx-brand-word"
            style={
              {
                '--art': `url(${QUFI_WORD})`,
                '--ratio': `${QUFI_WORD_SIZE.width} / ${QUFI_WORD_SIZE.height}`,
              } as React.CSSProperties
            }
          />
        </Link>

        <nav className="cx-nav" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-here={String(path === item.href || path.startsWith(`${item.href}/`))}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="cx-top-go">
          <Link className="cx-switch" href={overThere}>
            <i aria-hidden="true" />
            <span>Living network</span>
          </Link>
          <a className="cx-app" href="https://app.ub.tc" target="_blank" rel="noreferrer noopener">
            Open uBTC
          </a>
        </div>

        {/*
          On a phone the four controls above do not fit, and squeezing them
          produced a header where the application link ran off the right of the
          screen and "Data room" wrapped onto two lines. Below the breakpoint
          they fold into this instead.
        */}
        <button
          type="button"
          className="cx-burger"
          aria-expanded={open}
          aria-controls="cx-menu"
          onClick={() => setOpen((was) => !was)}
        >
          <span className="cx-burger-lines" aria-hidden="true">
            <i />
            <i />
          </span>
          <span className="cx-burger-say">{open ? 'Close' : 'Menu'}</span>
        </button>
      </div>

      <div className="cx-menu" id="cx-menu" data-open={String(open)}>
        <div className="cx-menu-in">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-here={String(path === item.href || path.startsWith(`${item.href}/`))}
            >
              {item.label}
            </Link>
          ))}

          <Link className="cx-menu-switch" href={overThere}>
            <i aria-hidden="true" />
            Living network
          </Link>

          <a
            className="cx-menu-app"
            href="https://app.ub.tc"
            target="_blank"
            rel="noreferrer noopener"
          >
            Open uBTC
          </a>
        </div>
      </div>
    </header>
  );
}

export function ClassicFooter() {
  return (
    <footer className="cx-foot">
      <div className="cx-foot-in">
        <div className="cx-foot-brand">
          <span className="cx-brand-mark" style={{ '--art': `url(${QUFI_MARK})` } as React.CSSProperties} />
          <p>
            The verification layer for the post-quantum economy. Verify before value moves.
          </p>
        </div>

        <nav className="cx-foot-nav" aria-label="Footer">
          <div>
            <h2>Products</h2>
            <Link href="/classic/product/ubtc">uBTC</Link>
            <Link href="/classic/product/settle">Quantum Settle</Link>
            <Link href="/classic/product/vault">Quantum Vault</Link>
            <Link href="/classic/product/nodes">Quantum Node Network</Link>
          </div>
          <div>
            <h2>Data room</h2>
            <Link href="/classic/data-room">Overview</Link>
            <Link href="/classic/data-room/start">Start here</Link>
            <Link href="/classic/data-room/search">Search</Link>
          </div>
          <div>
            <h2>Elsewhere</h2>
            <Link href="/">The living network</Link>
            <a href="https://app.ub.tc" target="_blank" rel="noreferrer noopener">
              The uBTC application
            </a>
          </div>
        </nav>
      </div>

      <p className="cx-foot-fine">
        QuFi Network. Nothing on this site is a measurement: the figures describe what the
        architecture is, not what a running network is currently doing.
      </p>
    </footer>
  );
}
