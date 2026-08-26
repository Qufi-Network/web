import type { Metadata } from 'next';
import { DocPage } from '../../components/site/DocPage';

export const metadata: Metadata = {
  title: 'Data room',
  robots: { index: false, follow: false },
};

/**
 * Data room.
 *
 * The shell is finished and the content is not. Two things are deliberate while
 * it is empty: the page says what it is for rather than pretending to hold it,
 * and it is marked not to be indexed — whatever ends up here is material that
 * should be reached deliberately rather than found.
 */
export default function Page() {
  return (
    <DocPage
      index="02"
      title="Data room"
      lede="Material held for people who have been given the address."
    >
      <section className="doc-section doc-pending">
        <h2>In preparation</h2>
        <p>
          The contents of this room are being assembled and will be placed here. Until then there is
          nothing behind this page.
        </p>
      </section>

      <section className="doc-section">
        <h2>Access</h2>
        <p>
          This page is not indexed and is not linked from anywhere except the network itself. If you
          were sent here and expected to find something, it has not been published yet.
        </p>
      </section>
    </DocPage>
  );
}
