"""Wires the per-journey colour through the stage, the chapters and every system."""
import io
import sys


def patch(path, pairs):
    s = io.open(path, encoding='utf-8').read()
    for old, new in pairs:
        if old not in s:
            sys.exit('missing in %s: %s' % (path, old[:80]))
        s = s.replace(old, new, 1)
    io.open(path, 'w', encoding='utf-8').write(s)
    print('patched', path)


# ---- stage ---------------------------------------------------------------
patch('experience/stage.ts', [(
    """  /** Which capability has come forward, and how present it is. */""",
    """  /**
   * The colour the network is wearing, and how much of it.
   *
   * Each journey has its own hue and the whole scene takes it on while the
   * visitor is inside — so which part of QUFI you are in is something you can
   * see without reading anything. Held as a target the director eases toward,
   * never set directly, or the palette would jump at every chapter boundary.
   */
  tint: new Vector3(1, 1, 1),
  tintAmount: 0,

  /** Which capability has come forward, and how present it is. */""",
), (
    """  stage.featureIndex = 0;""",
    """  stage.tint.set(1, 1, 1);
  stage.tintAmount = 0;
  stage.featureIndex = 0;""",
)])


# ---- chapters ------------------------------------------------------------
patch('experience/Chapters.ts', [(
    """  /** How far the pointer can push the structure around. */
  pointerAmp: number;
  bow: number;""",
    """  /** How far the pointer can push the structure around. */
  pointerAmp: number;
  bow: number;

  /**
   * The hue this chapter dresses the network in, as an RGB weight, and how
   * strongly. Neutral white at zero strength leaves the QUFI blue alone.
   */
  tint: [number, number, number];
  tintAmount: number;""",
), (
    """  economy: 0,
  district: -1,
  districtActivity: 0,
  moneyFlow: 0,
};""",
    """  economy: 0,
  district: -1,
  districtActivity: 0,
  moneyFlow: 0,
  tint: [1, 1, 1],
  tintAmount: 0,
};

/**
 * A colour per journey.
 *
 * Amber for assets, because that is the colour the demonstration asset arrives
 * in and the journey should belong to it. Green for money, the one hue in the
 * set that reads as value without being borrowed from anything else here.
 * Violet for settlement, sitting between the two it joins.
 */
const ASSET_TINT: [number, number, number] = [1.0, 0.7, 0.32];
const MONEY_TINT: [number, number, number] = [0.36, 1.0, 0.72];
const SETTLE_TINT: [number, number, number] = [0.74, 0.56, 1.0];""",
), (
    """    state: { ...ECONOMIC, intensity: 0.55, networkDim: 0.55, fieldDim: 0.3, district: 0 },""",
    """    state: {
      ...ECONOMIC,
      intensity: 0.55,
      networkDim: 0.55,
      fieldDim: 0.3,
      district: 0,
      tint: ASSET_TINT,
      tintAmount: 0.72,
    },""",
), (
    """      district: 1,
      moneyFlow: 1,
    },""",
    """      district: 1,
      moneyFlow: 1,
      tint: MONEY_TINT,
      tintAmount: 0.66,
    },""",
), (
    """      district: 2,
      districtActivity: 1,
    },""",
    """      district: 2,
      districtActivity: 1,
      tint: SETTLE_TINT,
      tintAmount: 0.6,
    },""",
)])


# ---- the director eases between them -------------------------------------
patch('experience/systems/ScrollDirector.tsx', [(
    """    districtActivity: mix(a.districtActivity, b.districtActivity),
    moneyFlow: mix(a.moneyFlow, b.moneyFlow),
  };
}""",
    """    districtActivity: mix(a.districtActivity, b.districtActivity),
    moneyFlow: mix(a.moneyFlow, b.moneyFlow),
    tint: [mix(a.tint[0], b.tint[0]), mix(a.tint[1], b.tint[1]), mix(a.tint[2], b.tint[2])],
    tintAmount: mix(a.tintAmount, b.tintAmount),
  };
}""",
), (
    """    stage.moneyFlow = state.moneyFlow;""",
    """    stage.moneyFlow = state.moneyFlow;
    // Eased rather than assigned, so a fast scroll slides the palette across
    // instead of cutting between two of them.
    const tintFollow = 1 - Math.exp(-delta * 3.2);
    stage.tint.x += (state.tint[0] - stage.tint.x) * tintFollow;
    stage.tint.y += (state.tint[1] - stage.tint.y) * tintFollow;
    stage.tint.z += (state.tint[2] - stage.tint.z) * tintFollow;
    stage.tintAmount += (state.tintAmount - stage.tintAmount) * tintFollow;""",
)])


# ---- every system reads it -----------------------------------------------
SYSTEMS = [
    ('experience/systems/NodeSystem.tsx', 'u.uFogFar.value = stage.fogFar;'),
    ('experience/systems/ConnectionSystem.tsx', 'u.uFogFar.value = stage.fogFar;'),
    ('experience/systems/ParticleField.tsx', 'u.uFogFar.value = stage.fogFar * 1.3;'),
]
for path, hook in SYSTEMS:
    s = io.open(path, encoding='utf-8').read()
    if hook not in s:
        sys.exit('hook not found in ' + path)
    s = s.replace(hook, hook + '\n    u.uTint.value = stage.tint;\n    u.uTintAmount.value = stage.tintAmount;', 1)
    s = s.replace('      uDim: { value: 0 },',
                  '      uDim: { value: 0 },\n      uTint: { value: stage.tint },\n      uTintAmount: { value: 0 },', 1)
    io.open(path, 'w', encoding='utf-8').write(s)
    print('wired', path)

# Systems that loop over two materials need the assignment inside the loop.
LOOPED = [
    ('experience/systems/DistrictSystem.tsx', '      u.uFogFar.value = stage.fogFar * 1.2;',
     '    uDim: { value: 0 },'),
    ('experience/systems/SubstrateLayer.tsx', '      u.uFogFar.value = stage.fogFar * 1.3;',
     '    uDim: { value: 0 },'),
]
for path, hook, uniform_anchor in LOOPED:
    s = io.open(path, encoding='utf-8').read()
    if hook not in s or uniform_anchor not in s:
        sys.exit('hook not found in ' + path)
    s = s.replace(hook, hook + '\n      u.uTint.value = stage.tint;\n      u.uTintAmount.value = stage.tintAmount;', 1)
    s = s.replace(uniform_anchor,
                  uniform_anchor + '\n    uTint: { value: stage.tint },\n    uTintAmount: { value: 0 },', 1)
    io.open(path, 'w', encoding='utf-8').write(s)
    print('wired', path)

# The Core has two materials with separate uniform objects.
patch('experience/systems/QuFiCore.tsx', [(
    """      shellUniform.uFogFar.value = stage.fogFar;""",
    """      shellUniform.uFogFar.value = stage.fogFar;
      shellUniform.uTint.value = stage.tint;
      shellUniform.uTintAmount.value = stage.tintAmount;""",
), (
    """      chordUniform.uFogFar.value = stage.fogFar;""",
    """      chordUniform.uFogFar.value = stage.fogFar;
      chordUniform.uTint.value = stage.tint;
      chordUniform.uTintAmount.value = stage.tintAmount;""",
), (
    """      uDim: { value: 0 },
      uMaxPointSize: { value: capability.maxPointSize },
    }),
    [capability.maxPointSize],
  );

  const chordUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCoherence: { value: 0 },
      uFogNear: { value: 6 },
      uFogFar: { value: 120 },
      uDim: { value: 0 },
    }),
    [],
  );""",
    """      uDim: { value: 0 },
      uMaxPointSize: { value: capability.maxPointSize },
      uTint: { value: stage.tint },
      uTintAmount: { value: 0 },
    }),
    [capability.maxPointSize],
  );

  const chordUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCoherence: { value: 0 },
      uFogNear: { value: 6 },
      uFogFar: { value: 120 },
      uDim: { value: 0 },
      uTint: { value: stage.tint },
      uTintAmount: { value: 0 },
    }),
    [],
  );""",
)])
