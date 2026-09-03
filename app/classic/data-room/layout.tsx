import { QUFI_MARK } from '../../../assets/mark';
import { DataRoomNav } from '../../../components/site/dataroom/Nav';

/**
 * The room, on the standard site.
 *
 * The same shell as the environment's: contents down the left, the page in the
 * middle. What differs is only that this one sits inside the site's own header
 * and footer rather than carrying its own, and that everything in it is drawn
 * light instead of dark.
 *
 * `cx-room` is the hook the stylesheet uses to repaint the whole room. Every
 * class inside it is the room's own, shared with the environment, so the two
 * can never drift apart in structure while looking nothing alike.
 */
export default function ClassicRoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="cx-room room"
      style={{ '--mark': `url(${QUFI_MARK})` } as React.CSSProperties}
    >
      <div className="room-frame">
        <DataRoomNav base="/classic" />
        <main className="room-main">{children}</main>
      </div>
    </div>
  );
}
