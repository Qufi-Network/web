import Link from 'next/link';
import { findSection, type DataDoc } from './catalogue';
import { Status } from './Status';

/**
 * One document, as a card.
 *
 * Carries the four things somebody scanning a list needs: what it is, how far
 * along it is, what it covers, and what they will get out of it. The first two
 * discovery points are shown rather than the description alone, because
 * "what you will find in here" sorts a list faster than a summary does.
 */
export function DocCard({ doc, showSection = false }: { doc: DataDoc; showSection?: boolean }) {
  const section = findSection(doc.section);

  return (
    <Link className="doc-card" href={`/data-room/document/${doc.id}`}>
      <span className="doc-card-top">
        <span className="doc-card-index">{doc.index}</span>
        <span className="doc-card-kind">{doc.kind}</span>
        <Status status={doc.status} className="doc-card-status" />
      </span>

      <span className="doc-card-title">{doc.title}</span>

      {showSection && section ? (
        <span className="doc-card-section">
          {section.index} — {section.title}
        </span>
      ) : null}

      <span className="doc-card-desc">{doc.description}</span>

      <span className="doc-card-topics">
        {doc.topics.slice(0, 4).map((topic) => (
          <i key={topic}>{topic}</i>
        ))}
      </span>
    </Link>
  );
}
