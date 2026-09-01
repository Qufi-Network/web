import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocCard } from '../../../../components/site/dataroom/DocCard';
import { SECTIONS, docsIn, findSection } from '../../../../components/site/dataroom/catalogue';

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

/**
 * One section of the room.
 *
 * A heading, what the section is for, and every document in it as a card. No
 * cleverness: a reader who has clicked into a section wants the list.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const section = findSection(id);
  if (!section) notFound();
  const docs = docsIn(section.id);

  return (
    <>
      <header className="room-head">
        <p className="room-eyebrow">
          <b>{section.index}</b> Section
        </p>
        <h1 className="room-head-title">{section.title}</h1>
        <p className="room-head-lede">{section.lede}</p>
        <p className="room-head-count">
          {docs.length} {docs.length === 1 ? 'document' : 'documents'}
        </p>
      </header>

      <div className="room-cards">
        {docs.map((doc) => (
          <DocCard key={doc.id} doc={doc} />
        ))}
      </div>
    </>
  );
}
