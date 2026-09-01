import Link from 'next/link';
import { Status } from './Status';
import { START_HERE, START_HERE_WHY, findDoc, findSection } from './catalogue';

/**
 * The way in, for somebody who has twenty minutes.
 *
 * Five documents in the order that builds understanding fastest: what the
 * opportunity is, what is being built, how it is put together, how it works,
 * and then the whole of it in technical detail.
 *
 * One component rather than two copies, because it appears on the front of the
 * room and on its own page, and a reading order that disagreed with itself
 * between the two would be worse than no reading order.
 *
 * The rows carry the status and the section as well as the reason. They did
 * not at first, and the Start Here page answered that by printing the same
 * five documents again underneath as cards — one page, two lists, identical
 * contents. Putting what the cards knew into the rows is what let the second
 * list go.
 */
export function Journey({ full = false }: { full?: boolean }) {
  return (
    <ol className={full ? 'room-journey room-journey-full' : 'room-journey'}>
      {START_HERE.map((id, index) => {
        const doc = findDoc(id);
        if (!doc) return null;
        const section = findSection(doc.section);

        return (
          <li key={id}>
            <Link href={`/data-room/document/${doc.id}`}>
              <span className="journey-step">{String(index + 1).padStart(2, '0')}</span>

              <span className="journey-body">
                <span className="journey-top">
                  <span className="journey-title">{doc.title}</span>
                  <Status status={doc.status} />
                </span>
                <span className="journey-why">{START_HERE_WHY[id]}</span>
                {full ? (
                  <span className="journey-where">
                    {section?.index} — {section?.title} · {doc.kind}
                  </span>
                ) : null}
              </span>

              <i className="journey-go" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
