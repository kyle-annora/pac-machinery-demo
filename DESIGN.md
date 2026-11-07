# PAC workspace — Mr Winter alignment

## Primary reference

The user requested on November 7, 2026 that the PAC experience match Mr Winter as closely as possible. Mr Winter's Workbench implementation now governs navigation, page structure, density and interaction. PAC supplies the brand, product catalog and business content.

Reference: `wes-teskey/winter-cpq`, inspected checkout `9633f6c`. Relevant sources are `frontend/client/src/components/shell/{PageLayout,Sidebar,TopBar}.tsx`, `styles/workbench.css`, `pages/win-hub.tsx`, `pages/quotes.tsx`, `components/quote/configuration-tabs.tsx`, `pages/workflow.tsx`, and `pages/review.tsx`.

The production address, https://www.winquote.ai/, requires sign-in. The available isolated homepage integration preview was inspected for shell proportions; its refreshed homepage is not the target for PAC's quote editor. The current source establishes the quote and workflow structure. No production customer data is copied.

## Reference lock

- 212px sidebar, 56px collapsed rail, 60px topbar with breadcrumbs and working navigation search. Mobile uses a keyboard-accessible drawer.
- Source Sans 3 for UI text; JetBrains Mono for IDs, money and counts. Compact operational headings, small labels, aligned table columns, restrained 8px corners and border-led separation.
- Workbench neutrals: canvas `#f6f7f4`, document/surface `#fdfdfb`, secondary `#e8ebe4`, border `#d4d8ce`, text `#2a2e26`, secondary text `#6b7164`.
- PAC blue `#004c97` occupies the interactive brand slot; PAC gold remains a restrained brand accent. Status colors retain semantic roles.
- Customer review is separate from the application shell: issued proposal document on the left, feedback and follow-up in a 420px rail on the right. Monday still opens here.
- Real PAC photographs and qualified reference 3D evidence remain the only product imagery. The generic assembly is never represented as PAC CAD.

## Decision ledger

| Decision | Source | Adaptation |
| --- | --- | --- |
| Sidebar and topbar application frame | Mr Winter shell components | PAC branding; working local navigation, with no simulated authentication or CRM sync control |
| Compact Sales hub with Deals / Quotes views | Mr Winter Win Hub and quote table | Preserve PAC's deal → alternative → revision hierarchy |
| Persistent quote context and category tabs | Mr Winter configuration-tabs | PAC machine/options, engineering, special orders and review tasks |
| Numbered workflow sections | Mr Winter workflow and workflow-section | Application, alternatives, review evidence, discussion and next action |
| Proposal document with feedback rail | Mr Winter review page | HTML issued snapshot instead of pretending a pre-generated PDF exists; retain alternative comparison |
| Revision and price protection | Existing PAC sales domain and requirements | Preserve authoritative source prices, review invalidation, immutable issued versions and revision-bound feedback |
| Explorer attached to the same deal | User instruction | Discovery remains an evidence-producing branch within this workspace |
| Proposal-first demonstration | User instruction | Internal workspace appears when the presenter opens Sales workspace |

Earlier Attio/Monday/Orderful research is historical context, not a competing design authority for this revision.

## Validation

Compare the rendered PAC shell against the captured local Mr Winter shell and the cited source dimensions. Check desktop and mobile navigation, table readability, tab behavior and form retention, then repeat the connected quote/evidence/revision flow. Print removes application chrome and keeps issued source terms. Changes to page layout must not alter catalog prices or previously issued snapshots.
