import Link from 'next/link';
import type { Paper } from './papers';

/**
 * The way into a paper that exists.
 *
 * Most of the room is documents that have not been written, and this control
 * is the difference. It is built like the door into the uBTC application — the
 * one bright object on a page of quiet ones — because it is the same kind of
 * thing: everything around it describes something, and this opens it.
 *
 * The icon is a page with its corner turned and the QuFi mark cut out of it,
 * drawn rather than set in a font so it carries the site's line weight instead
 * of somebody else's.
 */
export function ViewButton({
  id,
  paper,
  tone = '#4CC9FF',
  base = '',
}: {
  id: string;
  paper: Paper;
  tone?: string;
  base?: string;
}) {
  return (
    <Link
      className="viewbtn"
      href={`${base}/data-room/view/${id}`}
      style={{ '--tone': tone } as React.CSSProperties}
    >
      <span className="viewbtn-icon" aria-hidden="true">
        <svg viewBox="0 0 32 40" fill="none">
          {/* The sheet, with its corner folded. */}
          <path
            d="M2 3.2A1.2 1.2 0 0 1 3.2 2h16.4L30 12.4v24.4a1.2 1.2 0 0 1-1.2 1.2H3.2A1.2 1.2 0 0 1 2 36.8V3.2Z"
            className="viewbtn-sheet"
          />
          <path d="M19.6 2v9.2a1.2 1.2 0 0 0 1.2 1.2H30" className="viewbtn-fold" />
          {/* The mark, small, sitting in the sheet. */}
          <circle cx="16" cy="24" r="6.2" className="viewbtn-mark" />
          <path d="M20.2 28.2 24 32" className="viewbtn-mark" />
        </svg>
      </span>

      <span className="viewbtn-words">
        <span className="viewbtn-label">View the document</span>
        <span className="viewbtn-note">
          {paper.pages} {paper.pages === 1 ? 'page' : 'pages'} · opens in the browser · not
          downloadable
        </span>
      </span>

      <span className="viewbtn-go" aria-hidden="true">
        Open
        <i />
      </span>
    </Link>
  );
}
