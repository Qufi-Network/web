import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchPage } from '../../../components/site/dataroom/Search';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: false },
};

/**
 * Searching the room.
 *
 * The query arrives in the URL so a result set can be sent to somebody, which
 * is why this reads it here and hands it down rather than holding it in state
 * alone.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <>
      <header className="room-head">
        <p className="room-eyebrow">Search</p>
        <h1 className="room-head-title">Find anything in the room</h1>
        <p className="room-head-lede">
          The index covers document titles, descriptions, topics, planned contents and what each
          document says a reader will discover. The documents themselves are still being
          written, so their text is not searchable yet.
        </p>
      </header>

      <Suspense fallback={null}>
        <SearchPage initialQuery={q ?? ''} />
      </Suspense>
    </>
  );
}
