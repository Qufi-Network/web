import { TEAM } from '../../content/team';

/**
 * The people, on the standard site.
 *
 * The environment cuts each portrait to a hexagon inside a ring of marks,
 * because everything there is drawn with the same geometry. Here they are
 * round photographs with a turning ring, because everything here is a website.
 * Same three people, same three colours, told the way the rest of the page is
 * told.
 */
export function ClassicTeam() {
  return (
    <section className="cx-room-team">
      <p className="room-section-eyebrow">Leadership team</p>
      <h2 className="room-section-title">
        QuFi is governed and led by a team of recognised industry pioneers and leaders.
      </h2>

      <div className="cx-room-faces">
        {TEAM.map((person) => (
          <article
            key={person.id}
            className="cx-person"
            style={{ '--tone': person.tone } as React.CSSProperties}
          >
            {/* The mark, arriving in the corner in this person's colour. */}
            <span className="cx-sigil" aria-hidden="true">
              <i className="cx-sigil-fill" />
              <i className="cx-sigil-edge" />
            </span>

            <span className="cx-person-photo">
              <img src={person.photo} alt={person.name} width={480} height={480} />
              <i aria-hidden="true" />
            </span>
            <h3>{person.name}</h3>
            <p>{person.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
