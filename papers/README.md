# The papers

The three investor documents the data room shows. They are in this repository, on the
owner's decision.

That decision has a consequence worth stating plainly: this repository is
public, so every file here is served from `raw.githubusercontent.com` as a
direct download. The viewer's arrangement — pages drawn to canvases, no
toolbar, no context menu, a route that only answers same-origin requests — is
still true of the site, and none of it applies to a raw GitHub URL. Anyone who
knows the path has the file.

The alternative, if that is ever reconsidered, is to make the repository
private, or to gitignore `papers/*.pdf` again and place them on the host at
deploy time. The route reads `QUFI_PAPERS_DIR` for exactly that.

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
else, such as a mounted volume outside the deployment.

A document whose file is missing degrades honestly: the data room drops the
View control and the page reads as it did before the papers existed. Nothing
breaks and nothing lies.
