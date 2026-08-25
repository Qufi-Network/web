"""Turns the capability list into a scroll-driven journey through the network."""
import io
import sys


def patch(path, pairs):
    with io.open(path, encoding='utf-8') as handle:
        source = handle.read()
    for old, new in pairs:
        if old not in source:
            sys.exit('missing in %s: %s' % (path, old[:80]))
        source = source.replace(old, new, 1)
    with io.open(path, 'w', encoding='utf-8') as handle:
        handle.write(source)
    print('patched', path)


# ---- the chapter model ---------------------------------------------------
patch('experience/Chapters.ts', [(
    """  /** Terms laid out as a grid once the chapter has settled. */
  grid?: Array<{ term: string; note: string }>;""",
    """  /** Terms laid out as a grid once the chapter has settled. */
  grid?: Array<{ term: string; note: string }>;
  /**
   * Capabilities, reached one at a time as the visitor descends.
   *
   * Not a list. Each one is anchored to a participant out in the network and
   * arrives as the camera comes to it, so the six things QUFI does are found in
   * the same way everything else on this site is found — by travelling to them.
   */
  features?: Array<{ term: string; note: string; glyph: string }>;""",
), (
    """    grid: [
      { term: 'Verification', note: 'Independent nodes check every instruction' },
      { term: 'Custody', note: 'Vaults with a post-quantum-gated spend path' },
      { term: 'Settlement', note: 'Corridors that move value between parties' },
      { term: 'Instruments', note: 'Letters of credit and trade finance' },
      { term: 'Reserves', note: 'Backing a third party can verify' },
      { term: 'Tokenisation', note: 'The same mechanics for real-world assets' },
    ],""",
    """    features: [
      {
        term: 'Verification',
        note: 'Independent nodes check every instruction, confirm the collateral behind it, and only then approve.',
        glyph: 'verification',
      },
      {
        term: 'Custody',
        note: 'Vaults with a post-quantum-gated spend path. Operators never take custody and cannot move funds alone.',
        glyph: 'custody',
      },
      {
        term: 'Settlement',
        note: 'Corridors that move value between parties, with the asset leg and the money leg linked.',
        glyph: 'settlement',
      },
      {
        term: 'Instruments',
        note: 'Letters of credit, guarantees and trade finance, carried as instructions the network can check.',
        glyph: 'instruments',
      },
      {
        term: 'Reserves',
        note: 'Backing a third party can verify for themselves, rather than an assurance they have to take on trust.',
        glyph: 'reserves',
      },
      {
        term: 'Tokenisation',
        note: 'The same vault-and-claim mechanics applied to title, receivables, funds and commodities.',
        glyph: 'tokenisation',
      },
    ],""",
), (
    """    camera: { px: 2, py: 15, pz: 46, tx: 0, ty: -5, tz: 0, fov: 50 },""",
    """    // Pushes inward across the chapter so the capabilities come toward the
    // visitor rather than being scrolled past.
    camera: { px: 2, py: 15, pz: 62, tx: 0, ty: -5, tz: 0, fov: 50 },
    cameraExit: { px: -4, py: 7, pz: 26, tx: 0, ty: -2, tz: 0, fov: 58 },""",
), (
    """export interface Chapter {
  id: string;""",
    """export interface Chapter {
  id: string;
  /**
   * Where the camera ends up by the close of the chapter, if it should travel
   * within it rather than hold a single position. Most chapters are one shot;
   * the ones that are a journey through something are not.
   */
  cameraExit?: ChapterCamera;""",
)])


# ---- driving it ----------------------------------------------------------
patch('experience/systems/ScrollDirector.tsx', [(
    """    const cam = stage.camera;
    const a = current.camera;
    const b = next.camera;""",
    """    const cam = stage.camera;
    // A chapter that travels interpolates toward its own exit first, and only
    // then hands over to the next chapter.
    const a = current.cameraExit
      ? lerpCamera(current.camera, current.cameraExit, ease(position.local))
      : current.camera;
    const b = next.camera;""",
), (
    """const CHAPTER_OF = Object.fromEntries(CHAPTERS.map((chapter, index) => [chapter.id, index]));""",
    """const CHAPTER_OF = Object.fromEntries(CHAPTERS.map((chapter, index) => [chapter.id, index]));

/** Smooth in and out, for camera travel inside a chapter. */
function ease(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function lerpCamera(a: ChapterCamera, b: ChapterCamera, t: number): ChapterCamera {
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    px: mix(a.px, b.px),
    py: mix(a.py, b.py),
    pz: mix(a.pz, b.pz),
    tx: mix(a.tx, b.tx),
    ty: mix(a.ty, b.ty),
    tz: mix(a.tz, b.tz),
    fov: mix(a.fov, b.fov),
  };
}""",
), (
    """import { CHAPTERS, positionAt, type ChapterState } from '../Chapters';""",
    """import { CHAPTERS, positionAt, type ChapterCamera, type ChapterState } from '../Chapters';""",
), (
    """  if (id === 'reveal') {""",
    """  if (id === 'qufi') {
    // Six capabilities across the body of the chapter, each held long enough to
    // be read before the next comes forward.
    const run = Math.max(0, Math.min(1, (local - 0.12) / 0.76));
    const count = 6;
    const at = run * count;
    stage.featureIndex = Math.min(count - 1, Math.floor(at));
    // Rises as one arrives, holds, falls as it leaves — so cards cross-fade
    // rather than cutting.
    const withinStep = at - Math.floor(at);
    stage.featurePresence =
      run <= 0 || run >= 1
        ? 0
        : Math.min(1, Math.min(withinStep / 0.18, (1 - withinStep) / 0.18));
    stage.stopActive = 0;
    return;
  }

  if (id === 'reveal') {""",
), (
    """    stage.assetPresence = Math.max(0, stage.assetPresence - delta * 1.6);""",
    """    stage.assetPresence = Math.max(0, stage.assetPresence - delta * 1.6);
    if (current.id !== 'qufi') stage.featurePresence = Math.max(0, stage.featurePresence - delta * 3);""",
)])


# ---- stage ---------------------------------------------------------------
patch('experience/stage.ts', [(
    """  /**
   * Words attached to nodes, projected each frame inside the render loop and
   * read by the DOM layer. Mutated in place; never reallocated.
   */
  labels: [] as ProjectedLabel[],""",
    """  /**
   * Words attached to nodes, projected each frame inside the render loop and
   * read by the DOM layer. Mutated in place; never reallocated.
   */
  labels: [] as ProjectedLabel[],

  /** Which capability has come forward, and how present it is. */
  featureIndex: 0,
  featurePresence: 0,
  /** Screen position of the participant the current capability hangs off. */
  featureAnchor: { x: 0, y: 0, visible: 0 },""",
), (
    """  stage.settleConfirm = 0;""",
    """  stage.settleConfirm = 0;
  stage.featureIndex = 0;
  stage.featurePresence = 0;
  stage.featureAnchor.x = 0;
  stage.featureAnchor.y = 0;
  stage.featureAnchor.visible = 0;""",
)])
