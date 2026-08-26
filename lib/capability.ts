/**
 * What this machine can actually be asked to draw.
 *
 * Every count in the experience is derived from here rather than hard-coded, so
 * a phone renders a smaller, simpler network — not the same network at a worse
 * frame rate.
 */

export type QualityTier = 'ultra' | 'high' | 'medium' | 'low';

export interface Capability {
  tier: QualityTier;
  /** Participants in the simulated network. */
  nodeCount: number;
  /** Subdivisions per connection. More segments means smoother bending. */
  edgeSegments: number;
  /** Ambient field points. */
  fieldCount: number;
  /** Points forming the Core shell. */
  coreCount: number;
  /**
   * Points shared out across the seven structures that are not the Core.
   * Split by each space's declared weight, never evenly: a constellation of
   * four settlement environments needs more points to read than a gateway of
   * four rings.
   */
  structureCount: number;
  /** Concurrent instructions in flight. */
  maxSignals: number;
  /** Device pixel ratio ceiling. */
  maxDpr: number;
  /**
   * Largest a node sprite may become, in device pixels. This is the single most
   * effective control over fill rate in the whole scene: everything is drawn
   * additively with no depth rejection, so a handful of very large sprites near
   * the camera can cost more than the entire rest of the frame.
   */
  maxPointSize: number;
  /**
   * Ceiling on total device pixels. Applied on top of maxDpr, because a 4K
   * window at 2x is four times the work of a laptop window at 2x and the tier
   * heuristic cannot see the difference.
   */
  pixelBudget: number;
  /** Whether node glyphs resolve at all. Off on the smallest devices. */
  glyphs: boolean;
  touch: boolean;
  webgl: boolean;
}

function hasWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

/**
 * What the GPU calls itself.
 *
 * Core count and memory describe the CPU, and this scene barely touches the CPU.
 * A laptop with eight cores and sixteen gigabytes can still be driving an
 * integrated GPU that cannot fill this many additive fragments — and it will not
 * degrade gracefully, it will stall for seconds at a time. So the renderer
 * string gets a veto over whatever the CPU heuristic concluded.
 */
function gpuCeiling(): QualityTier | null {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return null;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    );

    // No hardware at all behind the context.
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return 'low';
    // Mobile and tablet parts.
    if (/mali|adreno|powervr|videocore/i.test(renderer)) return 'low';
    // Intel integrated graphics, which is most business laptops.
    if (/intel/i.test(renderer) && !/arc\b/i.test(renderer)) return 'medium';
    return null;
  } catch {
    return null;
  }
}

const ORDER: QualityTier[] = ['ultra', 'high', 'medium', 'low'];

/** The lower of two tiers. */
function floorTier(a: QualityTier, b: QualityTier): QualityTier {
  return ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b;
}

const PRESETS: Record<QualityTier, Omit<Capability, 'tier' | 'touch' | 'webgl'>> = {
  ultra: {
    nodeCount: 2200,
    edgeSegments: 8,
    fieldCount: 900,
    coreCount: 2600,
    structureCount: 14000,
    maxSignals: 110,
    maxDpr: 2,
    maxPointSize: 44,
    pixelBudget: 5_000_000,
    glyphs: true,
  },
  high: {
    nodeCount: 1500,
    edgeSegments: 6,
    fieldCount: 620,
    coreCount: 1800,
    structureCount: 9500,
    maxSignals: 75,
    maxDpr: 2,
    maxPointSize: 38,
    pixelBudget: 3_800_000,
    glyphs: true,
  },
  medium: {
    nodeCount: 950,
    edgeSegments: 5,
    fieldCount: 420,
    coreCount: 1200,
    structureCount: 5600,
    maxSignals: 45,
    maxDpr: 1.5,
    maxPointSize: 32,
    pixelBudget: 2_400_000,
    glyphs: true,
  },
  low: {
    nodeCount: 560,
    edgeSegments: 4,
    fieldCount: 260,
    coreCount: 700,
    structureCount: 2900,
    maxSignals: 26,
    maxDpr: 1.25,
    maxPointSize: 26,
    pixelBudget: 1_600_000,
    glyphs: false,
  },
};

/**
 * Pixel ratio that keeps the drawing buffer inside the tier's budget for this
 * particular window. Never raises the ratio above the tier ceiling.
 */
export function dprFor(capability: Capability, width: number, height: number): number {
  const area = Math.max(1, width * height);
  return Math.max(1, Math.min(capability.maxDpr, Math.sqrt(capability.pixelBudget / area)));
}

export function detectCapability(): Capability {
  const webgl = hasWebGL2();
  if (typeof window === 'undefined') {
    return { tier: 'high', ...PRESETS.high, touch: false, webgl };
  }

  // Development override, so the composition can be judged at every tier from
  // one machine instead of trusting that the phone build looks right.
  if (process.env.NODE_ENV !== 'production') {
    const forced = new URLSearchParams(window.location.search).get('tier') as QualityTier | null;
    if (forced && forced in PRESETS) {
      return {
        tier: forced,
        ...PRESETS[forced],
        touch: window.matchMedia('(pointer: coarse)').matches,
        webgl,
      };
    }
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const touch = window.matchMedia('(pointer: coarse)').matches || nav.maxTouchPoints > 0;
  const width = window.innerWidth;
  const dpr = window.devicePixelRatio || 1;

  let tier: QualityTier;
  if (touch || width < 700) {
    // A phone pushing 3x pixels is doing more work per node than a laptop, so
    // small screens drop a tier again rather than trusting the core count.
    tier = cores >= 8 && dpr <= 2.5 ? 'medium' : 'low';
  } else if (cores >= 8 && memory >= 8 && width >= 1440) {
    tier = 'ultra';
  } else if (cores >= 6 && memory >= 4) {
    tier = 'high';
  } else {
    tier = 'medium';
  }

  const ceiling = gpuCeiling();
  if (ceiling) tier = floorTier(tier, ceiling);

  return { tier, ...PRESETS[tier], touch, webgl };
}

/** Next tier down, for the adaptive monitor. Returns null at the floor. */
export function degrade(tier: QualityTier): QualityTier | null {
  const index = ORDER.indexOf(tier);
  return index >= 0 && index < ORDER.length - 1 ? ORDER[index + 1] : null;
}

export function presetFor(tier: QualityTier) {
  return PRESETS[tier];
}
