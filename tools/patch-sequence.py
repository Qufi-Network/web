"""Sequences the closing reveal, and turns the remaining lists into journeys."""
import io
import sys


def patch(path, pairs):
    s = io.open(path, encoding='utf-8').read()
    for old, new in pairs:
        if old not in s:
            sys.exit('missing in %s: %s' % (path, old[:90]))
        s = s.replace(old, new, 1)
    io.open(path, 'w', encoding='utf-8').write(s)
    print('patched', path)


# ---- the closing reveal --------------------------------------------------
patch('experience/Chapters.ts', [(
    """  /** A closing question that hands the visitor to the next journey. */""",
    """  /**
   * A single word held back, revealed later than the line it answers.
   *
   * Kept out of the statement machinery because statements replace one another
   * — this one has to arrive underneath the line it belongs to and stay, so the
   * two are read together once the second lands.
   */
  reveal?: { at: number; text: string };
  /** A closing question that hands the visitor to the next journey. */""",
), (
    """    lines: [
      // One line rather than two. Split across a replace they read as a beat
      // and its punchline, but the punchline landed after the form had already
      // appeared underneath it, which is the wrong order to say it in.
      { at: 0.1, statement: "There's one node missing. Yours." },
    ],""",
    """    lines: [{ at: 0.08, statement: "There's one node missing." }],
    // Held back, then arriving large. The pause between the two is the whole
    // effect: the first line states a fact, and the answer to it only turns up
    // once the visitor has kept going.
    reveal: { at: 0.34, text: 'Yours.' },""",
)])


# ---- render it -----------------------------------------------------------
patch('components/overlay/ChapterLayer.tsx', [(
    """            {chapter.caption ? <p className="caption">{chapter.caption}</p> : null}""",
    """            {chapter.reveal ? (
              <p
                className="reveal-word line"
                data-line={chapter.reveal.at}
                data-owner={index}
                data-kind="body"
              >
                {chapter.reveal.text}
              </p>
            ) : null}
            {chapter.caption ? <p className="caption">{chapter.caption}</p> : null}""",
)])


# ---- the remaining lists become anchored journeys ------------------------
patch('experience/Chapters.ts', [(
    """  /** Named stops along a route. Lit one at a time as the visitor advances. */
  stops?: Array<{ term: string; note: string }>;""",
    """  /**
   * Named stops along a route, reached one at a time.
   *
   * Rendered exactly like the capabilities: anchored to a participant out in
   * the network and arriving as the camera comes to it. A numbered sequence
   * rather than a taxonomy, so these carry their position instead of a glyph.
   */
  stops?: Array<{ term: string; note: string }>;""",
)])

patch('experience/systems/FeatureProjector.tsx', [(
    """const FEATURES = CHAPTERS.find((chapter) => chapter.id === 'qufi')?.features ?? [];
const QUFI_INDEX = CHAPTERS.findIndex((chapter) => chapter.id === 'qufi');""",
    """/**
 * Every chapter that presents a series of things, and how many it presents.
 *
 * Capabilities and route stops are the same idea wearing different labels — a
 * set of things reached one after another as the camera travels — so they share
 * one anchoring mechanism rather than each having their own.
 */
const SERIES = CHAPTERS.map((chapter, index) => ({
  index,
  id: chapter.id,
  count: (chapter.features ?? chapter.stops ?? []).length,
})).filter((entry) => entry.count > 0);""",
), (
    """  const anchors = useMemo(() => {
    const pool = engine.snapshot.nodes.filter((node) => node.type === NodeType.Application);
    if (pool.length === 0) return [];

    const chosen: typeof pool = [];
    const remaining = [...pool];
    for (let i = 0; i < FEATURES.length && remaining.length; i++) {""",
    """  const anchors = useMemo(() => {
    const pool = engine.snapshot.nodes.filter((node) => node.type === NodeType.Application);
    if (pool.length === 0) return [];

    const most = SERIES.reduce((n, entry) => Math.max(n, entry.count), 0);
    const chosen: typeof pool = [];
    const remaining = [...pool];
    for (let i = 0; i < most && remaining.length; i++) {""",
), (
    """    const anchor = stage.featureAnchor;
    const inChapter = stage.depth >= QUFI_INDEX - 0.1 && stage.depth < QUFI_INDEX + 1;

    if (!inChapter || stage.featurePresence <= 0.002 || anchors.length === 0) {""",
    """    const anchor = stage.featureAnchor;
    const here = Math.floor(stage.depth);
    const inChapter = SERIES.some((entry) => entry.index === here);

    if (!inChapter || stage.featurePresence <= 0.002 || anchors.length === 0) {""",
)])
