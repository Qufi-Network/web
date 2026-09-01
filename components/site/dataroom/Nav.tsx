'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { SECTIONS, docsIn } from './catalogue';

/**
 * The way around the room.
 *
 * Persistent down the left on a wide screen, and a disclosure at the top of the
 * page on a narrow one — a fixed sidebar on a phone is a sidebar covering the
 * thing you came to read.
 *
 * Every section carries its document count. A reader deciding where to go next
 * is better served by knowing that Technology holds five and Legal holds three
 * than by finding out after the click.
 */
export function DataRoomNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const here = (href: string) => path === href;

  return (
    <nav className="room-nav" data-open={String(open)} aria-label="Data room">
      <button
        type="button"
        className="room-nav-toggle"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
      >
        <span>Contents</span>
        <i aria-hidden="true" />
      </button>

      {/*
        Two boxes rather than one.

        The disclosure closes by taking its row from `1fr` to `0fr`, and a grid
        told to have one row and given four children puts the other three in
        implicit rows that are sized to their content — so the list stayed five
        hundred pixels tall while "closed". The inner box is the single child
        that row actually collapses.
      */}
      <div className="room-nav-body">
        <div className="room-nav-inner">
          <p className="room-nav-eyebrow">QuFi data room</p>

          <ul className="room-nav-list">
            <li>
              <Link href="/data-room" data-here={String(here('/data-room'))} onClick={() => setOpen(false)}>
                Overview
              </Link>
            </li>
            <li>
              <Link
                href="/data-room/start"
                data-here={String(here('/data-room/start'))}
                onClick={() => setOpen(false)}
              >
                Start here
              </Link>
            </li>
          </ul>

          <ul className="room-nav-list room-nav-sections">
            {SECTIONS.map((section) => {
              const href = `/data-room/section/${section.id}`;
              return (
                <li key={section.id}>
                  <Link href={href} data-here={String(here(href))} onClick={() => setOpen(false)}>
                    <b>{section.index}</b>
                    <span>{section.title}</span>
                    <i>{docsIn(section.id).length}</i>
                  </Link>
                </li>
              );
            })}
          </ul>

          <ul className="room-nav-list room-nav-tail">
            <li>
              <Link
                href="/data-room/search"
                data-here={String(here('/data-room/search'))}
                onClick={() => setOpen(false)}
              >
                Search
              </Link>
            </li>
            <li>
              <Link href="/" onClick={() => setOpen(false)}>
                Back to the network
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
