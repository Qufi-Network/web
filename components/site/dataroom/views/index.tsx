import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DocCard } from '../DocCard';
import { Journey } from '../Journey';
import { SearchBar, SearchPage } from '../Search';
import { Status } from '../Status';
import { ViewButton } from '../ViewButton';
import {
  SECTIONS,
  STATUS_MEANS,
  docsIn,
  findDoc,
  findSection,
  roomStats,
} from '../catalogue';
import { PAPERS, paperFor } from '../papers';

/**
 * The room, once.
 *
 * Every page under `/data-room` exists twice, in the environment and on the
 * standard site, and the two must never drift because they are the same
 * thirty-six documents. So the pages themselves live here and the route files
 * on either side do nothing but render one of these with a prefix.
 *
 * `base` is that prefix: empty in the environment, `/classic` on the site. It
 * is threaded rather than read from context because most of these are server
 * components, and context does not cross that line.
 */

export function RoomOverview({ base = '', people }: { base?: string; people?: React.ReactNode }) {
  const stats = roomStats();

  return (
    <>
      <section className="room-hero">
        <p className="room-eyebrow">QuFi data room</p>
        <h1 className="room-title">
          Institutional intelligence for the future of verified global value.
        </h1>
        <p className="room-lede">
          Explore the technology, products, architecture and strategy behind QuFi: a
          post-quantum, policy-governed verification infrastructure designed to establish
          cryptographic certainty before value moves.
        </p>

        <dl className="room-stats">
          <div>
            <dt>Documents</dt>
            <dd>{stats.documents}</dd>
          </div>
          <div>
            <dt>Sections</dt>
            <dd>{stats.sections}</dd>
          </div>
          <div>
            <dt>Technology papers</dt>
            <dd>{stats.technology}</dd>
          </div>
          <div>
            <dt>Product documents</dt>
            <dd>{stats.product}</dd>
          </div>
          <div>
            <dt>Ready to read</dt>
            <dd>{PAPERS.length}</dd>
          </div>
        </dl>

        <p className="room-note">
          The library is being assembled. Every document below carries its status, and one that
          has not been written says so rather than showing you something that was. The documents
          that are finished open in the browser and are not offered for download.
        </p>
      </section>

      <SearchBar base={base} />

      {/* The environment draws the team as hexagons; the site draws portraits. */}
      {people}

      <section className="room-section" id="start">
        <p className="room-section-eyebrow">Start here</p>
        <h2 className="room-section-title">A reading order</h2>
        <p className="room-section-lede">
          Five documents, in the order that builds understanding fastest: what the opportunity
          is, what is being built, how it is put together, how it works, and then the whole of it
          in technical detail.
        </p>
        <Journey base={base} />
      </section>

      <section className="room-section">
        <p className="room-section-eyebrow">Contents</p>
        <h2 className="room-section-title">Nine sections</h2>

        <div className="room-sections">
          {SECTIONS.map((section) => {
            const docs = docsIn(section.id);
            return (
              <Link
                key={section.id}
                className="room-section-card"
                href={`${base}/data-room/section/${section.id}`}
              >
                <span className="section-card-index">{section.index}</span>
                <span className="section-card-title">{section.title}</span>
                <span className="section-card-lede">{section.lede}</span>
                <span className="section-card-count">
                  {docs.length} {docs.length === 1 ? 'document' : 'documents'}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="room-section">
        <p className="room-section-eyebrow">Access</p>
        <h2 className="room-section-title">About this room</h2>
        <p className="room-section-lede">
          This page is not indexed and is not linked from anywhere except the network itself.
          Documents marked confidential are released individually rather than held here.
        </p>

        <div className="room-recent">
          <DocCard doc={findDoc('technical-whitepaper')!} showSection base={base} />
          <DocCard doc={findDoc('investor-memorandum')!} showSection base={base} />
        </div>
      </section>
    </>
  );
}

export function RoomStart({ base = '' }: { base?: string }) {
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

      <Journey full base={base} />
    </>
  );
}

export function RoomSection({ id, base = '' }: { id: string; base?: string }) {
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
          <DocCard key={doc.id} doc={doc} base={base} />
        ))}
      </div>
    </>
  );
}

/**
 * One document.
 *
 * What it is, how far along it is, what a reader will get from it, what it
 * covers, and what to read alongside it.
 *
 * Where the document has not been written, the page says so and then does the
 * most useful thing available: it shows the reader exactly what will be in it.
 * That is worth something on its own, because an institution can tell from
 * this page whether the finished document will answer their question, and it
 * is honest, which invented content would not be.
 */
export function RoomDocument({ id, base = '' }: { id: string; base?: string }) {
  const doc = findDoc(id);
  if (!doc) notFound();

  const section = findSection(doc.section);
  const related = (doc.related ?? []).map(findDoc).filter(Boolean);
  const written = doc.status === 'complete';
  const paper = paperFor(doc.id);

  return (
    <article className="paper">
      <header className="paper-head">
        <p className="paper-crumbs">
          <Link href={`${base}/data-room`}>Data room</Link>
          <i aria-hidden="true">/</i>
          {section ? (
            <Link href={`${base}/data-room/section/${section.id}`}>
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
            <dd>{section ? `${section.index} · ${section.title}` : 'None'}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <Status status={doc.status} />
            </dd>
          </div>
          {paper ? (
            <>
              <div>
                <dt>Length</dt>
                <dd>{paper.pages} pages</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>View only</dd>
              </div>
            </>
          ) : written ? (
            <>
              <div>
                <dt>Version</dt>
                <dd>1.0</dd>
              </div>
              <div>
                <dt>Reading time</dt>
                <dd>Not measured</dd>
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
            <Link key={topic} href={`${base}/data-room/search?q=${encodeURIComponent(topic)}`}>
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
        {paper ? (
          <>
            <p>
              Written and in the room. It opens in the browser and is not offered for download.
            </p>
            <ViewButton id={doc.id} paper={paper} base={base} />
          </>
        ) : doc.status === 'confidential' ? (
          <p>
            Held outside this room and released individually as part of formal diligence. Ask for
            it directly.
          </p>
        ) : written ? (
          <p>Available on request while the room is being assembled.</p>
        ) : (
          <p>
            Not written yet. This page is the specification for it: the description, what a
            reader will find in it, and where the structure is settled, its contents. Ask if you
            need it sooner than it is coming.
          </p>
        )}
      </section>

      {related.length > 0 ? (
        <section className="paper-block">
          <h2>Read alongside</h2>
          <div className="room-cards">
            {related.map((other) => (
              <DocCard key={other!.id} doc={other!} showSection base={base} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

export function RoomSearch({ q, base = '' }: { q?: string; base?: string }) {
  return (
    <>
      <header className="room-head">
        <p className="room-eyebrow">Search</p>
        <h1 className="room-head-title">Find anything in the room</h1>
        <p className="room-head-lede">
          The index covers document titles, descriptions, topics, planned contents and what each
          document says a reader will discover. The documents themselves are still being written,
          so their text is not searchable yet.
        </p>
      </header>

      <SearchPage initialQuery={q ?? ''} base={base} />
    </>
  );
}
