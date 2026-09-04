# The papers

The three investor documents the data room shows. They are **not** in this
repository and must not be: it is public, and a PDF committed here is served
from `raw.githubusercontent.com` with none of the viewer's protection in front
of it.

What belongs here at runtime:

| File | Document | Data room id |
|---|---|---|
| `investor-memorandum.pdf` | QuFi Investor Memorandum | `investor-memorandum` |
| `investor-memorandum-light.pdf` | the same, drawn for a white page | |
| `investor-thesis.pdf` | QuFi Investor Thesis | `investment-thesis` |
| `product-overview.pdf` | QuFi Product Overview | `product-overview` |
| `product-overview-light.pdf` | the same, drawn for a white page | |
| `corporate-overview.pdf` | QuFi Corporate Overview | `corporate-overview` |

## Light versions

Where a `-light` file exists, the standard site loads it instead of inverting
the dark one, and shows it exactly as drawn. They are separate documents rather
than recoloured ones and can differ in length, so the page count follows
whichever is open.

Where one does not exist yet the light view falls back to inverting: lightness
flipped, hue rotated back, photographs patched in un-inverted and the deck's
lockup replaced. That machinery only runs for the papers without a light file,
and a light file is always the better answer.

The route that serves them is `app/data-room/paper/[id]/route.ts`. It reads
from this directory by default; set `QUFI_PAPERS_DIR` to read from somewhere
else — a mounted volume or a directory outside the deployment, which is the
better arrangement on a host that keeps the checkout world-readable.

A document whose file is missing degrades honestly: the data room drops the
View control and the page reads as it did before the papers existed. Nothing
breaks and nothing lies.
