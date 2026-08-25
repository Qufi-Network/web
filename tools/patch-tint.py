"""Gives every system that draws the network a per-journey tint."""
import io
import sys

TINT_SNIPPET = """
  uniform vec3  uTint;
  uniform float uTintAmount;

  /**
   * Shifts a colour toward the journey's hue without changing how bright it is.
   * Declared here rather than pulled from the shared chunk because these are
   * fragment shaders and do not otherwise need it.
   */
  vec3 qufiApplyTint(vec3 colour) {
    if (uTintAmount < 0.001) return colour;
    float lum = dot(colour, vec3(0.2126, 0.7152, 0.0722));
    return mix(colour, uTint * lum * 1.3, uTintAmount);
  }
"""

# (file, marker to insert the snippet after, final-colour expression, replacement)
TARGETS = [
    (
        'shaders/node.ts',
        '  uniform float uGlyphs;',
        'vec3 colour = qufiTint(vColor * (1.0 + vCharge * 0.55), uTint, uTintAmount);',
        'vec3 colour = qufiApplyTint(vColor * (1.0 + vCharge * 0.55));',
    ),
    (
        'shaders/connection.ts',
        '  varying float vAlpha;',
        'gl_FragColor = vec4(vColor, vAlpha);',
        'gl_FragColor = vec4(qufiApplyTint(vColor), vAlpha);',
    ),
    (
        'shaders/economy.ts',
        '  uniform float uIsLine;\n\n  void main() {\n    float mask = 1.0;\n    if (uIsLine < 0.5) {\n      vec2 p = gl_PointCoord - 0.5;\n      float r2 = dot(p, p);\n      mask = exp(-r2 * 28.0) + exp(-r2 * 7.0) * 0.3;',
        'gl_FragColor = vec4(colour, mask * vAlpha);\n  }\n`;\n\n/**\n * The demonstration asset.',
        'gl_FragColor = vec4(qufiApplyTint(colour), mask * vAlpha);\n  }\n`;\n\n/**\n * The demonstration asset.',
    ),
]


def insert_snippet(source, marker):
    if marker not in source:
        return None
    return source.replace(marker, marker + '\n' + TINT_SNIPPET, 1)


for path, marker, old_colour, new_colour in TARGETS:
    s = io.open(path, encoding='utf-8').read()
    updated = insert_snippet(s, marker)
    if updated is None:
        sys.exit('marker not found in %s: %s' % (path, marker[:60]))
    if old_colour not in updated:
        sys.exit('colour expression not found in %s' % path)
    updated = updated.replace(old_colour, new_colour, 1)
    io.open(path, 'w', encoding='utf-8').write(updated)
    print('tinted', path)


# The Core, substrate and field each end in a single gl_FragColor we can wrap.
SIMPLE = [
    ('shaders/core.ts', '  varying float vBand;',
     'gl_FragColor = vec4(colour * (0.75 + vBand * 0.6), mask * vAlpha);',
     'gl_FragColor = vec4(qufiApplyTint(colour * (0.75 + vBand * 0.6)), mask * vAlpha);'),
    ('shaders/core.ts', '  precision highp float;\n  varying float vAlpha;\n  void main() {',
     'gl_FragColor = vec4(0.36, 0.72, 1.0, vAlpha);',
     'gl_FragColor = vec4(qufiApplyTint(vec3(0.36, 0.72, 1.0)), vAlpha);'),
    ('shaders/substrate.ts', '  uniform float uIsLine;',
     'gl_FragColor = vec4(colour, mask * vAlpha);',
     'gl_FragColor = vec4(qufiApplyTint(colour), mask * vAlpha);'),
    ('shaders/field.ts', '  varying float vTemp;',
     'gl_FragColor = vec4(colour, mask * vAlpha);',
     'gl_FragColor = vec4(qufiApplyTint(colour), mask * vAlpha);'),
]

for path, marker, old_colour, new_colour in SIMPLE:
    s = io.open(path, encoding='utf-8').read()
    if 'qufiApplyTint' in s and marker in s and old_colour not in s:
        print('already done', path, marker[:30])
        continue
    updated = insert_snippet(s, marker)
    if updated is None:
        sys.exit('marker not found in %s: %s' % (path, marker[:60]))
    if old_colour not in updated:
        sys.exit('colour expression not found in %s: %s' % (path, old_colour[:50]))
    updated = updated.replace(old_colour, new_colour, 1)
    io.open(path, 'w', encoding='utf-8').write(updated)
    print('tinted', path, marker[:28])
