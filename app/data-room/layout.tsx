import Link from 'next/link';
import { QUFI_MARK } from '../../assets/mark';
import { DataRoomNav } from '../../components/site/dataroom/Nav';
import { SiteLinks } from '../../components/overlay/SiteLinks';
import { QufiMark } from '../../components/overlay/QufiMark';
import { QUFI_WORD, QUFI_WORD_SIZE } from '../../assets/word';

/**
 * The room itself.
 *
 * One shell for every page under `/data-room`: the site's own header, a
 * persistent list of contents down the left, and the page in the middle. The
 * nav is here rather than on each page so that moving between sections never
 * costs the reader their place in the structure.
 *
 * The mark is set here as a custom property and inherited by everything that
 * draws it. It is a sixty-kilobyte data URI: put on each card instead, a page
 * of thirty-six of them would carry two megabytes of identical base64.
 */
export default function DataRoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="room" style={{ '--mark': `url(${QUFI_MARK})` } as React.CSSProperties}>
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

      <div className="room-frame">
        <DataRoomNav />
        <main className="room-main">{children}</main>
      </div>
    </div>
  );
}
