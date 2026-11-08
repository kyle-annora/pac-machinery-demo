# PAC implementation receipt

7 November 2026 · Operable local implementation checkpoint · Main browser journeys verified

This receipt records the implemented scope and observed evidence against the [delivery plan](PAC-DELIVERY-PLAN.md). The two independent products and their main journeys now operate against the local service on port **4361**, with desktop and selected narrow-screen browser inspection. It does **not** mark the complete plan, a fully accepted Workspace candidate, or a PAC-connected release as delivered. Required document storage, migration, administration, integrations and full release verification remain open.

## Open the implementation

- [Website](http://127.0.0.1:4361/website/)
- [Sales Workspace sample deal](http://127.0.0.1:4361/#deal/deal-pac-demo)
- Local Sales account: `sales@pac.demo`; password: `pac-demo-2026`. Engineering and Manager accounts use `engineering@pac.demo` and `manager@pac.demo` with the same initial password.
- A recipient-specific Customer Review link is created from an explicitly published proposal. It opens independently of the staff session and stays bound to that proposal version.

The final 4361 service was restarted and inspected with the Sales account. It uses `work/runtime/pac.sqlite` with the original sample catalog basis. Destructive/repricing walkthrough changes were isolated in the QA service on port 4362, using `work/runtime/acceptance.sqlite`. Previous browser records remain untouched and can be exported with **Workspace tools → Export previous browser data**; controlled import remains pending.

## Runtime and product boundaries

- **Website:** `/website/` has independent public navigation, 13 source-backed Rollbag product pages, equipment discovery, photo/qualified 3D Explorer and inquiry receipt storage. It does not require a staff session or create a Workspace deal.
- **Sales Workspace:** `/#workspace` uses authenticated typed commands and SQLite. A deal owns quote alternatives, working revisions, frozen issued revisions, composed proposals and version-bound customer feedback.
- **Customer Review:** `/review.html#TOKEN` uses a recipient-scoped bearer link to one published proposal. The service supplies the public projection, fixed recipient attribution, expiry and revocation. It does not expose the internal Workspace. This is scoped link access, not verified customer SSO identity.
- **Local service:** Node 22.13+ with `node:sqlite`; verified on Node 26. The default database is `work/runtime/pac.sqlite`. Demo Sales, Engineering and Manager accounts have server-enforced permissions. The server deliberately binds to loopback; production PAC identity and deployment are not configured.
- **Static preview:** the build packages Website, Workspace preview and the Customer Review entry. Its visible notice explains that shared service functions are unavailable. GitHub Pages cannot run this SQLite service. Packaging is not evidence of deployment or working public customer links.

Status terms below: **Implemented slice** means the listed behavior exists and has evidence; it does not satisfy unimplemented portions of the package. **Partial** means material requirements remain. **Pending** means the acceptance evidence or provider-backed capability has not been established.

## Foundation package status

| Package | Status | Implemented / evidenced | Remaining acceptance |
| --- | --- | --- | --- |
| F1 — Scope and authority | Partial | Existing catalog/media source identity retained; Website public projection covers 13 Rollbag records; demo customers, CRM references and reference geometry are qualified. Delivery plan maps the 41 recorded requirements. | PAC confirmation of source applicability, complete portfolio scope, commercial policy, media rights, public pricing and ownership of unresolved inputs. |
| F2 — Design contract | Partial | Separate equipment-led Website and Mercury-informed Workspace, Linear interaction details, neutral text and PAC yellow; English UI. Desktop Website/Deal and selected narrow-screen Website/Quote/Explorer/Catalog screens inspected. | Exhaustive accessibility/error-state coverage and rendered PDF acceptance remain. Reference direction and selected screen inspection are not blanket acceptance of every state. |
| F3 — Runtime boundaries | Implemented slice | Independent entry points and business state; Website inquiries are not deals; Workspace service and scoped customer projection; static packaging excludes server/runtime files. | Independent production deployments and release ownership; controlled import of legacy browser records. Current packaging remains one repository/build with separate entries. |

## Website package status

| Package | Status | Implemented / evidenced | Remaining acceptance |
| --- | --- | --- | --- |
| W0 — Content and coverage | Partial | Public taxonomy and 13 Rollbag pages derive from available source records; exact-model vs fallback/reference media is qualified. No invented full-PAC catalog. | PAC content approval, complete asset suitability/rights audit, public-price policy and portfolio expansion. |
| W1 — Shell and homepage | Implemented slice | Independent header/footer, home, equipment paths, featured products and contact actions. Desktop and 390px homepage/menu inspected without horizontal overflow. | Broader keyboard and navigation acceptance across all destinations. |
| W2 — Products and solutions | Implemented slice | Product browsing/search/filtering, solution pages and related equipment paths. | Exhaustive filter/back/no-results and device acceptance; broader comparison scope only where source fields support it. |
| W3 — Product detail | Partial | Common product template with real source photographs, specifications, options and inquiry action across the covered catalog; intentional official PAC resource destinations. | Per-model content/media and download audit; verified application/configuration videos and brochures where not supplied. |
| W4 — Website Explorer | Implemented slice | Independent photo and qualified reference-assembly modes; actual embedded 3D capture with a saved inquiry reference. No deal/session required. | Approved PAC CAD, broader low-performance/WebGL failure and device verification. Reference geometry must remain visibly qualified until replaced. |
| W5 — Inquiry and contact | Partial | Validated durable independent receipt; idempotent retry; bounded source-photo and Explorer capture references; input retention; honest `received` / `delivered:false` response. Browser QA saved a reference inquiry without creating a deal. | General file attachments, agreed receiving channel, actual email/customer receipt delivery, retention/deletion policy and production abuse controls. |
| W6 — Supporting content | Partial | About, support, resources, contact and privacy destinations; deliberate official PAC links; source-data projection/build path. | PAC-editable content draft/review/publish workflow and named maintenance ownership. |
| W7 — Site delivery quality | Partial | Preview indexing restrictions, local font/media assets, resource checks and static deployment-path rewriting. | Production canonical URLs/sitemap/redirects, social previews, performance/accessibility verification, hosting/monitoring and consent-dependent analytics if selected. |

## Sales Workspace package status

| Package | Status | Implemented / evidenced | Remaining acceptance |
| --- | --- | --- | --- |
| S0 — Durable state and access | Partial | SQLite transactions, authenticated actor roles, typed commands, version conflicts, safe retry identities, customer-scoped access, restart persistence, protected snapshots and tested backup/restore. | General file storage; legacy browser-record import; production identity/deployment and broader operational controls. Existing browser data is preserved, not silently trusted or migrated. |
| S1 — Sales daily work | Implemented slice | Deal/quote navigation, customer/application context, alternatives, contacts, follow-up and activity; service-backed creation and edits. | Full daily-use acceptance across search/filter/sort and lifecycle exceptions; complete archive/reopen and ownership policy. |
| S2 — Scope and assisted intake | Partial | Structured scope and readiness gates; text-based intake suggests fields with source excerpts and explicit selection/confirmation. It does not silently configure a quote. | General attachments, broader intake coverage and PAC acceptance. Text extraction is not a connected conversational/AI integration. |
| S3 — Configurator | Implemented slice | Catalog base/options, quantities, required companions, included features, services/spares and explicit totals; edits are rebuilt and validated on the server. Price visibility is presentation only. | Full option-matrix/incompatibility coverage and all product exception paths; PAC compatibility validation. |
| S4 — Engineering and terms | Partial | Engineering requirements, special orders, role-controlled pricing, labor/material inputs, discounts, terms and issue blockers; unknown costs are not silently accepted. | Final PAC rates, approval/override authority, complete commercial exception coverage and policy acceptance. |
| S5 — Review and approval | Partial | Saved revision reviews, actual actor attribution, conditional Engineering/Manager gates, review invalidation and Review Queue. Unauthorized role escalation is rejected. | Reviewer assignment/routing, full submit/return/resubmit policy, configured bypass, notification delivery and travelling-reviewer/SSO acceptance. |
| S6 — Save, revision, publication | Implemented slice | Recoverable edits, server-acknowledged save, revision/diff, immutable issued records, explicit repricing, exact alternative/revision proposal composition. Issue does not mark the deal presented. V1 preservation after V2 was observed. | Remaining interaction/failure-state acceptance and final release rehearsal. |
| S7 — Proposal and presentation | Partial | Published application context, alternatives, scope, itemized pricing, terms and evidence; alternative prices are not added together. Customer and seller views use the same fixed proposal basis. | PAC approval of recommendation/rationale and media suitability; full presentation and device acceptance. |
| S8 — Customer collaboration | Partial | Recipient links, expiry/revocation, alternative-bound questions/change requests, preferences, replies/resolution and revision/publication lineage. Service validates optional section/line anchors. | Complete inline section/line annotation UX, customer-team invitation/identity policy, assignment/reopen workflow and verified invitations. Preference remains distinct from order acceptance. |
| S9 — Media and Workspace Explorer | Partial | Source photographs plus qualified 3D open/capture/note/attach/restore; evidence remains with the deal/quote and published snapshots without changing price. Browser QA attached Crank drive evidence to the revised alternative. | General drawings/layouts/document upload and library management; approved PAC CAD, exact-configuration media mapping and deleted-asset lifecycle. |
| S10 — Catalog administration | Partial | Manager draft/review/publish for prices, lead times, included flags and required companions; batch percentage adjustments; provenance/history; new quotes use published catalog and old quotes require explicit repricing. | Product/option creation, complete option matrix/incompatibilities, broader catalog editing, effective-date scheduling and PAC maintenance acceptance. |
| S11 — Pipeline and CRM | Partial | Local owner/follow-up/stage context; separate issue/publish/share/presentation facts; illustrative CRM reference gate. | PAC CRM lookup/synchronization, authoritative customer/deal/numbering gate, duplicate/error recovery and complete won/lost policy. No real quote authority is inferred from a demo CRM reference. |
| S12 — PDF and documents | Partial | Customer print/save-PDF surface, compact branded print styles, published configuration/totals/terms, all alternatives included in print rendering. | Final rendered PDF inspection, long-content/page-break acceptance, version-specific document bundles and drawing/layout/PDF attachments. A print button alone is not PDF acceptance. |
| S13 — Administration and connections | Partial | Local account login and server roles; auditable actor actions; recovery tooling. | User/role/settings administration, Google/Microsoft SSO, approval/customer notifications, admin feedback workflow and production support controls. E-signature/payment are unimplemented and need an explicit scope decision or recorded deferral. |

## Observed browser journey

The following was observed in the QA service/browser walkthrough. It is evidence for these paths, not a claim that every plan state has been inspected.

1. Signed in with the local Sales account.
2. Opened a recipient-scoped V1 customer link for the QA reviewer. Submitted a `changes_requested` response for alternative B, requesting the Spare Parts Kit.
3. Returned to the same deal, created B revision 1, added the kit and saved the quote at **$41,940**. The prior issued B revision remained **$40,810**.
4. Captured **Crank drive** in the qualified 3D Explorer and attached the evidence to that same revised quote. Capture did not alter the commercial total.
5. Completed the application review and issued the saved revision.
6. Used the proposal composer to select **A revision 0 + B revision 1**, then published **V2**.
7. Reloaded the original customer link. It still opened **V1**, retained B's **$40,810** total, and showed the original request as addressed through the subsequent publication.
8. Independently opened the Website homepage/Explorer, captured qualified 3D context and submitted an inquiry. Receipt **PAC-INQ-DFEFF134** was stored with an honest local receipt status. It created **no deal** and sent **no email**.
9. Signed in as Manager, changed the Spare Parts Kit from **$1,130** to **$1,200** in a catalog draft, reviewed and published it. Opened B revision 2 and explicitly reviewed/applied its **$41,940 → $42,010** repricing preview. Previously issued revisions and proposals stayed unchanged.
10. Pasted an application note into assisted intake, inspected three extracted fields with source excerpts and manually applied them. Existing scope notes and issued history were preserved. This is conservative text extraction, not a connected AI integration.
11. Inspected desktop Website, Deal Workspace and Catalog Admin; inspected Website/mobile navigation at 390px and Quote/Explorer/Catalog at 375px. Captured the final 4361 desktop Website and Deal plus the narrow Website below.
12. Restarted 4361 on the SQLite service, signed in as Sales and verified the fresh sample deal. `/api/health` reported `ok:true`, `persistence:sqlite` and `websiteIndependent:true`.

The QA customer, prices and inquiry identify test/demo records. The receipt identifier is evidence, not a production PAC delivery confirmation.

### Captured pages

- [Website — desktop](../../output/implementation-2026-11-07/website-desktop.png)
- [Deal Workspace — desktop](../../output/implementation-2026-11-07/workspace-desktop.png)
- [Website — 390px](../../output/implementation-2026-11-07/website-mobile.png)

The design detector's remaining Inter-font suggestion was retained deliberately for consistency with the approved Workspace typography. Neutral text and PAC yellow remain the visual hierarchy; the reference assembly is visibly qualified.

## Automated and packaging evidence

These are point-in-time results from this implementation run; subsequent changes require relevant re-verification.

| Check | Recorded result | Scope |
| --- | --- | --- |
| `npm test` | **175/175 passed**, approximately 7.5 seconds | Full package suite at the final verification checkpoint. Console record: `work/final-verification.log`. |
| Post-QA targeted tests | **50/50 passed**, approximately 1.6 seconds | Website, parent navigation, Sales Workspace and Customer Review after the last inquiry-reference and UI fixes. Console record: `work/post-qa-tests.log`. These overlap with the full suite and are not an additional independent total. |
| Service API tests | **8 test groups passed** | Sessions/origin/static privacy; durable CAS/retries/restart; role enforcement; trusted quote-edit reconstruction; customer scope/version/revocation; independent idempotent inquiries; catalog administration/repricing/history; bounded Explorer inquiry capture. |
| Client/customer tests | **7 passed** | Uncertain network retry identity, conflict reconciliation, HTTP errors, local-auth disclosure, non-additive alternative comparison/print coverage, published-state/internal-field boundaries and escaped unsafe content. |
| Recovery tests | **3 passed** | Live WAL snapshot includes committed workspace/catalog/inquiry state; restore invalidates staff sessions; overwrite/tamper/sidecar refusal; invalid schema rejection. |
| `npm run build` | **655 files**, approximately **218 MB**, **0 resource-audit errors** | Website and Review included; 149 HTML references and 391 distinct resource paths checked. Console record: `work/final-build.log`. Server/runtime database, development documents and Node-only catalog helper excluded. This is a static preview, not a service deployment. |

Catalog tests also exercise a 10% adjustment: new R3200 base pricing becomes **$30,338**; the historical issued B quote remains **$40,810**; explicit repricing previews and applies **$44,891** to its working revision. The public Website source catalog remains independent of the Workspace admin overlay.

## Recovery and operational limits

The [SQLite recovery tool](../../scripts/database-recovery.mjs) creates a consistent live backup, a SHA-256 manifest and private files. Restore validates integrity/schema/checksum and requires a new destination; it never overwrites the running database. Staff sessions are invalidated on restore. See [recovery instructions](../../server/RECOVERY.md).

Backup files contain contact/commercial data and account password hashes. They are local, not encrypted, not automatically scheduled and not uploaded. Keep the matching application/catalog assets separately. Restored proposal links and feedback reflect the backup point; later changes remain only in the prior database.

## Acceptance still open

The main browser walkthrough, selected desktop/narrow-screen inspection and final **4361 restart** are complete. The previously published GitHub demo has **not** been updated in this implementation run.

**Rendered PDF acceptance remains pending.** The Customer Review print call did not return successfully in the embedded browser. Print rendering tests cover all fixed alternatives and terms, and compact PAC-branded print styles are implemented, but no final PDF page-break/typography inspection was completed. This is recorded as unverified rather than passed.

The full plan remains open. The next acceptance packages must retain explicit ownership for document uploads/bundles, legacy import, user administration, review routing, product/option creation, public service deployment, PAC CRM/numbering, SSO, notifications and the Website receiving channel. Signature/payment require a scope decision. Unconnected providers must continue to show truthful state rather than simulated delivery, approval, signature or payment.

Before calling the full demonstration accepted, complete rendered PDF, exhaustive accessibility/error-state checks and the remaining PAC decisions. The implemented failure/conflict/retry contracts have automated coverage; this does not replace all human interaction acceptance. Before calling it a fully accepted Workspace candidate, close the required attachment/migration/administration gaps. Before a PAC-connected release, verify each agreed real provider and operational requirement.

## Brand and homepage Explorer iteration — 7 November 2026

The next local iteration follows [PAC-BRAND-ITERATION.md](PAC-BRAND-ITERATION.md). Annora marketing assets inform the continuous frame, equipment presentation and visible selection-to-result relationship. C&B's homepage informs an embedded, guided exploration section. PAC identity and the independent Website/Workspace boundary are preserved.

- Website: larger authentic equipment photography, framed hero, sharper section rhythm, neutral typography and PAC yellow actions. Product detail shares this treatment.
- Homepage Explorer: three chapters, real equipment photo first, explicitly qualified 3D reference on request, then a question carried with the captured view into the independent inquiry. The reference is not PAC CAD. It cannot configure a quote or create a deal.
- Deal and Quote: tighter tables and spacing, complete navigation labels, exact-model source photos and clearer inspector hierarchy.
- Seller/Customer proposal: compact document framing and consistent imagery, neutral text and selected yellow accents. These refinements were inspected on screen; they do not close the pending rendered-PDF acceptance.

Browser verification observed chapter switching, reference load, component selection/framing, capture and question handoff. The inquiry retained the image, question and “Reference assembly — not PAC CAD” source. Desktop Website, product detail, Deal, Quote, seller proposal and recipient comparison were inspected, with Website, Explorer, Quote and Customer Review checked at 390px. The final recipient photo-background discrepancy was corrected and rechecked. No external email or publication occurred.

Latest automated verification: **178/178 tests passed** (`work/design-iteration-tests.log`); refreshed static build contains **657 files** and reports **0 resource-audit errors** (`work/design-iteration-build.log`); `git diff --check` passed. The static package remains a preview, not a deployed service.

Evidence: [Website](../../output/design-iteration-2026-11-07/website-desktop.png), [homepage Explorer](../../output/design-iteration-2026-11-07/home-explorer-desktop.png), [product detail](../../output/design-iteration-2026-11-07/website-product-desktop.png), [Deal](../../output/design-iteration-2026-11-07/deal-desktop.png), [Quote](../../output/design-iteration-2026-11-07/quote-desktop.png), [seller proposal](../../output/design-iteration-2026-11-07/proposal-desktop.png), [Customer Review](../../output/design-iteration-2026-11-07/customer-review-desktop.png), [mobile Website](../../output/design-iteration-2026-11-07/website-mobile.png), [mobile Quote](../../output/design-iteration-2026-11-07/quote-mobile.png), [mobile Review](../../output/design-iteration-2026-11-07/customer-review-mobile.png).

Known limits: the narrow Quote table deliberately scrolls horizontally; the embedded reference viewer has dense controls on mobile, while its outer component selector and capture controls remain usable. Approved PAC CAD, final PDF inspection and the open delivery packages above remain outstanding. This design iteration does not represent acceptance of the whole delivery plan.
