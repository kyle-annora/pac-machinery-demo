# PAC sales application design

## Website homepage direction — latest

The user rejected the full-width, centered Teenage Engineering composition and asked to restore the preceding layout while integrating useful refinements. The current target is the framed split hero and left-hand Explorer guide in `output/design-iteration-2026-11-07/`. [PAC-HOME-REFINEMENT.md](docs/product/PAC-HOME-REFINEMENT.md) records the restored hierarchy, official PAC orange (`#F6AC12`), PAC-inspired Roboto display type and the clearly identified studio visualization. The standalone hardware exhibition in `PAC-HARDWARE-HOMEPAGE.md` is historical, not the current layout authority. Website changes do not replace the Mercury Workspace or proposal direction.

The homepage Explorer now uses a continuous charcoal-black scene (`#1b1b1b`), light neutral type, PAC orange steps/actions and minimal divisions, as requested after the unified C&B/Tulip-inspired layout. This local dark surface does not change the rest of the website or sales application palette.

The 8 November homepage refinement replaces the engineering toolbar with three short guide chapters: explore details, play motion, ask a question. Model selection updates guide context; the guide controls the same persistent scene. Inquiry automatically captures the current view. Homepage hero uses heavy italic uppercase Roboto; section headings use upright Roboto, with interface labels unchanged. One manual-play official R3200 Fulfillment video sits in the existing feature image area. See the latest section in the homepage record for source URLs and verification.

## Current refinement — 7 November 2026

The user requested another design iteration grounded in our brand marketing assets and the C&B Machinery homepage Explorer. [PAC-BRAND-ITERATION.md](docs/product/PAC-BRAND-ITERATION.md) records the inspected sources and bounded borrowing. Mercury continues to govern the application layout. Annora's Alloy study contributes equipment framing, material clarity and coherent section alignment; it does not supply PAC's palette, logos or customer claims.

Website uses actual PAC equipment photographs, a shared white/neutral page frame, PAC yellow actions and an inline guided Explorer immediately after the opening. Workspace uses the same brand roles at a denser operating scale: complete navigation labels, aligned quote rows, machine identity and a focused inspector. Proposal uses a clear document hierarchy with related equipment, scope and price. The reference assembly remains explicitly separate from PAC CAD.

The two independent local entries are `/website/` and `/#workspace`; Customer Review is a fixed-version Workspace output. The current 4361 runtime uses authenticated local roles and SQLite. Browser-only persistence descriptions in older design records are historical. See [current implementation scope](docs/product/PAC-IMPLEMENTATION-RECEIPT.md).

The active product direction is an application-first rebuild described in [PAC-APPLICATION-BRIEF.md](docs/product/PAC-APPLICATION-BRIEF.md). The user approved the Mercury v2 Deal workspace and Quote builder designs, with Linear details and PAC yellow, and authorized their implementation. The English application now runs at [the local demo](http://127.0.0.1:4361/#demo). [PAC-APPLICATION-DESIGN.md](docs/product/PAC-APPLICATION-DESIGN.md) preserves the approved targets and implementation notes.

The previous `#demo` layout and earlier [PAC-VISUAL-RESET.md](docs/product/PAC-VISUAL-RESET.md) are historical evidence. The Mercury v2 pair is the current composition target; verified business contracts remain in force.

## Product and visual authority

PAC's equipment, catalog, requirements and brand govern the experience. Mercury's inspected Invoicing list and contextual details govern the visual hierarchy. Linear supplies compact, predictable controls and quieter navigation. PAC supplies the logo and yellow; these references do not supply business rules. [Current research and decision ledger](docs/product/PAC-APPLICATION-DESIGN.md).

- White content, quiet neutral navigation, fine borders and gray text. PAC yellow `#F6AC12` with dark text identifies the primary action and restrained selection markers. PAC blue remains in the actual logo, necessary links and keyboard focus. Ordinary headings and amounts are gray.
- System sans-serif, readable 14–16 px content and aligned tabular numerals. No donor fonts, compressed typography or numbered workflow scaffolding.
- Global Deals and Product catalog navigation. A Deal owns its quotes, application, customer discussion and activity; Quote builder, Explorer and published proposal open in that record context.
- Deal overview leads with the next action and comparable equipment alternatives. Requirements, feedback, published proposals, evidence and activity retain their ownership.
- Quote builder centers the selected configuration table with a contextual catalog or line-item inspector and a stable commercial summary. Issued revisions remain visibly distinct from working drafts.
- Customer proposal leads with the application, exact-model photograph, selected configuration and investment. Detailed terms are available on demand; feedback follows the content instead of occupying a permanent document-review rail.
- Real PAC machine photos are the media source. Illustrative 3D assemblies must remain clearly identified and connected to the same deal.

## Implementation and preservation

`src/mercury-views.js` and `src/mercury-workspace.css` implement the new Deal and Quote surfaces. `src/workbench.js` and `src/app-shell.css` provide the shared frame, search and contextual navigation. `src/sales-workspace.js` connects actions to the domain and persistence boundaries. Existing customer-proposal styling remains in `src/pac-product.css`; `src/proposal-print.css` owns print layout. Regenerate and visually inspect exported PDFs after print-style changes.

`src/quote-edit-session.js` keeps recoverable configuration edits separate from the canonical saved quote. `Save changes` applies the staged quote through the persistence boundary; issued revisions and proposal manifests remain immutable. Explorer evidence retains both deal and quote identity, including when the quote has unapplied edits.

Domain capabilities may be reused after verification. Visual changes must preserve catalog prices, review invalidation, truthful saves, issued snapshots, proposal versions, pending edits, exact response ownership and Explorer handoff. Keep English product copy and the proposal-first demo sequence.

## Acceptance

Compare actual desktop and narrow-screen captures against the reference lock. Verify table readability, focus, working navigation, category switching, pending form retention, version switching and screen/print separation. Automated correctness and human visual acceptance are separate. Local browser persistence does not establish a production customer portal.

The local browser walkthrough verified the $1,130 spare-kit change from B Rev 0 ($40,810) to B Rev 1 ($41,940), save/reload, Explorer attachment with staged edits preserved, review/issue and Proposal V2 publication, unchanged V1 pricing, and customer feedback attributed to V2 / B Rev 1. Automated catalog, Explorer, workflow, persistence, editor-buffer and static-build checks pass. The implementation's visual comparison is recorded separately in `design-qa.md`.

The local service supports authenticated staff and recipient-scoped review against durable records. Production identity, PAC approval policy and CRM integration remain unconfirmed. The Explorer reference assembly is not verified PAC CAD.
