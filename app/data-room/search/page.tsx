import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RoomSearch } from '../../../components/site/dataroom/views';

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
    <Suspense fallback={null}>
      <RoomSearch q={q} />
    </Suspense>
  );
}
