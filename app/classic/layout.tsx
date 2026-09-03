import type { Metadata } from 'next';
import { QUFI_MARK } from '../../assets/mark';
import { ClassicFooter, ClassicHeader } from '../../components/classic/Chrome';
import { Quantum } from '../../components/classic/Quantum';

export const metadata: Metadata = {
  title: {
    default: 'QuFi: the verification layer for the post-quantum economy',
    template: '%s · QuFi',
  },
};

/**
 * The standard site.
 *
 * White, still, and made of the same content as the environment next door —
 * the products come out of the same catalogue, the capabilities out of the
 * same story file, the data room out of the same index. It is a different
 * telling rather than a second site, which is why almost nothing here is
 * content and almost all of it is arrangement.
 *
 * `cx` on every class, short for classic, so nothing in this stylesheet can
 * reach into the environment and nothing in the environment's four
 * stylesheets can reach in here.
 *
 * The mark is set here as a custom property and inherited by every card that
 * draws it on hover. It is a sixty-kilobyte data URI: set per card instead, a
 * page of a dozen of them would carry most of a megabyte of identical base64.
 */
export default function ClassicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="classic" style={{ '--mark': `url(${QUFI_MARK})` } as React.CSSProperties}>
      <a className="cx-skip" href="#cx-main">
        Skip to content
      </a>

      {/*
        One quiet network behind the whole site.
        
        The sections used to be told apart by alternating tints and a hairline
        at every seam, which on a white site reads as a stack of boxes rather
        than a page. The bands and the borders are gone; what separates one
        section from the next is space, and what fills the space is this.
      */}
      <div className="cx-field" aria-hidden="true">
        <Quantum />
      </div>
      <ClassicHeader />
      <main className="cx-main" id="cx-main">
        {children}
      </main>
      <ClassicFooter />
    </div>
  );
}
