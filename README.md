# PAC Machinery demo

An English demonstration of two sales workflows: PAC product exploration through a priced draft proposal, and interactive 3D discovery through a reviewed quotation conversation.

[Open the demo](https://kyle-annora.github.io/pac-machinery-demo/) · [Open 3D discovery](https://kyle-annora.github.io/pac-machinery-demo/#discovery)

## Demo paths

- **PAC configuration:** inspect the R3200 and option photographs, attach a reference, confirm application requirements, configure options, and prepare a proposal.
- **3D discovery:** orbit, select, isolate or explode the reference assembly; preserve a component and saved view; review an inquiry; issue illustrative quotation v1; request a change; compare v2; and agree a next step.

Use **Continue demo** to follow the 3D walkthrough. Review steps require a separate confirmation. **Guide → Start a new sample** starts another demonstration without removing earlier projects.

The crank-slider is a licensed reference assembly, not PAC or R3200 CAD. Its quotation data is fictional. PAC prices come from the supplied November 6, 2026 catalog snapshot and do not constitute a binding offer. No request, order or payment is sent.

## Run locally

Requires Node.js 20 or newer. No dependency installation is needed.

```sh
npm start
```

Open the local URL printed by the server. The runtime catalog is included in `data/catalog`. Set `ROLLBAG_SOURCE` to use another compatible snapshot.

```sh
npm test
npm run build
```

The build creates `dist/` for the `/pac-machinery-demo/` GitHub Pages path. The exporter can also accept explicit `--base`, `--out`, and `--source` arguments. It rewrites deployment paths in copied text files, preserves binary assets and licenses, and gives the hosted Explorer its own browser-storage namespace.

## Hosting and data

`main` contains the source and prebuilt Explorer. `gh-pages` contains the static site, published from its root with `.nojekyll`. GitHub Pages serves the application without a server process.

Drafts are stored in the current browser. The public site has separate storage from the localhost demo and the standalone Annora Explorer. Existing local drafts do not automatically transfer. A draft JSON export provides a separate backup; import and cross-device synchronization are not included.

The published catalog contains runtime product records and referenced media. Its manifest retains source identity and approval-status fields; extraction logs, internal source documents, local paths, exported customer drafts, and development evidence are excluded.

## Scope and verification

The local combined workflow was rehearsed at desktop and mobile viewport sizes, including reference restoration, quote revisions, save/reopen and unsaved-edit protection. The focused repository tests cover catalog rules, reference/requirements history, parent navigation and the static exporter.

Explorer startup deadlines now preserve their remaining budget while the document is hidden or suspended. A terminal startup failure cannot later report readiness from a stale frame. The renderer still requires its actual first frame; ordinary commands and teardown retain their existing deadlines. The isolated Explorer verification passed 1,036 tests with one existing conditional skip, including 26 new startup regressions. This fixes the reproduced lifecycle failures; it does not establish that every earlier loading stall had the same cause. Route-aware Retry recovery remains available.

PAC engineering, brand and commercial approval remain separate from this demo. The intended review establishes the first use case, required PAC assets, quotation ownership and pilot acceptance criteria.

## Attribution

See [NOTICE.txt](NOTICE.txt) and the complete [Explorer license bundle](assets/explorer/LICENSES.txt). PAC product content and branding are not relicensed under the Explorer software license. The upstream Explorer and the reproducible integration changes are identified in `vendor/annora-explorer/`.
