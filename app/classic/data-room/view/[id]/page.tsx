import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Viewer } from '../../../../../components/site/dataroom/Viewer';
import { findDoc, findSection } from '../../../../../components/site/dataroom/catalogue';
import { PAPERS, paperFor } from '../../../../../components/site/dataroom/papers';

export function generateStaticParams() {
  return PAPERS.map((paper) => ({ id: paper.doc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const doc = findDoc(id);
  return {
    title: doc ? doc.title : 'Document',
    robots: { index: false, follow: false, nocache: true },
  };
}

/**
 * A paper, on the standard site.
 *
 * The viewer itself is the same component either side: pages drawn onto
 * canvases by pdf.js, no toolbar, nothing that hands over the file. Only the
 * frame around it changes.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = findDoc(id);
  const paper = paperFor(id);
  if (!doc || !paper) notFound();

  const section = findSection(doc.section);

  return (
    <article className="read-paper">
      <header className="read-paper-top">
        <p className="paper-crumbs">
          <Link href="/classic/data-room">Data room</Link>
          <i aria-hidden="true">/</i>
          {section ? (
            <Link href={`/classic/data-room/section/${section.id}`}>
              {section.index} {section.title}
            </Link>
          ) : null}
          <i aria-hidden="true">/</i>
          <Link href={`/classic/data-room/document/${doc.id}`}>{doc.title}</Link>
        </p>

        <h1 className="read-paper-title">{doc.title}</h1>
      </header>

      <Viewer id={id} paper={paper} title={doc.title} light />

      <footer className="read-paper-end">
        <p className="read-paper-end-say">End of {doc.title}</p>
        <div className="read-paper-end-go">
          <Link href={`/classic/data-room/document/${doc.id}`}>
            <i aria-hidden="true" />
            What this document is
          </Link>
          {section ? (
            <Link href={`/classic/data-room/section/${section.id}`}>
              <i aria-hidden="true" />
              {section.index} {section.title}
            </Link>
          ) : null}
          <Link href="/classic/data-room">
            <i aria-hidden="true" />
            The data room
          </Link>
        </div>
      </footer>
    </article>
  );
}
