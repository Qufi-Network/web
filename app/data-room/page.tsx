import type { Metadata } from 'next';
import Link from 'next/link';
import { Team } from '../../components/site/Team';
import { DocCard } from '../../components/site/dataroom/DocCard';
import { Journey } from '../../components/site/dataroom/Journey';
import { SearchBar } from '../../components/site/dataroom/Search';
import {
  SECTIONS,
  START_HERE,
  START_HERE_WHY,
  docsIn,
  findDoc,
  roomStats,
} from '../../components/site/dataroom/catalogue';

export const metadata: Metadata = {
  title: 'Data room',
  robots: { index: false, follow: false },
};

/**
 * The front of the data room.
 *
 * What the room is, what it holds and a way to search it — then the people, and
 * then a reading order for somebody who has never heard of QuFi and has twenty
 * minutes.
 *
 * The team was first for a while, on the reasoning that an institution wants to
 * know who is behind a thing before it wants a document index. Seen on the page
 * it reads as a mistake: three portraits arrive before the room has said what it
 * is, and the title of the page is below the fold. The people are the second
 * thing now, which is still early and no longer disorienting.
 *
 * The counts are computed from the catalogue rather than written down. A number
 * on a page that somebody has to remember to update is a number that will be
 * wrong.
 */
export default function Page() {
  const stats = roomStats();

  return (
    <>
      <section className="room-hero">
        <p className="room-eyebrow">QuFi data room</p>
        <h1 className="room-title">Institutional intelligence for the future of verified global value.</h1>
        <p className="room-lede">
          Explore the technology, products, architecture and strategy behind QuFi — a
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
            <dt>Investment materials</dt>
            <dd>{stats.investment}</dd>
          </div>
        </dl>

        <p className="room-note">
          The library is being assembled. Every document below carries its status, and one that
          has not been written says so rather than showing you something that was.
        </p>
      </section>

      <SearchBar />

      <Team />

      <section className="room-section" id="start">
        <p className="room-section-eyebrow">Start here</p>
        <h2 className="room-section-title">A reading order</h2>
        <p className="room-section-lede">
          Five documents, in the order that builds understanding fastest: what the opportunity
          is, what is being built, how it is put together, how it works, and then the whole of it
          in technical detail.
        </p>

        <Journey />
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
                href={`/data-room/section/${section.id}`}
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
          <DocCard doc={findDoc('technical-whitepaper')!} showSection />
          <DocCard doc={findDoc('investor-memorandum')!} showSection />
        </div>
      </section>
    </>
  );
}
