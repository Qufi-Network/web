# The papers

The three investor documents the data room shows. They are **not** in this
repository and must not be: it is public, and a PDF committed here is served
from `raw.githubusercontent.com` with none of the viewer's protection in front
of it.

What belongs here at runtime:

| File | Document | Data room id |
|---|---|---|
| `investor-memorandum.pdf` | QuFi Investor Memorandum | `investor-memorandum` |
| `investor-thesis.pdf` | QuFi Investor Thesis | `investment-thesis` |
| `corporate-overview.pdf` | QuFi Corporate Overview | `corporate-overview` |

The route that serves them is `app/data-room/paper/[id]/route.ts`. It reads
from this directory by default; set `QUFI_PAPERS_DIR` to read from somewhere
else — a mounted volume or a directory outside the deployment, which is the
better arrangement on a host that keeps the checkout world-readable.

A document whose file is missing degrades honestly: the data room drops the
View control and the page reads as it did before the papers existed. Nothing
breaks and nothing lies.
