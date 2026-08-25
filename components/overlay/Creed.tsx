'use client';

import { QUFI_MARK } from '../../assets/mark';
import { useExperience } from '../../experience/ExperienceState';

/**
 * What the network is, said while it arrives.
 *
 * Three lines over the emergence, one at a time in the middle of the frame.
 * They land in the window between the mark breaking apart and the network
 * becoming responsive — the one stretch of the opening where there is something
 * worth watching and nothing to read.
 *
 * Each line assembles rather than fades: every character arrives from its own
 * offset, out of focus, and resolves in place, so the words gather the way the
 * rest of the site gathers. One word in each line is carried in the accent,
 * because these are three statements with one point each.
 *
 * All three are rendered and only the current one is shown, so each replaces
 * the last in exactly the same place rather than shifting the line.
 */

const LINES: Array<{ text: string; accent: string; mark?: boolean }> = [
  // The stakes, then the question, then the answer. The clock is the only line
  // that is about the world outside the page; everything after it is the reply.
  { text: 'The quantum clock is ticking.', accent: 'ticking' },
  { text: 'We are ready, are you?', accent: 'ready' },
  { text: 'We are quantum.', accent: 'quantum' },
  { text: 'We are the solution.', accent: 'solution' },
  // The last line names the network with the mark itself rather than with its
  // letters. It is the one word on the page that has a drawing of its own.
  { text: 'We are Q.', accent: 'Q', mark: true },
];

/**
 * Deterministic scatter per character. A random offset would differ between the
 * server render and the client, and would change on every replay.
 */
function offset(index: number, axis: number): number {
  const n = Math.sin(index * 12.9898 + axis * 78.233) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

function Line({
  text,
  accent,
  shown,
  mark,
}: {
  text: string;
  accent: string;
  shown: boolean;
  mark?: boolean;
}) {
  const words = text.split(' ');
  let cursor = 0;

  return (
    <p data-show={shown}>
      {words.map((word, w) => {
        const bare = word.replace(/[^\w-]/g, '');
        const lit = bare.toLowerCase() === accent.toLowerCase();

        /*
         * The mark stands in for the letter.
         *
         * Rendered as part of the run of characters rather than beside it, so it
         * assembles on the same delay as everything around it and sits on the
         * same baseline - it has to read as a letter in the sentence, not as a
         * logo that has been placed next to some words.
         */
        if (mark && lit) {
          const node = (
            <span key={w} className="creed-word creed-lit">
              <span
                className="creed-char creed-mark-char"
                style={
                  {
                    '--i': cursor,
                    '--dx': `${offset(cursor, 0) * 26}px`,
                    '--dy': `${offset(cursor, 1) * 22}px`,
                  } as React.CSSProperties
                }
              >
                <img className="creed-mark" src={QUFI_MARK} alt="" />
              </span>
              {Array.from(word.slice(accent.length)).map((character, c) => {
                const i = cursor + accent.length + c;
                return (
                  <span
                    key={c}
                    className="creed-char"
                    style={
                      {
                        '--i': i,
                        '--dx': `${offset(i, 0) * 26}px`,
                        '--dy': `${offset(i, 1) * 22}px`,
                      } as React.CSSProperties
                    }
                  >
                    {character}
                  </span>
                );
              })}
            </span>
          );
          cursor += word.length + 1;
          return node;
        }

        const node = (
          <span key={w} className={lit ? 'creed-word creed-lit' : 'creed-word'}>
            {Array.from(word).map((character, c) => {
              const i = cursor + c;
              return (
                <span
                  key={c}
                  className="creed-char"
                  style={
                    {
                      '--i': i,
                      '--dx': `${offset(i, 0) * 26}px`,
                      '--dy': `${offset(i, 1) * 22}px`,
                    } as React.CSSProperties
                  }
                >
                  {character}
                </span>
              );
            })}
          </span>
        );
        cursor += word.length + 1;
        return node;
      })}
    </p>
  );
}

export function Creed() {
  const creed = useExperience((s) => s.creed);
  const phase = useExperience((s) => s.phase);

  if (phase !== 'INTRO') return null;

  return (
    <div className="creed" aria-hidden="true">
      {LINES.map((line, i) => (
        <Line
          key={line.text}
          text={line.text}
          accent={line.accent}
          mark={line.mark}
          shown={creed === i}
        />
      ))}
    </div>
  );
}
