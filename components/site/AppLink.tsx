'use client';

import { UBTC_MARK } from '../../assets/ubtc-mark';

/**
 * The door into the running application.
 *
 * Everything else on a product page describes something; this is the thing
 * itself, so it is allowed to be the brightest object on the page. It carries
 * the product's own mark rather than a chevron, and it glows — gently, on a
 * slow breath, and harder when it is reached for — because a visitor scanning
 * the page should find it without reading anything.
 *
 * Opens in its own tab: the walk they are on is a place, and sending them out
 * of it without a way back would be taking the page away from them.
 */
export function AppLink({
  href,
  label,
  note,
  tone,
  tabIndex,
}: {
  href: string;
  label: string;
  note: string;
  tone: string;
  tabIndex?: number;
}) {
  return (
    <a
      className="applink"
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      tabIndex={tabIndex}
      style={{ '--tone': tone } as React.CSSProperties}
    >
      <span className="applink-mark" aria-hidden="true">
        <img src={UBTC_MARK} alt="" width={224} height={224} />
      </span>

      <span className="applink-words">
        <span className="applink-label">{label}</span>
        <span className="applink-note">{note}</span>
      </span>

      <span className="applink-go" aria-hidden="true">
        app.ub.tc
        <i />
      </span>
    </a>
  );
}
