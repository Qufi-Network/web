import { Entry } from '../components/gate/Entry';
import { CAPABILITIES, CLOSING, CRYPTOGRAPHY, HERO } from '../content/story';

/**
 * The front door, and the document underneath it.
 *
 * The door asks which of the two sites the visitor wants; the document is
 * served either way. Always crawlable, always available to a screen reader —
 * the network sits on top of it rather than replacing it, and if WebGL is
 * missing the same content simply becomes visible. It carries the same eight
 * capabilities in the same order, so nothing is only available to someone with
 * a GPU and a pointer.
 *
 * The prose comes out of `content/story.ts` rather than living here, because
 * the standard site says the same things and two copies of the same paragraph
 * are two paragraphs that will disagree.
 *
 * Everything here describes what QuFi does. Nothing in it is presented as a
 * measurement: the numbers on the page are what the architecture is, not what
 * a running network is currently doing.
 */
export default function Page() {
  return (
    <>
      <Entry />

      <main className="document">
        <h1>QuFi</h1>
        <p className="lede">{HERO.title}</p>

        <p>
          {HERO.lede} {HERO.body}
        </p>

        {CAPABILITIES.map((cap) => (
          <section key={cap.index}>
            <h2>
              {cap.index} · {cap.title}
            </h2>
            <p>
              <strong>{cap.lede}</strong> {cap.body}
            </p>
          </section>
        ))}

        <h2>Cryptography</h2>
        <dl>
          {CRYPTOGRAPHY.map((item) => (
            <div key={item.id}>
              <dt>{item.term}</dt>
              <dd>
                {item.said}. {item.body}
              </dd>
            </div>
          ))}
        </dl>

        <h2>{CLOSING.title}</h2>
        <p>{CLOSING.body}</p>
      </main>
    </>
  );
}
