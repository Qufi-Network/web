import type { Metadata } from 'next';
import { RoomDocument } from '../../../../../components/site/dataroom/views';
import { DOCUMENTS, findDoc } from '../../../../../components/site/dataroom/catalogue';

export function generateStaticParams() {
  return DOCUMENTS.map((doc) => ({ id: doc.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const doc = findDoc(id);
  return {
    title: doc ? doc.title : 'Data room',
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoomDocument id={id} base="/classic" />;
}
