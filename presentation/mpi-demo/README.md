# MPI guided capability example

An isolated, six-scene, approximately 80-second example after the PAC pitch's
process baseline (page 16). The slide’s Start link begins playback after model loading.
A direct visit waits for Start. Pause/resume as needed, then return to
customer outcomes (page 18). Customer outcomes still immediately precede the
two-week trial offer (page 19). The full deck contains 22 pages.

## Authoring

- `sequence.mjs`: canonical English scene titles, durations, spoken script and actions.
- `index.html`, `demo.css`: audience stage. Same Manrope, original co-brand assets,
  charcoal, restrained orange and fixed 1920×1080 geometry as the approved pitch.
- `app.js`: deterministic choreography, explicit start, pause and recorded fallback.
- `model.js`: the pinned MPI study adapter. See `MODEL-SOURCES.md` for identity and licenses.
- `notes.html`: separate English presenter script, generated from `sequence.mjs` at runtime.
- `test.mjs`: clock, pause, transition-settle and safe return-link checks.

Run `node --test presentation/mpi-demo/test.mjs` from the source root. Serve the
root over HTTP and open `presentation/mpi-demo/`. The canonical pitch build
copies this entire isolated runtime into the published presentation folder.

## Reference lock

The user's accepted PAC pitch and `presentation/system/PITCH-DESIGN-RULES.md`
are the primary visual target. The existing MPI precision study supplies the
real model and materials. Refero's Linear Changelog style (source
https://linear.app/changelog, style ID `11d3e58a-87d7-4a9a-bbf5-720f4fd3ffc6`)
supports only low-prominence controls, strong text contrast and restrained
surface separation. Its font, pill buttons and dense text layout are rejected
in favor of the already-approved PAC rules. No new visual direction is implied.

The model and complete text/action column have identical top and bottom edges.
Their geometry never changes between beats. Spoken narration stays out of the
audience area. Only the prepared question appears during the final two beats.

## Playback contract

Start is disabled until the local model and textures are ready. The clock only
advances while running and waits at scene boundaries for camera transitions.
Pause freezes both the sequence and scripted model motion. Hiding the tab or
manually touching the model pauses. Resume continues; Restart clears only this
example's state. The ending does not navigate automatically.

Reduced-motion preference removes slow orbit and smooth camera/opening motion;
the same six story beats advance automatically with discrete state changes.
The recorded fallback uses actual captured MPI views, visibly labeled. It does
not claim a live save or restoration. A missing live renderer offers that
fallback and always retains a return-to-pitch link.

## Boundaries

The model is an illustrative MPI study, not MPI CAD, PAC equipment or evidence
of a production Explorer deployment. Saved state is local to
`pac-pitch-mpi-example-v1` in session storage. The prepared question and real
view state form only this demonstration's record. No inquiry, deal, quote,
price, customer message or CRM integration is created. Website, Sales Workspace
and the existing PAC guided demo stay unchanged. Do not attribute MPI's quoted
business results to this new example or add 3D modeling to the trial promise.
