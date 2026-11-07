# PAC workspace design reference

This is an extension of the existing PAC interface, not a rebrand. The existing `src/style.css` and `src/workspace.css` are the primary visual authority.

## Reference lock

Preserve white surfaces, PAC blue `#004c97` for navigation and primary workspace actions, PAC gold `#f6ac12` for the existing brand emphasis, ink `#182d3f`, legible system sans text, thin gray rules and real machine photographs. Product media is contained and captioned, never substituted with unverified model imagery. No decorative gradients, invented statistics or dark dashboard theme.

Secondary references reviewed through Refero:

- Attio company activity screen, https://refero.design/pages/dc6815b4-b871-4434-b336-eec3f08dec4c — compact entity context, central activity and a stable details rail.
- Monday quotes panel, https://refero.design/pages/c1243215-a449-4e72-a6cf-7c23cfc89cca — aligned item/quantity/price/total columns and owner/due-date context.
- Attio style `9f0c028b-6b11-415e-ab92-f32e4597cbe2` — border-led separation, compact operational typography. Its marketing serif and monochrome primary buttons are not adopted.
- Orderful style `9c657624-4aa8-4688-a6be-4eb3d6f2ce57` — clear light-surface hierarchy and 16/24px component padding. Its red CTA token is not adopted.

Flow research did not provide a closer quoting reference than the supplied PAC brief and the inspected MPI/Mr Winter applications; those define the journey.

## Decision ledger

| Decision | Source | Role and reason |
| --- | --- | --- |
| Proposal first, workspace second | User instruction; PAC brief §10.2 | Demonstrate the customer conversation before the mechanics |
| Deal → alternative → revision | PAC brief §4.1.3/4.3.6 | Prevent revisions from appearing as competing machine choices |
| Main work area plus summary rail | Attio/Monday screens | Keep price and status available while editing |
| Tabular numerals and right-aligned amounts | Monday quote panel | Make quantity and total changes easy to compare |
| Compact labels, 14–16px body, 28–38px headings | Existing PAC UI | Improve density while preserving readable operational text |
| Blue interactive, amber pending, green reviewed | Existing PAC tokens | Keep brand and semantic status roles separate |
| Real photo with configuration qualification | PAC brief §4.4.6 | Avoid implying a photograph proves the exact configured build |
| Explorer evidence inside the deal | User instruction | A discovery branch returns to the same application and quote |

## Responsive behavior

At narrow widths the summary follows the main content, forms collapse to one column and alternative cards stack. Wide comparison/option tables scroll inside a labeled region, never the whole page. Focus remains visible after actions; reduced-motion users receive immediate transitions. Print removes workspace controls and includes only the issued customer proposal.
