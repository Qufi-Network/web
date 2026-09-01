'use client';

import { QUFI_MARK } from '../../assets/mark';

/**
 * Who governs and leads the thing.
 *
 * A team section on a site made of geometry cannot be three photographs in
 * three squares — it would be the one place the site stopped speaking its own
 * language. So each face sits inside the same construction the products are
 * drawn with: a hexagon it is cut to, a ring standing off it, and a mark at
 * each corner of the frame.
 *
 * Going near one brings the QuFi mark into its bottom corner, cropped by both
 * edges and in that person's colour — the same gesture the product doors make,
 * because it is the same kind of card.
 */

interface Person {
  id: string;
  name: string;
  role: string;
  tone: string;
  /** Where the photograph came out of `tools/build/mkteam.mjs`. */
  photo: string;
}

/*
 * The three colours are the ones the products already use, which is not
 * decoration: technology, business and growth are what the products are made
 * of, and giving the people the same three says so without a sentence.
 */
export const TEAM: Person[] = [
  { id: 'alex', name: 'Alex', role: 'Technology', tone: '#4CC9FF', photo: '/team/alex.webp' },
  { id: 'sam', name: 'Sam', role: 'Business', tone: '#A97BFF', photo: '/team/sam.webp' },
  { id: 'eric', name: 'Eric', role: 'Growth', tone: '#3BE08F', photo: '/team/eric.webp' },
];

export function Team() {
  return (
    <section className="doc-section">
      <h2>Leadership team</h2>
      <p>QuFi is governed and led by a team of recognised industry pioneers and leaders.</p>

      <div className="faces">
        {TEAM.map((person) => (
          <article
            key={person.id}
            className="face"
            style={
              {
                '--tone': person.tone,
                '--mark': `url(${QUFI_MARK})`,
              } as React.CSSProperties
            }
          >
            {/*
              The mark, arriving into the corner of the card. Behind the
              portrait and never in the way of it.
            */}
            <span className="face-sigil" aria-hidden="true">
              <i className="face-sigil-fill" />
              <i className="face-sigil-edge" />
            </span>

            <span className="face-frame">
              {/*
                The geometry around the photograph: a ring standing off the
                hexagon the picture is cut to, and a mark at each corner. Drawn
                rather than bordered, because a border cannot follow a hexagon
                and this site does not do rounded rectangles.
              */}
              <svg className="face-ring" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
                <path
                  className="face-line"
                  d="M100 6 168 45v110l-68 39-68-39V45Z"
                />
                <path
                  className="face-line face-line-soft"
                  d="M100 16 159 50v100l-59 34-59-34V50Z"
                />
                <path className="face-tick" d="M100 6v-6M168 45l6-3M168 155l6 3M100 194v6M32 155l-6 3M32 45l-6-3" />
                <circle className="face-lit" cx="100" cy="6" r="3.2" />
                <circle className="face-lit" cx="168" cy="155" r="2.4" />
                <circle className="face-lit" cx="32" cy="45" r="2.4" />
              </svg>

              <img
                className="face-photo"
                src={person.photo}
                alt={`${person.name}, ${person.role}`}
                width={480}
                height={480}
                loading="lazy"
              />
            </span>

            <p className="face-name">{person.name}</p>
            <p className="face-role">{person.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
