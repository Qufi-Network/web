import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Status } from '../../../../components/site/dataroom/Status';
import { DocCard } from '../../../../components/site/dataroom/DocCard';
import {
  DOCUMENTS,
  STATUS_MEANS,
  findDoc,
  findSection,
} from '../../../../components/site/dataroom/catalogue';

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

/**
 * One document.
 *
 * What it is, how far along it is, what a reader will get from it, what it
 * covers, and what to read alongside it.
 *
 * Where the document has not been written, the page says so and then does the
 * most useful thing available: it shows the reader exactly what will be in it.
 * That is worth something on its own — an institution can tell from this page
 * whether the finished document will answer their question — and it is honest,
 * which invented content would not be.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = findDoc(id);
  if (!doc) notFound();

  const section = findSection(doc.section);
  const related = (doc.related ?? []).map(findDoc).filter(Boolean);
  const written = doc.status === 'complete';

  return (
    <article className="paper">
      <header className="paper-head">
        <p className="paper-crumbs">
          <Link href="/data-room">Data room</Link>
          <i aria-hidden="true">/</i>
          {section ? (
            <Link href={`/data-room/section/${section.id}`}>
              {section.index} {section.title}
            </Link>
          ) : null}
        </p>

        <h1 className="paper-title">{doc.title}</h1>

        <dl className="paper-meta">
          <div>
            <dt>Type</dt>
            <dd>{doc.kind}</dd>
          </div>
          <div>
            <dt>Section</dt>
            <dd>{section ? `${section.index} — ${section.title}` : '—'}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <Status status={doc.status} />
            </dd>
          </div>
          {/*
            Version and reading time are facts about a document, and there is no
            document to have them until it is written. Printing "Not yet issued"
            and "Not yet written" in two of the five boxes filled the strip with
            absence; the status chip beside them already says as much, once.
          */}
          {written ? (
            <>
              <div>
                <dt>Version</dt>
                <dd>1.0</dd>
              </div>
              <div>
                <dt>Reading time</dt>
                <dd>&mdash;</dd>
              </div>
            </>
          ) : (
            <div>
              <dt>Topics</dt>
              <dd>{doc.topics.length}</dd>
            </div>
          )}
        </dl>

        <p className="paper-status-note">{STATUS_MEANS[doc.status]}</p>
      </header>

      <section className="paper-block">
        <h2>What this document is</h2>
        <p className="paper-desc">{doc.description}</p>
        {doc.purpose ? <p className="paper-purpose">{doc.purpose}</p> : null}
      </section>

      <section className="paper-block">
        <h2>What you will discover</h2>
        <ul className="paper-discover">
          {doc.discover.map((line) => (
            <li key={line}>
              <i aria-hidden="true" />
              {line}
            </li>
          ))}
        </ul>
      </section>

      {doc.contents ? (
        <section className="paper-block">
          <h2>Planned contents</h2>
          <ol className="paper-contents">
            {doc.contents.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="paper-block">
        <h2>Key topics</h2>
        <p className="paper-topics">
          {doc.topics.map((topic) => (
            <Link key={topic} href={`/data-room/search?q=${encodeURIComponent(topic)}`}>
              {topic}
            </Link>
          ))}
        </p>
      </section>

      {/*
        What happens when the reader wants the document itself. Saying nothing
        here would leave them hunting for a download that does not exist.
      */}
      <section className="paper-block paper-get">
        <h2>The document</h2>
        {doc.status === 'confidential' ? (
          <p>
            Held outside this room and released individually as part of formal diligence. Ask
            for it directly.
          </p>
        ) : written ? (
          <p>Available on request while the room is being assembled.</p>
        ) : (
          <p>
            Not written yet. This page is the specification for it: the description, what a
            reader will find in it, and — where the structure is settled — its contents. Ask if
            you need it sooner than it is coming.
          </p>
        )}
      </section>

      {related.length > 0 ? (
        <section className="paper-block">
          <h2>Read alongside</h2>
          <div className="room-cards">
            {related.map((other) => (
              <DocCard key={other!.id} doc={other!} showSection />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
