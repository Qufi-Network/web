# QuFi — the living network

The QuFi site is not a page about QuFi. It is the network, and the site is the
way in: one continuous WebGL environment with eight places in it, and one wheel
that carries you through all of them.

Next.js (static export capable), React Three Fiber, TypeScript, GSAP, custom
GLSL.

## Running it

```
npm run dev      # http://localhost:4600
npm run build
npm run typecheck
```

Development query parameters (dev builds only):

- `?stats` — a `window.__qufi` handle for scrubbing the opening, moving along
  the route, reading the navigation store, and evaluating the camera at any
  point on the route without going there
- `?tier=low|medium|high|ultra` — force a quality tier, to judge the
  composition at every device level from one machine

## Shape of the thing

There is one axis in this site and the wheel is on it. Scrolling does not
advance a page and does not zoom: it carries the visitor along a single route
that starts in the open network, goes into the Core, moves through what the Core
does, flies out to post-quantum signing, moves through that, and on through all
eight spaces before pulling back out to the whole network again. There is no
point on that route where the visitor has to stop and choose something for it to
continue.

The route is one number.

```
[0, 1)       the open network, closing in
[1+i, 2+i)   space i — the first 40% is the flight in, the rest is that
             space's own sequence under the visitor's hand
[9, 10]      pulling back out to the whole network
```

`experience/systems/SpaceDirector.tsx` owns it and is the only thing that writes
to the camera or to what each space is doing. `experience/Spaces.ts` is the map:
where each structure stands, what shape it takes, what colour it burns, and the
very few words it says. Moving a structure is a change to one array entry.

Selecting a structure, tapping a point on the navigation map, or pressing a
number key is a **shortcut onto the same route** rather than a different mode: it
flies there and hands the wheel back.

```
app/            routes, metadata, styling
components/     the DOM layer: the HUD, the reading column, the document pages
experience/     the route, the spaces, the opening, the frame systems
network/        the data model: topology, simulation, the structure geometry
shaders/        GLSL
lib/            device capability, adaptive resolution
tools/          headless harnesses used to art-direct and check the thing
```

### Three places, one of which is a network

`/` is the environment. `/product` and `/data-room` are documents, held apart
from it deliberately: the network is one continuous thing and cutting a page
into it would put a document in the middle of a location. The same three
controls sit in the same corner of all three, so moving between them is one
gesture from any of them.

The environment locks the body — there is nothing to scroll inside it, and the
wheel belongs to the camera. A document undoes that while it is on screen and
puts it back on the way out; `components/site/DocPage.tsx` is where.

### Three draw calls carry the environment

Seven of the eight structures live in **one** points buffer, built once by
`network/structures.ts` and never touched again. Everything that changes — where
a structure stands, how present it is, where it is in its own cycle, whether the
visitor is inside it — goes to the GPU as a four-row float texture with one
column per space, which the vertex shader samples. The pathways between spaces
read the same texture, which is why moving into one space dims every pathway
that does not touch it without anything having to say so.

The Core is the exception, and deliberately: it has to assemble out of the node
field itself, so it owns its own system.

The renderer owns no state anywhere. The engine writes numbers into float
textures and the shaders read them, so pointing this at live QuFi data later
means writing different numbers into the same textures with no shader changes.

### A phone is a different composition, not a narrower one

The structure takes the top of the frame and the words take the bottom. That is
a camera decision as much as a layout one — the only way to put an object above
the middle of a frame is to aim below it — so both halves live together:
`stage.portrait` in the director, and the sheet in the mobile block of
`app/network.css`.

The finger is listened for on the window rather than on the canvas, because the
words cover the bottom half of the screen and that is where a thumb starts a
swipe. A flick carries after release; a touch stops it, the way it stops a page.

### Honesty constraints

The network is simulated and the page says so. Every claim traces to what QuFi
describes: an independent verification layer between action and settlement,
post-quantum signing, proof generation off the settlement path, collateral
confirmation, proof-gated movement, recovery pathways, and multiple settlement
environments. There is no commercial or investor material anywhere in the
experience — the source one-pager was used for the technology and the visual
language only.

The full content is also in the markup as a plain document, always, whether or
not a GPU was involved.

## If you are rebuilding this

Things in here that are not obvious from the code and cost real time to find.

**Fill rate is the only budget, and a sprite costs the square of its size.**
Everything is additive point sprites and hairlines with `depthTest: false`, so
every lit pixel is paid for and nothing is rejected early. The failure mode is
not a slow frame — on integrated graphics it is a driver reset, and the page
comes back as the static fallback. Two structures found it first: the
computational field around the proof lattice, and the settlement constellation.
The fix is three lines in the vertex shader: unresolved points draw small, the
sprite ceiling for structures sits well below the one participants use, and
anything closer than a few units to the lens is faded out. The ceiling is also
what makes geometry read as geometry — a lattice in twenty-pixel sprites is a
cloud of blobs whatever its shape.

**One emitter builds all seven structures, so "how much have I used" is a
question about the structure and not about the buffer.** Every generator spends
what is left of its budget on its last part. Against a running total across the
whole buffer that answer goes negative after the first structure, and the proof
kernel, the gateway beam, the recovery packet and the settlement links all
silently became zero points. `tools/census.mjs` prints what was actually
generated and would have caught it in a second.

**Standing inside a structure is not the same as looking at one.** The
surrounding network has to get out of the way, and dimming does not do it: a
participant four units from the lens is a thirty-pixel sprite whatever its
alpha. `stage.inside` moves the near cut out and brings the sprite ceiling down
together.

**Additive sprites do not dim as you approach them, they get larger.** The Core
is beautifully lit from eighty units out and is a white hole with no structure
in it from forty-six — which is exactly where the route passes it.

**Frame each space against what it measures.** Local extents run from a
two-thirds-radius lattice to a one-and-a-half-radius field, so a distance that
frames one puts the camera inside another. `tools/census.mjs` prints the extents
the `view.out` numbers were set from.

**The promotion threshold in the adaptive resolution has to be read against
vsync.** A 60Hz display cannot report a mean frame time below about 16.7ms
however much headroom the GPU has, so a condition of twelve milliseconds can
never be met: resolution only ever went down, and one heavy moment in the
opening left the whole site soft for the rest of the visit.

**An absolutely positioned paragraph is still offset by its own margin.** The
coordinate readout sat eleven pixels below the line it shared with the mark for
exactly that reason.

**Reveal by integer rank, not by fraction.** `stage.reveal` counts participants
and each one carries the index at which it appears. A normalised 0..1 fraction
reads differently at every quality tier, and on a large network the opening
point never lights at all.

**Test at device pixel ratio 2.** Point sprites are sized in device pixels, so a
sprite that is sub-pixel at DPR 1 is invisible and the same sprite at DPR 2 is a
visible dot.

**Do not edit source while a capture harness is running, and kill the browser it
leaves behind.** The dev server reloads the page under a running harness and the
run photographs the opening eight times instead of eight structures. Worse, a
harness that is stopped rather than finished leaves a Chromium rendering this
scene at sixty frames a second forever, which starves the next run badly enough
to reset the driver. Both look exactly like renderer bugs.

### The harnesses

`tools/` drives a real GPU through Playwright — software rasterising this much
additive overdraw blocks the page past any sensible timeout, so
headless-with-SwiftShader is not an option.

- `route.mjs` — scrolls the whole site end to end, checks the spaces arrive in
  order, and then evaluates the camera at two thousand points along the route to
  prove it is continuous. Sampling by wheel notch cannot answer that question: a
  fast flight and a seam look the same
- `swipe.mjs` — real touch events through the debugger: a swipe that starts on
  the reading column, a flick that carries after release, a tap that still
  selects, and the whole route by thumb
- `network.mjs` — the opening beat by beat, and every space entered and
  travelled through, with frame rate per space
- `cost.mjs` — what the scene costs at every tier, in the two places that matter
- `census.mjs` — what the structure generator actually produced, per space and
  per part, with local extents
- `topbar.mjs` — the three things across the top, measured against each other at
  four widths
- `pages.mjs` — the document routes and getting between the three places
- `verify.mjs` — reduced motion, no WebGL, keyboard-only
- `probe.mjs` — the navigation store and the camera, printed as commands are
  issued. The shortest way to find out whether the scene or the state is lying
- `map.mjs`, `wheel.mjs` — the navigation map's labels, and whether the wheel
  reaches the route at all
- `bundle.mjs` — the whole site as one self-contained HTML file
