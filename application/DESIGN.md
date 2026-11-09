# PAC application — implementation lock

2026-11-08. Current application style explicitly accepted by the user. Expand its Deal context and align Customer Proposal with the PAC customer-facing brand; preserve working behavior, English content and the approved visual language. Do not import old or low-fidelity page styling.

## Direction

Primary product reference: Mercury's itemized accounting editor and adjacent output ([screen](https://refero.design/pages/51a61cc0-863c-4731-8487-4ca843c38a2e)). Preserve legible financial rows, right-aligned amounts, clear editing/output relationship, explicit save. Reject purple, card shadows, rounded containers and invoice-specific tasks.

Secondary: Linear light issue detail ([screen](https://refero.design/pages/1a493a2c-7d09-4143-b0dd-745781ea7991)). Borrow compact shell, quiet metadata and attached conversation; no nested project-management navigation or decorative rails.

Full marketing styles also reviewed: Mercury (95fd135a-64bd-4f9d-9a02-cac6422266c8) and N26 (59911817-9d14-445a-9f1b-617418001061). Mercury's current marketing dark hero/pill system is rejected for this application. N26's high-contrast flat canvas supports the selected product UI direction; no teal, extended display font or marketing hero copied. Existing contextual-request flow research (Faire/Farfetch in blueprint reference ledger) informs retaining version/product context in feedback, not lengthy consumer steps.

## Commitments

- Fresh application DOM and CSS; no imports from old app or blueprint UI.
- White working canvas; pale neutral navigation/media surface; charcoal body; secondary #626c75.
- Shared foundation lives in `../brand/pac-tokens.css`. PAC blue #2360a4 for primary internal actions, navigation active state and functional links. PAC orange-yellow #f5ac0b with dark text for final publish/customer actions. Colors are UI adaptations, not recoloring logos.
- One UI sans family: Inter, with system fallback; sizes 12/13/14/16/20/28/40/48; 400/500/600/700 only. Tabular numbers.
- 4/8px spacing rhythm, 24–32px working gutters; wide-layout media and editor aligned; no inset selected outlines or rounded hairline cards.
- Structural regions use background, whitespace and straight table separators. Inputs/buttons use at most 3px radius. Keyboard focus remains visible.
- Official unchanged PAC logo and original machine/option images. PAC photos remain the default truthful equipment path. The separate live crank-slider reference is explicitly not PAC equipment/CAD; never present it as an exact assembled quote.
- Builder belongs inside the same Deal as Overview, Requirements, Explorer, Published proposals and Activity. Keep A/B tabs, editable sourced options, pinned estimate/media context and visible save state. Customer Proposal uses a PAC product header, local reading navigation, genuine photographs, clear option differences, line-item detail and version-bound conversation; it has no sales sidebar.
- No review navigation, checkpoint buttons or requirement commentary in normal app screens. A single small demo indicator and source-pricing note make runtime/data scope accessible.

## Functional slice

Save an incomplete working quote; review blocks unknown engineering prices/incompatible options. Approve exact saved versions, publish frozen public projection, inspect old version, submit contextual feedback, revise one alternative and publish the next version. Browser persistence and downloadable work backup; no backend, SSO, email, contract or payment claims. Source price date remains explicit.

Website and Sales Workspace are independent artifacts. Their relationship is explained in the pitch; it is not a Website inquiry → Inbox → Deal implementation. The user explicitly withdrew that experiment. Do not implement automatic or explicit cross-artifact data transfer without a new, explicit request. Shared style and shared viewer capability do not authorize a shared operational workflow.

## Integrated surfaces and extension rule

`workspace-views.js` and `workspace.css` extend the current application rather than replacing its visual foundation. `deal-domain.mjs` preserves existing records while adding Deal follow-up and discovery data. `explorer-controller.js` adapts the shared viewer capability inside this shell. No older Workspace or Website CSS is imported.

Explorer uses explicit actions: browse, capture, save a finding, and link/start a quote revision. Camera/part selection does not modify options, price or publication. Captured findings are internal Deal records; publishing them safely to customer proposals is a later feature.

The newly added `site/` and `intake-*` experiment is withdrawn from the active preview and retained in `tmp/intake-before-rollback-20261108-225234/`. The older `website/` remains historical; its Manrope/Roboto, framing and color overrides are not design authority. Do not replace the accepted application with either historical surface.

The active implementation keeps the original Deal workspace, Quote builder, Customer Proposal and internal Explorer. There is no Website inbox, inquiry-driven Deal creation/linking or Website-reference import. Existing browser records remain preserved; withdrawn experiment data is not part of the active flow.

Website and Proposal should share PAC's customer-facing visual family, while Workspace keeps its operational shell. A common visual system is a design relationship. Customer Proposal's publication and feedback relationship to the Deal remains functional; the Website has no such implemented connection in this scope.

Use the accepted type hierarchy, neutral prose, straight separators, photo alignment and visible focus at desktop and narrow widths. Customer-only presentation is a UI boundary, not authentication. Current evidence lives in the Deal-integration receipt; the intake receipt is marked withdrawn historical work.

## Explorer reliability rule

The host adapter owns the iframe's initial source; templates must not trigger a parallel initial viewer load. Logical model readiness alone does not prove a usable image. Verify captured preview content before allowing it to become a reference, retain clear photo fallback, and never claim an empty image was saved successfully. The withdrawn intake QA receipt records the origin of this renderer fix, not authorization to restore the intake workflow. Renderer reliability improvements may be retained within the independent Deal Explorer.
