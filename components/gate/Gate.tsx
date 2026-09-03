'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { QUFI_MARK } from '../../assets/mark';
import { QUFI_WORD, QUFI_WORD_SIZE } from '../../assets/word';

/**
 * The choice at the front door.
 *
 * QuFi has two sites and neither is the compromise between them. One is an
 * environment you travel through, drawn on a GPU, where the structure of the
 * network is the interface; the other is a website, white and quiet, that can
 * be read on anything and skimmed in a minute. Which of those is right is not
 * a question about the visitor's hardware, it is a question about what they
 * came for — so it is asked rather than guessed.
 *
 * ## Why it is asked every time
 *
 * Remembering the answer would be kinder to a regular and worse for everybody
 * else: the person who chose the network out of curiosity on Tuesday is the
 * same person who wants to send a colleague a link on Wednesday, and a stored
 * preference makes that link open something they did not choose. The door is
 * cheap — no GPU, no fonts beyond the two already loaded, one paint — so
 * asking again costs a second.
 *
 * Deep links do not pass through here. `/product/vault` is the network,
 * `/classic/product/vault` is the site, and both open directly.
 */

export type Choice = 'network' | 'classic';

export function Gate({ onEnter }: { onEnter: (choice: Choice) => void }) {
  const [going, setGoing] = useState<Choice | null>(null);
  const [heavy, setHeavy] = useState(false);

  /*
   * Whether the machine can draw the network at all.
   *
   * Offering an experience that will not run is worse than not offering it, so
   * the door checks for a context before it recommends one. This is the same
   * check the experience itself makes, done early enough to change what is
   * said rather than late enough to produce an apology.
   */
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      setHeavy(Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl')));
    } catch {
      setHeavy(false);
    }
  }, []);

  const go = (choice: Choice) => {
    setGoing(choice);
    // Long enough for the card to acknowledge the press and the door to leave.
    if (choice === 'network') window.setTimeout(() => onEnter(choice), 520);
  };

  return (
    <div className="gate" data-going={going ?? 'no'}>
      <div className="gate-inner">
        <header className="gate-top">
          <span className="gate-mark">
            <img src={QUFI_MARK} alt="" width={190} height={186} />
          </span>
          <img
            className="gate-word"
            src={QUFI_WORD}
            alt="QuFi"
            width={QUFI_WORD_SIZE.width}
            height={QUFI_WORD_SIZE.height}
          />
        </header>

        <p className="gate-say">Two ways in</p>
        <h1 className="gate-title">
          The same network, told twice.
        </h1>
        <p className="gate-lede">
          One is a place you move through. The other is a website. Nothing is held back in
          either, so pick whichever suits the next ten minutes.
        </p>

        <div className="gate-doors">
          {/*
            The environment. Its card is the dark one and it is drawn with the
            same vocabulary the experience uses, because the card is a small
            honest sample of what pressing it opens.
          */}
          <button
            type="button"
            className="gate-door gate-door-network"
            onClick={() => go('network')}
            disabled={going !== null}
          >
            <span className="gate-door-art" aria-hidden="true">
              <svg viewBox="0 0 200 120" fill="none">
                <g className="gate-net-lines">
                  <path d="M30 84 L74 44 L126 66 L170 30" />
                  <path d="M30 84 L126 66" />
                  <path d="M74 44 L170 30" />
                  <path d="M74 44 L96 96" />
                  <path d="M96 96 L126 66" />
                </g>
                <g className="gate-net-nodes">
                  <circle cx="30" cy="84" r="3.4" />
                  <circle cx="74" cy="44" r="4.6" />
                  <circle cx="126" cy="66" r="4.6" />
                  <circle cx="170" cy="30" r="3.4" />
                  <circle cx="96" cy="96" r="3" />
                </g>
                <circle className="gate-net-pulse" cx="74" cy="44" r="4.6" />
              </svg>
            </span>

            <span className="gate-door-words">
              <span className="gate-door-name">The living network</span>
              <span className="gate-door-note">
                Scroll as distance travelled. Eight spaces, four product walkthroughs, drawn
                live. Best on a laptop.
              </span>
            </span>

            <span className="gate-door-go">
              {heavy ? 'Enter' : 'Enter anyway'}
              <i />
            </span>

            {!heavy ? (
              <span className="gate-door-warn">
                This machine reports no WebGL. The written version below will be the better
                one.
              </span>
            ) : null}
          </button>

          {/* And the site: white, still, and legible on anything. */}
          <Link
            className="gate-door gate-door-classic"
            href="/classic"
            onClick={() => go('classic')}
            aria-disabled={going !== null}
          >
            <span className="gate-door-art" aria-hidden="true">
              <svg viewBox="0 0 200 120" fill="none">
                <rect className="gate-page" x="34" y="18" width="132" height="84" rx="3" />
                <path className="gate-page-rule" d="M50 40h58M50 54h84M50 68h72M50 82h44" />
                <rect className="gate-page-head" x="50" y="28" width="30" height="4" rx="2" />
              </svg>
            </span>

            <span className="gate-door-words">
              <span className="gate-door-name">The standard site</span>
              <span className="gate-door-note">
                White, quiet and quick. The same products, the same documents, the same data
                room, read rather than travelled.
              </span>
            </span>

            <span className="gate-door-go">
              Open
              <i />
            </span>
          </Link>
        </div>

        <p className="gate-foot">
          Both carry everything. The data room lives inside{' '}
          <Link href="/data-room">either one</Link>.
        </p>
      </div>
    </div>
  );
}
