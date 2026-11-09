# Editing the PAC guided demonstration

Read `README.md`, `DESIGN-LOCK.md`, `../application/DESIGN.md`, and `../docs/product/demo-production-2026-11-09/script.json` before editing. The production documents map Patrick’s feedback and all 41 PAC requirements; their coverage matrix is a planning baseline, not proof of production completion.

## Source and ownership

- `host.js`, `host.css`, `index.html`: presentation controls, cursor, separate presenter notes, and pitch return. The host never stores or transfers business records.
- `website*`: independent Website and inquiry records; `scenario.mjs` + `workspace*`: prepared Deal, quotation and Customer Proposal.
- `../application/domain.mjs` and `deal-domain.mjs`: actual quotation and deal commands. Preserve validation, saved/approval fingerprints and immutable publications.
- `pdf.mjs` and `pdf-preview.mjs`: actual version-bound PDF bytes and their visible rendering. Do not substitute a screenshot for a document.
- `../docs/product/demo-production-2026-11-09/script.json`: canonical step IDs, preset inputs, expected changes and English narration. Keep it aligned with scenario logic and displayed prices, revisions and comments. Regenerate its reader/Markdown with the adjacent `build.py`.

## Keep the approved experience

Use Inter, unchanged official logos, PAC blue and orange-yellow, neutral text, straight structural regions, deliberate financial rows and shared spacing. No rounded outline cards, decorative hairlines, historical WinQuote styling or old Website UI. Keep main results visible at a 1280 × 720 presentation viewport; the host controls take about 76 px. Customer pages share PAC’s brand but never show internal pricing, findings or sales navigation.

Website and Sales Workspace remain independent products. Do not wire inquiry records into the prepared Deal. Use only `pac-guided-website-v1:<runId>`, `pac-guided-workspace-v1:<runId>` and host cursor namespaces; never modify the original application store. Preserve same-origin/source message checks, duplicate action protection, persistence failure handling and completion-after-render semantics. Next restores the screenplay; manual form exploration does not rewrite it.

Keep demo data labelled. Prices use the 29 January 2025 sample source: A $33,060; B $40,810; revised B $41,310. Training appears once per alternative. Engineering $500 and six/seven-week planning times are illustrative. Saving, approval, publication, customer feedback and acceptance remain distinct. No fake sends, signature, payment, CRM synchronization, authentication or shared persistence.

Use approved PAC photographs with their actual scope. The base-machine video does not prove installed Option B or custom-guide geometry. Reference 3D is not PAC CAD. Preserve media fallback and never make external playback a blocker for domain actions.

## Edit and verify

Change the smallest coherent set of script, scenario, UI and notes. Run `npm run check` in the handoff package (or the four domain test files directly). Build, then inspect the affected actual steps, adjacent transitions and end-to-end acts. Verify the expected blockers A08/A12/B07, save/review/publication states, V1/V2 resources, private/public boundary, refresh/replay and final return to `11-baseline`. A passing test is not a visual review.

For a new client, reuse the layout and runner but supply a new scenario, namespace, source-price ledger, media and brand. Do not repurpose PAC claims or another customer’s screenshot as product truth. Publication is a separate action; report the tested local result and verified public result accurately.
