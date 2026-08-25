"""Replaces the closing actions with the genesis node register."""
import io
import sys


def patch(path, pairs):
    with io.open(path, encoding='utf-8') as handle:
        source = handle.read()
    for old, new in pairs:
        if old not in source:
            sys.exit('missing in %s: %s' % (path, old[:70]))
        source = source.replace(old, new, 1)
    with io.open(path, 'w', encoding='utf-8') as handle:
        handle.write(source)
    print('patched', path)


# ---- the chapter model --------------------------------------------------
patch('experience/Chapters.ts', [(
    """  /**
   * Closing actions. Only the final chapter has these.
   *
   * Every one carries where it actually stands. A list of ways in that reads as
   * though all six are available today would be the one genuinely misleading
   * thing on the page, and it is the last thing the visitor sees.
   */
  actions?: Array<{ label: string; note: string; stage: string }>;""",
    """/**
   * The register of interest. Only the final chapter has this.
   *
   * There is exactly one way in, because there is exactly one thing on offer:
   * a place among the genesis nodes. A row of speculative calls to action would
   * dilute that, and most of them would have to be marked as not yet available.
   */
  genesis?: { eyebrow: string; heading: string; body: string };""",
), (
    """    actions: [
      {
        label: 'Launch an asset',
        note: 'For issuers bringing real-world assets into the network',
        stage: 'In design',
      },
      {
        label: 'Build on QUFI',
        note: 'SDKs, APIs and reference implementations',
        stage: 'In development',
      },
      {
        label: 'Integrate money',
        note: 'For regulated monetary infrastructure',
        stage: 'In design',
      },
      {
        label: 'Settle transactions',
        note: 'For institutions coordinating asset and value movement',
        stage: 'In design',
      },
      {
        label: 'Run a node',
        note: 'Verify instructions and hold a share of the threshold',
        stage: 'Live',
      },
      {
        label: 'Read the protocol',
        note: 'Architecture, cryptography and security model',
        stage: 'Live',
      },
    ],""",
    """    genesis: {
      eyebrow: 'Genesis',
      heading: 'The first thousand nodes.',
      body: 'QUFI begins with one thousand genesis nodes: independent operators who verify the first instructions the network settles, and hold a share of the threshold that approves them.',
    },""",
)])


# ---- the overlay --------------------------------------------------------
patch('components/overlay/ChapterLayer.tsx', [(
    """import { useNetwork } from '../../experience/NetworkContext';""",
    """import { useNetwork } from '../../experience/NetworkContext';
import { GenesisForm } from './GenesisForm';""",
), (
    """          {chapter.actions ? (
            <ul className="actions">
              {chapter.actions.map((action, lane) => (
                <li key={action.label}>
                  <button
                    type="button"
                    onMouseEnter={() => {
                      stage.reach = lane;
                    }}
                    onFocus={() => {
                      stage.reach = lane;
                    }}
                    onMouseLeave={() => {
                      stage.reach = -1;
                    }}
                    onBlur={() => {
                      stage.reach = -1;
                    }}
                  >
                    <span className="action-head">
                      <span className="action-label">{action.label}</span>
                      <span className="action-stage" data-stage={action.stage}>
                        {action.stage}
                      </span>
                    </span>
                    <span className="action-note">{action.note}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}""",
    """          {chapter.genesis ? (
            <div className="genesis-panel">
              <p className="eyebrow">{chapter.genesis.eyebrow}</p>
              <h2 className="genesis-heading">{chapter.genesis.heading}</h2>
              <p className="genesis-body">{chapter.genesis.body}</p>
              <GenesisForm />
            </div>
          ) : null}""",
)])
