import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RoomSearch } from '../../../../components/site/dataroom/views';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <Suspense fallback={null}>
      <RoomSearch q={q} base="/classic" />
    </Suspense>
  );
}
