# PAC Machinery demo

An English, proposal-first demonstration of PAC's sales workflow: one deal contains alternative quotes, reviewed revisions, customer feedback, a next action and captured 3D evidence.

[Open the customer proposal](https://kyle-annora.github.io/pac-machinery-demo/) · [Open the sales workspace](https://kyle-annora.github.io/pac-machinery-demo/#workspace)

## Monday walkthrough

1. Present the staged customer proposal: R3200 standard loading ($33,060) and assisted loading ($40,810), both including the source-priced training line. These are alternatives under one deal, each starting at Rev 0.
2. Open the sales workspace and the same deal: owner, scope, CRM reference, stage, comments and next action.
3. Create a revision, configure options, request engineering work and enter hours/materials under the Engineering demo role.
4. Open 3D Explorer from that deal, select a component, capture its actual view, review the evidence and attach it. Restore the saved view from the same deal.
5. Complete the required reviews, issue the revised quote, then return to the proposal to review revision-bound comments and print the customer-facing snapshot.

See [the English presenter guide and PAC decision checklist](docs/MONDAY-DEMO.md). The original product catalog and standalone reference walkthrough remain available for supporting exploration; the main demo uses the connected deal workflow.

The crank-slider is a licensed reference assembly, not PAC or R3200 CAD. Customer details, CRM references, approvals and the configurable $150/hour engineering rate are illustrative. PAC catalog prices come from the supplied November 6, 2026 snapshot and do not constitute a binding offer. No request, email, order or payment is sent.

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

Deals, quotes, issued revisions, comments and captured views are stored in the current browser. The public site has separate storage from localhost and the standalone Annora Explorer. Existing product drafts are retained. Workspace export provides a JSON backup. Cross-device synchronization, multi-user access, CRM integration, SSO, approval email, e-signature and payment processing are not connected. Demo role switching illustrates workflow rules and is not an authentication boundary.

The published catalog contains runtime product records and referenced media. Its manifest retains source identity and approval-status fields; extraction logs, internal source documents, local paths, exported customer drafts, and development evidence are excluded.

## Workflow rules and verification

The sales domain requires a deal reference before assigning quote numbers. Missing application information, unresolved pricing and required reviews block issuance. Commercial, scope and evidence edits invalidate reviews of the affected draft. Issued revisions are copied independently; editing requires a new revision. The customer proposal uses an explicit issued-snapshot projection that excludes internal labor/material/rate fields and internal comments. All source workspace data still lives in the same demo browser; this projection is not a server-enforced access boundary.

Tests cover catalog constraints, review invalidation, pricing and role gates, immutable revisions, customer projection, comment/version binding, evidence ownership, reload retention, iframe origin/session validation, navigation and static deployment paths. Current rehearsal evidence is kept separately from the earlier discovery-demo baseline.

The original discovery workflow was rehearsed at desktop and mobile sizes, including reference restoration, quote revisions, save/reopen and unsaved-edit protection. Its historical acceptance does not establish acceptance of subsequent sales-workspace changes.

Explorer startup deadlines now preserve their remaining budget while the document is hidden or suspended. A terminal startup failure cannot later report readiness from a stale frame. The renderer still requires its actual first frame; ordinary commands and teardown retain their existing deadlines. The isolated Explorer verification passed 1,036 tests with one existing conditional skip, including 26 new startup regressions. This fixes the reproduced lifecycle failures; it does not establish that every earlier loading stall had the same cause. Route-aware Retry recovery remains available.

PAC engineering, brand and commercial approval remain separate from this demo. The intended review establishes the first use case, required PAC assets, quotation ownership and pilot acceptance criteria.

## Path 01 interface

The product, requirements, configuration and proposal screens use a scoped PAC workspace style in `src/workspace.css`. Option rows keep price and selection controls aligned, while disclosures retain the full source description and conditions. Proposal pricing uses a semantic four-column table with a separate mobile layout and print rules.

The visual refinement retains PAC blue, navy and gold. References include [Programa](https://programa.design/) for restrained surfaces, [Ramp purchase orders](https://support.ramp.com/purchases-orders-in-ramp/) for the working area and review panel, and [Stripe’s invoice sample](https://stripe.com/files/docs/billing/taxes/example-reverse-charge.pdf) for numeric column alignment. The sales workspace extends this system with the bounded references documented in [DESIGN.md](DESIGN.md). Explorer bundles remain unchanged; the new host adapter uses the public capture/restore API.

## Attribution

See [NOTICE.txt](NOTICE.txt) and the complete [Explorer license bundle](assets/explorer/LICENSES.txt). PAC product content and branding are not relicensed under the Explorer software license. The upstream Explorer and the reproducible integration changes are identified in `vendor/annora-explorer/`.
