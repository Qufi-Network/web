import type { Metadata } from 'next';
import { Journey } from '../../../components/site/dataroom/Journey';

export const metadata: Metadata = {
  title: 'Start here',
  robots: { index: false, follow: false },
};

/**
 * The recommended way in.
 *
 * Five documents in the order that builds understanding fastest. Somebody who
 * reads these in sequence should be able to hold the whole of QuFi in their
 * head: the opportunity, the products, the shape, the mechanism, the detail.
 */
export default function Page() {
  return (
    <>
      <header className="room-head">
        <p className="room-eyebrow">Start here</p>
        <h1 className="room-head-title">A reading order</h1>
        <p className="room-head-lede">
          If you have twenty minutes and have not heard of QuFi before, read these five in this
          order.
        </p>
      </header>

      <Journey full />
    </>
  );
}
