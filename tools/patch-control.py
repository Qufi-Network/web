"""Turns the reading card into a control that opens into a panel."""
import io
import sys

P = 'app/surfaces.css'
s = io.open(P, encoding='utf-8').read()

start = s.find('/*\n * The card.')
end = s.find('/* The head is the whole card until somebody asks for more. */')
if start < 0 or end < 0:
    sys.exit('card block not found')

NEW = '''/*
 * A control first, a panel second.
 *
 * A reading arrives as a compact bar: a mark, its position along the route, and
 * what it is. That is all most visitors want while something is moving on
 * screen. Opening it grows the same object into a panel with the explanation
 * inside, so the panel is the expanded state of the control rather than a
 * second thing that replaced it.
 *
 * It does not fade in. Opacity is switched and the arrival is carried by the
 * approach in depth and the particles gathering at its edge — a panel that
 * fades up while it also scales reads as two effects fighting, and neither of
 * them reads as something coming out of the network.
 */
.feature-card {
  position: fixed;
  z-index: 4;
  left: var(--anchor-x, 50%);
  top: var(--anchor-y, 50%);
  width: max-content;
  max-width: min(34ch, 82vw);
  padding: 14px 20px;
  display: grid;
  gap: 0;
  pointer-events: auto;
  isolation: isolate;
  overflow: hidden;

  border: 1px solid rgba(150, 200, 255, 0.22);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(9, 15, 27, 0.9) 0%, rgba(5, 9, 18, 0.93) 70%);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow:
    0 0 20px -4px color-mix(in srgb, var(--neon) 30%, transparent),
    0 8px 26px -10px rgba(0, 0, 0, 0.8);

  opacity: 0;
  transform: translate(-50%, -50%) scale(var(--depth, 0.6));
  filter: blur(calc(var(--haze, 3) * 1px));
  transition:
    border-radius 480ms var(--ease),
    max-width 520ms var(--ease),
    padding 480ms var(--ease),
    box-shadow 480ms var(--ease);

  visibility: hidden;
}

/* Grain, so the surface is a surface. */
.feature-card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.18;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.feature-card[data-show='true'] {
  visibility: visible;
  opacity: 1;
}

/* Opened, it becomes the panel: wider, softer cornered, lit from beneath. */
.feature-card[data-open='true'] {
  max-width: min(34ch, 82vw);
  width: min(34ch, 82vw);
  padding: 22px 24px;
  border-radius: 22px;
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  box-shadow:
    0 -10px 80px 4px color-mix(in srgb, var(--neon) 22%, transparent),
    0 12px 40px -12px rgba(0, 0, 0, 0.85);
}

/* The bloom belongs to the open panel. */
.feature-card::before {
  content: '';
  position: absolute;
  inset: 40% 0 0;
  z-index: -2;
  pointer-events: none;
  background:
    radial-gradient(ellipse at bottom right, color-mix(in srgb, var(--neon) 55%, transparent) -10%, transparent 68%),
    radial-gradient(ellipse at bottom left, color-mix(in srgb, var(--neon-deep, #1769ff) 50%, transparent) -10%, transparent 68%);
  filter: blur(34px);
  opacity: 0;
  transition: opacity 560ms var(--ease);
}

.feature-card[data-open='true']::before {
  opacity: 0.85;
}

.card-edge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.7) 50%,
    rgba(255, 255, 255, 0.04) 100%
  );
  opacity: 0;
  transition: opacity 520ms var(--ease);
}

.feature-card[data-open='true'] .card-edge {
  opacity: 1;
  box-shadow: 0 0 18px 3px color-mix(in srgb, var(--neon) 60%, transparent);
}

'''

s = s[:start] + NEW + s[end:]

RULE_OLD = """.feature-head::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -8px;
  height: 1px;
  width: 0;
  background: linear-gradient(90deg, var(--neon), transparent);
  transition: width 700ms var(--ease) 200ms;
}"""
RULE_NEW = """/* The rule under the heading belongs to the opened panel. */
.feature-head::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -10px;
  height: 1px;
  width: 0;
  background: linear-gradient(90deg, var(--neon), transparent);
  transition: width 620ms var(--ease) 120ms;
}

.feature-card[data-open='true'] .feature-head::after {
  width: 100%;
}"""
if RULE_OLD in s:
    s = s.replace(RULE_OLD, RULE_NEW, 1)

s = s.replace("""
.feature-card[data-show='true'] .feature-head::after {
  width: 100%;
}
""", "\n", 1)

MARK_OLD = """/* One colour per subject, set into a recessed well. */
.feature-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: linear-gradient(225deg, #131a2a 0%, #0b101c 100%);
  box-shadow:
    0 6px 14px -2px rgba(0, 0, 0, 0.55),
    inset 1px 1px 3px rgba(255, 255, 255, 0.1),
    inset -2px -2px 5px rgba(0, 0, 0, 0.65);
  color: var(--neon);
}"""
MARK_NEW = """/* Small at rest; set into a recessed well once the panel is open. */
.feature-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: var(--neon);
  transition:
    width 480ms var(--ease),
    height 480ms var(--ease),
    background 480ms var(--ease),
    box-shadow 480ms var(--ease);
}

.feature-card[data-open='true'] .feature-mark {
  width: 50px;
  height: 50px;
  background: linear-gradient(225deg, #131a2a 0%, #0b101c 100%);
  box-shadow:
    0 6px 14px -2px rgba(0, 0, 0, 0.55),
    inset 1px 1px 3px rgba(255, 255, 255, 0.1),
    inset -2px -2px 5px rgba(0, 0, 0, 0.65);
}"""
if MARK_OLD in s:
    s = s.replace(MARK_OLD, MARK_NEW, 1)

H3_OLD = """.feature-card h3 {
  margin: 0;
  font-size: clamp(1.15rem, 1.8vw, 1.5rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--ice);
}"""
H3_NEW = """/* A mono label at rest; the display face once there is a panel around it. */
.feature-card h3 {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ice);
  transition: font-size 420ms var(--ease);
}

.feature-card[data-open='true'] h3 {
  font-family: var(--sans);
  font-size: clamp(1.15rem, 1.8vw, 1.5rem);
  letter-spacing: -0.02em;
  text-transform: none;
  white-space: normal;
}"""
if H3_OLD in s:
    s = s.replace(H3_OLD, H3_NEW, 1)

io.open(P, 'w', encoding='utf-8').write(s)
print('card is a control that opens into a panel')

print("done")
