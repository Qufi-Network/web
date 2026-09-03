import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Viewer } from '../../../../components/site/dataroom/Viewer';
import { findDoc, findSection } from '../../../../components/site/dataroom/catalogue';
import { PAPERS, paperFor } from '../../../../components/site/dataroom/papers';

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
 * A paper, on its own page.
 *
 * Given the whole width rather than shown inside the document page, because a
 * twelve-page deck read in a column beside a navigation is a deck nobody
 * finishes. The way back is the crumb at the top, which is also the way back
 * to everything the room knows about the thing being read.
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
          <Link href="/data-room">Data room</Link>
          <i aria-hidden="true">/</i>
          {section ? (
            <Link href={`/data-room/section/${section.id}`}>
              {section.index} {section.title}
            </Link>
          ) : null}
          <i aria-hidden="true">/</i>
          <Link href={`/data-room/document/${doc.id}`}>{doc.title}</Link>
        </p>

        <h1 className="read-paper-title">{doc.title}</h1>
      </header>

      <Viewer id={id} paper={paper} title={doc.title} />

      {/*
        The end of the document.

        The bar at the top carries the page count and the steps, and it is
        sticky — but a reader who has scrolled past the last page has finished,
        and finishing should offer somewhere to go rather than a blank screen
        and a scroll back up.
      */}
      <footer className="read-paper-end">
        <p className="read-paper-end-say">End of {doc.title}</p>
        <div className="read-paper-end-go">
          <Link href={`/data-room/document/${doc.id}`}>
            <i aria-hidden="true" />
            What this document is
          </Link>
          {section ? (
            <Link href={`/data-room/section/${section.id}`}>
              <i aria-hidden="true" />
              {section.index} {section.title}
            </Link>
          ) : null}
          <Link href="/data-room">
            <i aria-hidden="true" />
            The data room
          </Link>
        </div>
      </footer>
    </article>
  );
}
