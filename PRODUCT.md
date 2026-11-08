# PAC Sales Workspace

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users and purpose

PAC sales representatives configure standard machines and options, work with engineering on exceptions, obtain review, and present alternatives to a customer. Customers compare alternatives and record questions. Managers track ownership and the next action.

## Confirmed direction

The user approved a complete connected demonstration on November 7, 2026: one deal contains alternative quotes, each with its own revisions, review, proposal and evidence. Monday starts with the customer proposal, then shows the workspace that produced it. All content is English. 3D Explorer feeds evidence into that same deal.

The latest user correction supersedes copying Mr Winter's appearance. WinQuote and MPI are capability and domain references. Architect a coherent sales application first, then customize its UI for PAC's product, users, brand and relevant competitors. The existing Winter-style release is a preserved functional baseline, not the visual target for the next build.

The proposed product architecture is documented in `docs/product/ARCHITECTURE.md`. PAC is the first implementation; reusable domain boundaries are a recommendation, not a commitment to build a multi-tenant platform in this iteration. All product UI and delivery artifacts remain English.

## Evidence and constraints

- The supplied catalog contains 13 Rollbag machine records and 97 canonical options. Existing catalog snapshots and compatibility logic remain authoritative for these records.
- PAC's logo, blue/gold palette and actual product photographs are already bundled.
- A verified PAC 3D model is unavailable. The bundled reference mechanism demonstrates interaction and must never be represented as PAC CAD or a machine-fit validation.
- GitHub Pages provides a static, browser-local preview. The same repository also contains a Node/SQLite service with authenticated demo roles, durable saves, revision-bound customer links and server-enforced permissions. Those service capabilities are available when running the backend, not on GitHub Pages. PAC CRM, SSO, email, signatures and payment are not connected.
- The customer in the staged proposal is fictional. Catalog prices are source-backed; any engineering labor rate or custom estimate is explicitly illustrative.

## Open decisions

PAC's CRM, production approval matrix, labor-rate basis, production media approval and broader machine-family coverage require confirmation. Internal build-note timelines and commercial terms are not delivery commitments.

## Principles

Preserve the issued quote. Bind approvals and comments to a revision. Keep alternatives distinct from revisions. Explain missing information before issue. Carry evidence and a clear next action through the same deal.
