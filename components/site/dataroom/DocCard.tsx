import Link from 'next/link';
import { findSection, type DataDoc } from './catalogue';
import { paperFor } from './papers';
import { Status } from './Status';

/**
 * One document, as a card.
 *
 * Carries the four things somebody scanning a list needs: what it is, how far
 * along it is, what it covers, and what they will get out of it. The first two
 * discovery points are shown rather than the description alone, because
 * "what you will find in here" sorts a list faster than a summary does.
 *
 * Going near one brings the QuFi mark into its bottom corner, cropped by both
 * edges — the same gesture the product doors and the team cards make, because
 * it is the same kind of card. It takes the section's colour rather than one
 * flat blue, so a wall of thirty-six cards has some shape to it.
 */

/*
 * A colour per section.
 *
 * The same three the products and the people already wear, plus the amber the
 * data room's own control in the corner uses. Sections that are about the same
 * thing share a colour on purpose: technology and security are one family, and
 * pretending otherwise would need nine colours nobody can tell apart.
 */
const TONE: Record<string, string> = {
  company: '#FFB03A',
  product: '#3BE08F',
  technology: '#4CC9FF',
  security: '#A97BFF',
  network: '#4CC9FF',
  market: '#FFB03A',
  team: '#3BE08F',
  legal: '#A97BFF',
  support: '#4CC9FF',
};

export function DocCard({
  doc,
  showSection = false,
  base = '',
}: {
  doc: DataDoc;
  showSection?: boolean;
  /**
   * Which of the two sites this card is in.
   *
   * The room is rendered twice — once in the environment and once on the
   * standard site — from the same components. A card that always linked to
   * `/data-room/...` would tip a reader out of whichever one they chose, so
   * every href in here is built from a prefix that is empty in the environment
   * and `/classic` on the site.
   */
  base?: string;
}) {
  const section = findSection(doc.section);
  const paper = paperFor(doc.id);

  return (
    <Link
      className="doc-card"
      href={`${base}/data-room/document/${doc.id}`}
      data-paper={String(Boolean(paper))}
      /*
        The colour is per card; the artwork is not. `--mark` is a
        sixty-kilobyte data URI, and setting it here would put a copy of it in
        the markup for every card on the page — two megabytes of HTML to draw
        one letter thirty-six times. It is set once on the room and inherited.
      */
      style={{ '--tone': TONE[doc.section] ?? '#4CC9FF' } as React.CSSProperties}
    >
      {/* Behind everything, and never in the way of the words. */}
      <span className="doc-sigil" aria-hidden="true">
        <i className="doc-sigil-fill" />
        <i className="doc-sigil-edge" />
      </span>

      <span className="doc-card-top">
        <span className="doc-card-index">{doc.index}</span>
        <span className="doc-card-kind">{doc.kind}</span>
        <Status status={doc.status} className="doc-card-status" />
      </span>

      <span className="doc-card-title">{doc.title}</span>

      {showSection && section ? (
        <span className="doc-card-section">
          {section.index} · {section.title}
        </span>
      ) : null}

      <span className="doc-card-desc">{doc.description}</span>

      <span className="doc-card-topics">
        {doc.topics.slice(0, 4).map((topic) => (
          <i key={topic}>{topic}</i>
        ))}
      </span>

      {/*
        A document with a file behind it says so on the card. In a room where
        most things are specifications, "there is something to read here" is
        the most useful thing a card can carry.
      */}
      {paper ? (
        <span className="doc-card-has">
          <i aria-hidden="true" />
          {paper.pages} pages · view in browser
        </span>
      ) : null}
    </Link>
  );
}
