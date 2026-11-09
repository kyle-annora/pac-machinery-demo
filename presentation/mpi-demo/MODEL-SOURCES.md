# MPI 35 Series demonstration model

This is an **illustrative MPI 35 Series study**, not MPI engineering CAD. It is
the already-authored model used by the current MPI Website review, adapted into
an isolated, clock-controlled demonstration. It is not a PAC machine, a new
machine reconstruction, a production deployment, or evidence that MPI has
deployed this Explorer to customers.

## Source snapshot

The source project is the local `mpi-website` review under
`outputs/mpi-codex-handoff-2026-11-02/mpi-website`. Its base Git commit at capture
was `f03145976965f95375ded6fdc33da343f5846179`; it has active working-tree changes.
**The per-file SHA-256 values in `vendor/SOURCE-MANIFEST.json` pin the actual
November 9 snapshot**, rather than claiming the base commit contains it.

Unchanged source files are retained under `vendor/original/`:

- `machine-geometry.js`: original shared 35 Series shapes and coordinate system.
- `render-study.js`: the existing platen, cabinet and finished-edge helpers.
- `complex-graphic-machine.js` and `precision-machine-finish.js`: current
  homepage precision presentation, original materials and contact shadow.
- `machine-explorer-engine.js`: provenance for the existing tooling-opening
  mapping and available area views. This full engine is not executed here.
- `machine-explorer-pack.js`: original authority, public source and capability
  declarations. This package is not a machine configuration or bill of materials.

The original project describes the proportions as derived from MPI's published
front and side brochure views. Its source is the
[MPI 35 Series product page](https://www.mpi-systems.com/machines/wax-injection-equipment/mpi-35-series-4-post/).
The existing opening presentation maps a normalized value to 6–48 inches of
daylight. These values do not validate a customer's tooling, installation,
cycle time, safety or physical clearance. The demonstration must retain its
illustrative-model qualification.

## Bounded adaptations

`vendor/precision-model.js` is a separately identified derivative of the copied
`complex-graphic-machine.js`. It changes import/texture paths, exposes the
existing machine and moving groups to the adapter, and rejects missing texture
loads instead of claiming a ready branded model. It does not change the source
geometry construction.

`model.js` adds a neutral presentation stage, responsive camera framing,
host-driven interpolation, controlled orbit, the existing opening mapping,
manual interaction callbacks and view capture/restore. It uses the current
precision materials, lighting and contact-shadow implementation. There is no
explosion, arbitrary CAD-part selection, inquiry submission or commercial state.

## Original media and licenses

`vendor/assets/mpi-logo.png` and `mpi-control-interface.webp` are byte-identical
copies of the MPI Website review's original MPI mark and control-screen image.
They are used only on the same existing model surfaces. They retain MPI's
rights; the Three.js software license does not license MPI imagery or marks.
The copied source project identifies these as source imagery used in its
customer website proposal, not generally open-licensed assets. This package
does not claim an open-source license for MPI geometry or imagery.

Three.js **0.187.0** and its bundled addons are MIT licensed. The complete
license is retained at `vendor/THREE-LICENSE.txt`, and bundle license comments
are preserved. No font, CDN, remote texture or model download is required by
the runtime. Source project files remain untouched.

## Adapter contract

```js
const model = await createDemoModel(container, { onInteraction, onError });
model.setPaused(false);
model.frame('tooling', { duration: 1.2 });
// Host requestAnimationFrame loop; seconds, not milliseconds:
model.update(dtSeconds);
```

- The asynchronous factory resolves after its two local textures and first
  render. `ready` is then `true`; loading failure rejects the factory.
- Areas: `whole`, `tooling`, `controls`, `injection`.
- `frame(area, {duration})` changes the presentation camera. Duration `0`
  applies immediately, including while paused, for reduced motion or navigation.
- `setPaused(true)` holds scripted camera interpolation. `setOpening(value)`
  applies an explicit 0–1 pose; the host controls its timing and pauses.
- `update(dtSeconds)` advances interpolation only when unpaused and renders
  changed poses. There is no internal animation loop or autoplay.
- `orbit(horizontalRadians, verticalRadians=0)` applies a small scripted orbit
  only when unpaused, settled and not being manually manipulated.
- `isSettled()` reports no camera transition or active manual interaction.
- `capture()` returns the actual model revision, area, opening, camera,
  orthographic framing and zoom. It rejects unsettled views. **It is a view
  bookmark, not a screenshot, inquiry or evidence attachment.**
- `restore(bookmark)` validates the exact model identity and restores that state.
  Framing remains responsive to the current container's aspect ratio.
- `reset()` immediately restores the full machine and open pose. It preserves
  the caller's paused state. `destroy()` releases the renderer and model resources.
- Manual controls invoke `onInteraction`, cancel the current scripted camera
  transition and hold script motion. The host must also hold its own timeline;
  resuming/re-entering a beat is an explicit host decision.
- WebGL context loss invokes `onError`. The host owns retry/fallback/return UI.

All storage belongs to the host's isolated demo namespace. This adapter reads
and writes no storage, sends no messages, and has no connection to a PAC Deal.

## Rebuild

The checked-in `vendor/mpi35.bundle.js` is self-contained. Rebuilding is only
needed after an authorized source or dependency change. Supply a dependency
directory containing exactly `three@0.187.0` and `esbuild@0.25.12`:

```sh
node presentation/mpi-demo/vendor/build.mjs --dependencies /path/to/node_modules
node --check presentation/mpi-demo/model.js
node --check presentation/mpi-demo/vendor/mpi35.bundle.js
```

The builder verifies the pinned source/media hashes first. Browser layout,
full playback, hold/resume and WebGL verification remain separate release
checks; successful bundling alone does not establish them.
