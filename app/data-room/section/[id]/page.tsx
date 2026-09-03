import type { Metadata } from 'next';
import { RoomSection } from '../../../../components/site/dataroom/views';
import { SECTIONS, findSection } from '../../../../components/site/dataroom/catalogue';

export function generateStaticParams() {
  return SECTIONS.map((section) => ({ id: section.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const section = findSection(id);
  return {
    title: section ? section.title : 'Data room',
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoomSection id={id} />;
}
