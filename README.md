# QUFI Network — the living network

An immersive site where the network is the interface. Next.js (static export
capable), React Three Fiber, TypeScript, GSAP, custom GLSL.

## Running it

```
npm run dev      # http://localhost:4600
npm run build    # fully static output
npm run typecheck
```

Development query parameters (dev builds only):

- `?stats` — frame rate, tier, elapsed time, focused node, and a `window.__qufi`
  handle for scrubbing the opening sequence
- `?tier=low|medium|high|ultra` — force a quality tier to judge the composition
  at every device level from one machine

## Shape of the thing

The site is one continuous descent. There is no routing and there are no
scroll-triggered animations: the scrollbar is a position in the network, and
every value the scene reads is interpolated from where that position falls
between two chapters. That is what makes scrolling back up work — there is no
state to unwind, because there is no state, only a position.

```
app/            routes, metadata, styling
components/     the DOM layer: overlay copy, fallback
experience/     state machine, chapter definitions, scroll director, systems
network/        the data model: topology, simulation, economic layer
shaders/        GLSL
lib/            device capability, adaptive resolution
tools/          headless capture harnesses used to art-direct the sequence
```

### The data model comes first

Nothing on screen is decorative motion. `network/topology.ts` builds a network
whose structure follows the architecture — verifiers cluster into threshold
quorums, registry guardians sit on an inner band, anchors reach out to
underlying chains — and `NetworkEngine` routes signals along real edges as
Instruct → Verify → Settle. `network/economy.ts` adds the economic layer, where
a transaction has two independently prepared legs and only settles when both
are in place.

The renderer owns no state. The engine writes into two float textures each
frame and the shaders read them, so pointing this at live QUFI data later means
writing different numbers into the same textures with no shader changes.

### Performance

Three or four draw calls carry the whole scene. Everything is additive point
sprites and hairlines with no depth rejection, so fill rate is the only budget
that matters: `lib/capability.ts` sets counts, pixel-ratio ceilings and a
maximum sprite size per tier, and lets the GPU renderer string veto whatever the
CPU heuristic concluded. Integrated graphics get capped at `medium` because they
do not degrade gracefully past it — they reset the driver.

### Honesty constraints

The network is simulated and the page says so. Every claim traces to what QUFI
actually describes: hybrid post-quantum signatures, threshold quorums, the
spent-nullifier registry, collateral confirmation, verifiable records. The
demonstration asset is labelled as one. The closing paths state whether each is
live or in design.

## If you are rebuilding this

Six things in here are not obvious from the code and cost real time to find.
They are all still true of any reimplementation.

**Test at device pixel ratio 2.** Point sprites are sized in device pixels, so a
sprite that is sub-pixel at DPR 1 is invisible, and the same sprite at DPR 2 is a
visible dot. A whole class of artefact — stale particles, leftover frames — is
undetectable on a non-retina test rig and obvious on the machine of anyone
reading the site on a laptop made after 2016.

**Anything positioned from JavaScript needs a CSS position rule.** `CardManifest`
writes `left`/`top` to its canvas every frame from the card's bounding box. With
no rule making it `position: fixed`, those writes are inert, the canvas lays out
in flow at the top-left of the frame, and it holds its last painted frame
forever. Clearing the canvas is not enough on its own: hide it too, because one
frame always survives the tick on which its subject disappears.

**Do not put `overflow-x` on `html`.** The root's overflow propagates to the
viewport, and setting it stops the body's overflow propagating — the body
silently becomes its own scroll container and the page stops scrolling
altogether. If decoration is widening the document, fix the decoration.

**Full-screen fixed layers that centre content need `dvh`.** `inset: 0` resolves
against the large viewport — the one with the address bar hidden — so on a phone
that is showing its address bar, everything centred inside sits below the centre
of what the visitor can see. `height: 100dvh` with `100vh` under it as a
fallback. Do not do this to the WebGL container: resizing the drawing buffer
every time the address bar moves is worse than a slightly tall canvas.

**Fill rate is the only budget.** Additive point sprites and hairlines with
`depthTest: false` means every lit pixel is paid for and nothing is rejected
early. Moving the camera closer is the most expensive change available and never
looks like a performance decision at the time — a chapter that dropped from 60 to
20fps in this build did so because the camera came in eight units. Reach for a
wider lens instead.

**Reveal by integer rank, not by fraction.** `stage.reveal` counts nodes, and
each node carries the index at which it appears. Driving emergence with a
normalised 0..1 fraction means the sequence reads differently at every quality
tier, and on a large network the opening node never lights at all.

### The verification harnesses

`tools/` holds the headless harnesses this was art-directed with — they drive a
real GPU through Playwright, walk every chapter at several viewports, and report
off-screen text, overlapping text, horizontal overflow, frame rate and console
errors. They are the reason claims in this file are measurements rather than
impressions. `tools/bundle.mjs` produces `dist/qufi.html`: the whole site as one
self-contained file with the fonts inlined and no external requests, which is
the fastest way to see the finished thing without a server.
