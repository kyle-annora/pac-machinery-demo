# PAC Website and Sales Workspace Delivery Plan

Approved implementation direction · 7 November 2026

Implementation has started following user approval. See the [implementation receipt](PAC-IMPLEMENTATION-RECEIPT.md) for current local URLs, verified journeys and outstanding work. The baseline below records the state before this implementation; it is not the current runtime status.

Build two independently usable products: a PAC Website for equipment discovery and inquiries, and a Sales Workspace for configuring, reviewing, presenting and revising quotes. Annora's pitch presents their value; neither product needs to enact that pitch through navigation or a website-to-deal integration.

The target is a finished, operable experience, including data, administration, permissions and failure states. A visually polished browser-local demonstration is an intermediate checkpoint, not the final Workspace acceptance standard. Planning covers the complete scope now; construction follows dependencies so finished screens do not require a later storage or permission redesign.

## Direction and priority

- Website and Workspace have independent entry points, navigation, state and release verification. Shared brand assets or reusable components do not require a shared application shell or business workflow.
- Preserve proven pricing, revision, snapshot and customer-response contracts. Remove inherited visual or page-organization assumptions. Mercury remains the Workspace composition reference, with Linear interaction details, neutral text and PAC yellow. The Website needs its own equipment-led design.
- All product content, sample records, errors, notifications, PDFs and presenter copy are English. Working discussion with Kyle is Chinese.
- The PAC discovery record prioritizes live quoting, higher win rate, shorter time to close, structured review and better customer presentations. Website work remains an independent commitment; lead-generation promises should not displace the core Workspace work.
- Respect PAC's CRM-deal-before-quote-number requirement. Independence from Website does not remove that gate. Demo CRM references can be explicitly illustrative; real issuance must follow the agreed CRM and numbering authority.
- Cover all 41 recorded requirements below. CRM, SSO, notifications, signing and payment remain visible delivery packages with external dependencies, not forgotten features or simulated successes.

## Pre-implementation baseline

| Area | Existing evidence | What completion still requires |
| --- | --- | --- |
| Website | No independent PAC homepage or website shell. The default entry opens a sales deal. | A public site with coherent navigation, content, discovery, product detail, inquiry and confirmation. |
| Catalog | 13 Rollbag machine records, 97 option definitions, 119 narrative records and 121 media records are available locally. | Source validation and publication policy. These are not the full PAC portfolio; media records include generic, fallback and unconverted assets. |
| Website inquiry | Local scope capture and photo references exist. The current confirm step sends nothing to PAC. | Independent server submission, validation, receipt and an agreed receiving channel. |
| Deal and quote | The Mercury Deal and Quote views wrap useful catalog, editing and pricing logic. Engineering and other secondary areas remain uneven. | Complete daily operations, consistent interaction states and all supporting screens. |
| Versions and feedback | A recorded browser walkthrough verified revision, save/reload, issue, V1/V2 publication, feedback lineage and same-deal Explorer evidence. | Durable service-backed state, real actors, concurrent access and customer isolation. |
| Publication | Publication currently includes every alternative's latest issued revision. Issuing a quote sets the deal to presented. | Explicit proposal composition and accurate issue/publish/share/presentation semantics. |
| Infrastructure | server.mjs serves static files; persistence and demo roles are browser-local. | Database, service commands, files, authentication, server authorization, notifications, deployment and recovery. |

This baseline comes from source inspection and the recorded journey review. It is not a fresh visual acceptance or a new test run.

## Completion levels

| Checkpoint | Meaning | Required evidence |
| --- | --- | --- |
| Complete demonstration | Both artifacts are independently operable; the major and exception paths work with identified sample data. | Fresh-session walkthrough, working primary controls, coherent English content, correct calculations and versions, realistic error states, desktop/mobile/PDF inspection and repeatable fixtures. |
| Usable Workspace candidate | Staff and customer users can work across sessions against durable records. This is the core delivery target. | Real server-side identity/permissions, two-browser customer review, save conflicts/retries, service restart, attachment persistence, catalog administration and tested recovery. |
| PAC-connected release | PAC's actual accounts, CRM gate, notifications, website receiving channel and any included commercial providers work in the deployment environment. | End-to-end provider tests with approved recipients/accounts, verified delivery state, production configuration, backups, ownership and an accepted release checklist. |

The usable candidate should use real application permissions even before PAC SSO is connected. Development/test identities are acceptable for verification; a frontend role selector is not an authorization system. Signing and payment require an explicit scope decision: if included, provider-backed completion is required; if deferred, mark the recorded requirement as deferred rather than delivered.

The usable candidate supports controlled acceptance with identified test/demo records. Issuing real customer quotes requires verification of PAC's CRM/numbering gate and the applicable connected-release requirements.

## Foundation packages

| ID | Work | Concrete output | Acceptance |
| --- | --- | --- | --- |
| F1 | Inventory scope and authority | Machine-family coverage, source catalog and media ledger; requirement mapping; confirmed vs demo policies; ownership of unresolved inputs. | Every displayed model, price and asset has a source and applicable scope; every requirement has a delivery package. |
| F2 | Complete the design contract | Screen map and state matrix for both products; representative real-content designs; type, tables, forms, dialogs, feedback, focus and responsive rules. | Website Home/Product/Explorer and Workspace Deal/Quote/Proposal work as coherent compositions; secondary screens use the same tested rules. No WinQuote visual inheritance. |
| F3 | Separate product/runtime boundaries | Two entry points and independent builds/deployments; public catalog projection; Workspace domain and service boundary; migration plan for local records. | Neither artifact needs the other's session or data. Direct links and refresh work. Website content cannot expose internal deal or approval data. |

Use the existing repository initially with clearly separated product entries and modules. Preserve the tested domain and refactor presentation/persistence boundaries. A framework migration, separate repositories, microservices or a generic workflow platform are not prerequisites. Select the concrete service, database and storage deployment before asynchronous persistence implementation; record that choice once instead of changing it mid-build.

## Website packages

The finished site must contain complete page templates and working destinations, not one homepage leading to unfinished screens. Populate all first-release models with verified data. R3200 is the deep demonstration case, not an excuse for broken neighboring product pages.

| ID | Package | Included work | Done when |
| --- | --- | --- | --- |
| W0 | Content and equipment coverage | Public product taxonomy; applications; machine/variant relationships; specifications and units; image/video/document suitability; approved claims; public-price policy; media rights and source notes. | Every first-release model has accurate content, a useful image, capabilities, limitations and a next action. Unverified PAC families are not populated with invented content. |
| W1 | Public shell and homepage | Independent header/footer; desktop/mobile navigation; complete homepage hero, application/category paths, equipment demonstration, featured products, support/trust evidence and contact CTA; logo behavior; breadcrumbs. | Home answers what PAC does, where to explore and how to inquire; all visible navigation has a real destination. |
| W2 | Products and solutions | Products hub, category/listing, search and filters; Solutions hub and application detail; related equipment; useful comparisons when fields are genuinely comparable. | Buyers can browse by application or known model. Filter/back behavior, no results and clearing criteria are complete. |
| W3 | Product detail | Real gallery; application fit; workflow; specifications; included features and optional equipment; exact-model videos; brochures; service information; related machines; quote CTA. | Every covered product renders through the template with verified media, readable specs and working downloads. Product evidence never implies an unverified installed configuration. |
| W4 | Website Explorer | Product-context viewer independent of deals; photos and qualified 3D; topic/part selection; zoom/rotate/reset; clear explanations; optional saved question/view; return to product; reduced-motion and fallback behavior. | No workspace account or deal is required. Loading, missing model, unsupported WebGL and low-performance cases have usable photo alternatives. Approved PAC CAD can replace the reference later. |
| W5 | Inquiry and contact | Product context, application fields, contact details, optional attachments, review, submit and confirmation; server validation; durable independent receipt; notification to the agreed destination; deduplication, retry and delivery status. | A new browser can complete the form; the receiving destination is verified; failures retain input; repeated submission does not create duplicate deliveries; confirmation reflects actual state. |
| W6 | Supporting pages and content maintenance | Contact/support, resources/downloads, company information and privacy content; content draft/review/publish workflow; editing documentation; intentional links to existing PAC destinations when those sections are not being replaced. | No fake menu entries, unsupported service claims or empty resources pages. PAC can identify how content is updated and who owns it. |
| W7 | Site delivery quality | Search metadata, canonical URLs, sitemap, robots, social previews, error pages, image sizing/lazy loading, broken-link/download checks, consent-dependent analytics if selected, independent hosting and monitoring. | Public pages are fast and readable on representative devices; preview environments are not accidentally indexed; final URLs and redirects are verified for any replaced production pages. |

### Website page inventory

Home; Products hub; Product category; Product detail; Solutions hub; Solution detail; product-context Explorer; Request a Quote; Inquiry Confirmation; Contact/Support; Resources/Downloads; About; Privacy; Not Found and temporary service failure.

About, Resources and Support require either real finished content or intentional links to existing PAC pages. Full PAC portfolio population depends on the source inventory; the current Rollbag data cannot establish coverage for every PAC brand. Verify the current official site, assets and relevant design references during W0/F2 before final content or layout decisions.

### Website inquiry contract

An inquiry belongs to Website storage/delivery, not to Sales Workspace. Store product context, requirements, contact details, permitted references/files, submission identity and delivery state. Validate on the server; apply basic abuse protection, attachment limits, retry and duplicate protection. Define the recipient, sender identity, optional customer receipt, data retention and deletion handling. Internal quote pricing rules and approval metadata do not belong in the public content payload.

## Sales Workspace packages

| ID | Package | Included work | Done when |
| --- | --- | --- | --- |
| S0 | Durable state and access | Service commands; relational record ownership; server-authorized actors; customer-scoped access; file storage; optimistic version checks; atomic issue/publication; retry identity; migration of existing local data; backup/restore. | Seller and customer browsers share only allowed records; restarts preserve data; unauthorized access is rejected; failed/conflicting saves retain edits and cannot report success. |
| S1 | Sales daily work | Deals and quotes lists; search, sort and useful owner/stage/needs-action filters; new deal; contacts; owner; application; follow-up; alternatives; activity; close/archive/reopen rules; empty and loading states. | An unfamiliar operator can find the next task, create or resume a deal and navigate the correct alternative without a memorized script. Demo reset/seed controls stay outside normal work. |
| S2 | Scope and assisted intake | Structured written application; missing-information gate; attachments; paste email or conversational request; extract candidate fields with visible source snippets and unresolved questions; salesperson confirmation. | Scope survives editing/reload; quote readiness names missing fields. Assisted intake cannot invent products, prices or compatibility, or silently turn an unreviewed interpretation into a quote. |
| S3 | Full configurator | Base machine and included features; options catalog/search/categories; add/remove/quantity; required companions, incompatibilities and applicability; services, freight, spares and add-on equipment; explicit price and lead-time effects; display-only price visibility control. | Live changes remain fast and understandable; dependency changes show their consequences; invalid/unpriced configurations cannot be issued; repeated editing and undo/cancel preserve correct totals. |
| S4 | Engineering and commercial terms | Standard vs Engineering requirement vs Special order; what changes and why; labor hours/rate and materials; pricing ownership; lead-time impacts; currency/units; discounts and authorized overrides; quote validity; freight/tax treatment and terms. | Unknown costs remain unresolved rather than zero; special lead time is visible; policy gates apply on the server; effective totals and terms agree in editor, snapshot and output. |
| S5 | Review and approval | Application review; conditional engineering/manager requirements; reviewer assignment and queue; submit, approve, return and resubmit; reasons; policy-controlled bypass; approval invalidation; mobile browser access; notification actions. | Real actors review the intended revision. Changes invalidate relevant approvals. A travelling reviewer can see context and decide; unauthorized approval or stale-version approval fails clearly. |
| S6 | Save, revision and publication | Explicit recoverable edit buffer; truthful save state; revision reason; differences including removals/quantities/terms; frozen issued revisions; intentional repricing; select alternatives and exact revisions; customer-content preview; fixed proposal manifest. | V1 remains unchanged after V2; the rep deliberately chooses what is published; unsaved/internal/unapproved content cannot leak into the customer version. Issue does not mark a deal presented. |
| S7 | Proposal and presentation | Application understanding; recommendation and rationale; machine workflow; 2–3 alternatives; exact media; scope/exclusions; pricing/lead time; terms; open questions; guided presentation of the same published content. | A buyer understands why an option fits and can compare alternatives without treating their prices as an additive order total. Presentation and self-review use the same published scope. |
| S8 | Customer collaboration | Recipient access, invite/share/revoke/expiry policy; multiple buyer identities; section/line/alternative-anchored comments; replies; questions/change requests; preference; unresolved requests; assignment, response, resolution/reopen and publication links. | A second customer browser can comment on the right version; sales can respond and revise; discussion remains attributable; customers cannot access internal deals or other recipients' records outside their scope. |
| S9 | Media and Workspace Explorer | Exact model/configuration/application media library; video, drawing and document links; applicability qualification; open/capture/note/attach/restore; evidence selection for publication; missing/deleted asset handling; immutable published evidence. | Findings remain with the correct deal/quote without changing price. Media cannot silently change a historical proposal. Unverified geometry is visibly a reference, and load failures have a usable fallback. |
| S10 | Catalog and pricing administration | Product/option creation and editing; included/add-on definitions; option matrix; dependencies; prices/lead times; yearly batch adjustment and item exceptions; effective version; draft/review/publish; permissions and change history. | PAC can maintain the supported catalog. New quotes use the published version; older issued quotes keep their basis; repricing shows a diff and requires a deliberate action. |
| S11 | Pipeline and CRM | Owner, last contact, next action, lifecycle, won/lost and reasons; accurate publication/sharing/response events; CRM customer/deal lookup or link; enforce deal/quote-number authority; synchronization errors and duplicate handling. | Sales can locate stalled work. No formal number is issued against a fabricated or unverified CRM record in a connected release. Published, shared, viewed and accepted remain distinct facts. |
| S12 | PDF and documents | Compact PAC-branded quote PDF; cover/application/options/terms; repeat table headers and page breaks; long descriptions; drawings/layouts/PDF attachments; version-specific document bundle and filenames. | Rendered PDFs are readable, complete and match the exact published revision, totals, terms and attachments. Editing continues through a new revision rather than altering an issued file. |
| S13 | Account administration and connected services | Users/roles/settings; Google or Microsoft SSO; approval/customer notifications; feedback/change requests to admins; provider-backed e-signature and post-signature payment when included; audit and support controls. | PAC can administer users and intended settings. Notifications and commercial actions reflect verified provider state; declined/expired/revoked/signature/payment failures have explicit recovery. |

### Workspace screen inventory

Deals; Quotes; New Deal; Deal Workspace; Application and Contacts; Alternative comparison; Quote Builder; Option picker; Engineering requirement; Special order; Commercial Terms; Review Queue; Review detail; Revision comparison; Proposal Composer; Published Proposal; Customer Review; Customer Request detail; Workspace Explorer; Media Library; Catalog and Price Administration; Users/Roles/Settings; login and recipient access; unavailable/expired/revoked/forbidden states.

Use drawers, dialogs or contextual sections where they keep the current record clear. This inventory does not require one global navigation item per capability. Add Review Queue, catalog administration and other destinations only where they have real cross-deal or administrative work.

### State and authority rules

- A Deal holds customer/application context and alternatives. A working revision holds editable configuration. An issued revision is immutable. A published Proposal names exact issued revisions and adopted evidence. A Customer Response refers to that exact proposal and optional section/alternative.
- Save, review, issue, publish, share, presentation, customer preference, acceptance and payment are different events. Their UI labels and pipeline effects must match observed actions. An email send or page request is not proof of a buying decision.
- Server persistence is authoritative. Browser recovery protects unsaved work but does not create another canonical quote store. Adopt asynchronous commit handling explicitly; do not replace a synchronous localStorage call with an unawaited request.
- Internal cost/approval data is excluded from customer payloads by the server. A price show/hide toggle is a presentation aid, not access control.
- Uploaded media and evidence have stable identity and applicable versions. Replacing a catalog image must not replace evidence in an old published proposal.
- CRM numbering, discount authority, engineering rates and required reviews come from PAC policy. Existing demo assumptions, including labor rates and generic manager gates, are not confirmed policy.

## Required states across the experience

| Surface | States to design and verify |
| --- | --- |
| Lists/search | Initial loading, populated, empty, no matches, filter reset, server error, stale result, long values and narrow width. |
| Forms | Valid/invalid, required/conditional fields, long text, changed/cancelled, saving, saved, failed, retry, conflict and recovery. |
| Configuration | Valid, missing companion, incompatibility, unknown price, custom estimate pending, catalog change, lead-time impact and permission restriction. |
| Review | Not required, required, waiting, assigned, approved, returned, invalidated and stale revision. |
| Proposal | Draft preview, published current, historical, expired, superseded, revoked, missing, recipient unauthorized and download failure. |
| Feedback | New, assigned, in progress, answered, change underway, addressed in version, declined with reason, reopened and notifications failed. |
| Explorer/media | Loading, ready, no approved model, photo fallback, WebGL failure, invalid source, capture failure, restored view and missing asset. |
| Connected actions | Pending, acknowledged, failed, retryable, duplicate, expired and provider-confirmed completion. |

## Implementation sequence and parallel work

| Milestone | Work and dependency | Reviewable result and exit condition |
| --- | --- | --- |
| M0 Complete scope and sources | F1; reconcile this plan with the 41 requirements; identify catalog/media/input owners; establish current source authority. | Coverage and decision register complete. No unowned critical requirement or invented source. |
| M1 Establish design and runtime | F2/F3 in parallel with S0. Design all key and supporting states; establish independent Website entry, Workspace service/auth/storage and migrations. | Real-content screen set plus a durable, authorized save/read slice. No UI completion claim yet. |
| M2 Build independent core journeys | Website W0–W5; Workspace S1–S6. Website content and Workspace construction can proceed in parallel after their own contracts are stable. | Website reaches an honest inquiry result. Workspace can create/configure/save/review/issue/select/publish from a fresh session. Failure paths work. |
| M3 Finish customer experience and maintenance | S7–S12, supporting W6/W7; complete S13 account settings and notification surfaces. This work is designed at M1, not discovered here. | Multi-buyer Review, revision/PDF/evidence loop, catalog updates and sales follow-up operate across sessions. Both products have complete navigation and secondary states. |
| M4 Connect agreed PAC services | Complete actual CRM/numbering, chosen SSO, mail/inquiry receiving channel and any included signing/payment. External access preparation starts at M0. | Provider-specific acceptance passes. Any explicit deferral is recorded against its requirement; no simulated success appears as delivery. |
| M5 Harden, rehearse and release | Scoped automated checks, real browser/visual/PDF/accessibility verification, persistence recovery, deployment, walkthrough and documentation. | Two independent verified URLs, clean fixtures, operating instructions, acceptance evidence and a known-issue register without blocking defects. |

Parallel ownership: Website; Workspace service/domain; Workspace screens/customer experience. Keep shared domain/state changes under one owner. Each work package carries its source version, design/state specification, acceptance cases and delivered evidence using the existing harness method. Automated, visual, user-comprehension and deployment results remain separate. No new orchestration platform is required.

These milestones express dependencies, not a joint release gate. Each artifact can complete and release against its own acceptance criteria. Workspace CRM/SSO dependencies do not block a finished Website release; Website content or inquiry-delivery dependencies do not block Workspace acceptance.

Do not promise a calendar deadline from historical notes. Estimate after M0 based on the agreed product coverage, assets, review policy and external-service access; a missing provider credential should block that adapter, not unrelated design or domain work. Progress is measured by accepted outcomes, not page count or test count.

## Inputs and defaults register

| Input | Needed for | While awaiting confirmation | Owner to resolve |
| --- | --- | --- | --- |
| Initial machine families and templates | W0/W2/W3, S3/S10 | Use source-backed Rollbag records with explicit coverage; do not invent other catalog families. | Kyle with PAC product/sales |
| Exact photos, videos, drawings and approved CAD | W3/W4, S7/S9/S12 | Real applicable photos plus a labeled reference model; missing media is a visible state. | PAC product/engineering |
| Website claims, public pricing and inquiry recipient | W0/W5/W6 | Draft claims against sources; no automatic internal-price exposure; use an identified test recipient only when delivery is authorized. | PAC marketing/sales |
| Required application inputs and units | W5/S2/S3 | Existing demo inputs are examples, not a universal PAC validation policy. | PAC sales/engineering |
| Labor/material rates, lead-time aggregation, freight/tax, validity and terms | S4/S10/S12 | Preserve identified demo assumptions; keep unknown prices/terms pending. | PAC engineering/commercial |
| Reviewer roles, bypass rules, override/discount thresholds | S0/S4/S5/S13 | Configurable test policy enforced on the server; no claims of PAC approval policy. | PAC sales leadership/engineering |
| CRM vendor, test access and numbering authority | S1/S11 | Explicit demo CRM reference; connected release requires validation against the real authority. | PAC CRM administrator |
| SSO tenant, test users, customer sharing policy and mail sender | S0/S8/S13 | Real app test identities and recipient isolation; no front-end-only role enforcement. | PAC IT and project owner |
| Signature/payment inclusion, provider and commercial workflow | S13 | Design the recorded requirement; omit live commitment controls until the scope and provider are known. | Patrick with PAC decision-maker |
| Hosting/domain, operators, retention and restore targets | W7/S0/M5 | Independent preview environments and documented local operation. | Kyle with deployment owner |

Resolve these as a consolidated register, without repeatedly asking Kyle to approve routine styling or implementation details. Only missing factual authority, product-scope choices or external access should hold the dependent package.

## Acceptance journeys

1. Website buyer by application: Home → Solution → relevant product → Explorer → inquiry confirmation, in a fresh browser without a Workspace session.
2. Website buyer by model: search/filter → product specifications/video/download → inquiry; no-result, unavailable-media and submission-failure cases remain usable.
3. Sales standard quote: create/open an eligible deal → capture scope → configure 2–3 alternatives → save → reopen → review → choose proposal contents → publish.
4. Engineering exception: explain the customization → leave estimate pending → demonstrate issue blocker → authorized engineering pricing/review → publish with correct cost/lead time.
5. Review controls: price override/discount and relevant application changes trigger the correct checks; a disallowed actor cannot bypass them.
6. Customer collaboration: another browser opens the intended proposal, a second permitted buyer comments, sales responds, and a requested change produces V2 while V1 stays unchanged.
7. Explorer continuity: capture a qualified reference and note, save/reopen it on the right deal/quote, publish selected evidence; neither price nor another deal changes implicitly.
8. Catalog maintenance: revise a price/lead time or option rule, review and publish the catalog; new quotes use it, old issued quotes stay fixed, and an intentional reprice previews the difference.
9. Output: screen/PDF/attachments match model, configuration, price, terms and version; long tables and descriptions print without clipping.
10. Reliability/access: service restart, stale concurrent save, failed upload, repeated publication and expired/revoked customer access all have correct results and recoverable states.
11. Connected release: actual CRM gate, chosen login, approval notification and website receiving channel work; signing/payment are tested only if included.
12. Operation: new deployment, clean demo fixtures, migration, backup restore and separate product smoke checks can be repeated from documented steps.

Visual verification covers real content at representative desktop, tablet and mobile sizes, keyboard navigation, focus, contrast, dialogs, tables and reduced-motion/fallback behavior. Test the meaningful domain and integration risks; do not add tests that merely repeat styling implementation. Compare actual screens with the selected design contract, not with the existence of a component.

## Delivery package

- Independent Website and Sales Workspace URLs, with repeatable startup/deploy instructions and verified direct links.
- Complete English product content, documented catalog/media coverage and approved/public versus internal content boundaries.
- Service/data/access configuration, migrations, tested backups and a concise administration guide.
- Acceptance matrix with runtime, source version, browser/PDF evidence, unresolved inputs and clear release status.
- Isolated sample fixtures and reset instructions that cannot overwrite real customer work.
- Two English artifact walkthroughs. The Workspace walkthrough presents the customer proposal before revealing the internal quote/revision work; normal product navigation remains task based.
- Updated Annora pitch linking each artifact to PAC's priorities, plus a separately approved commercial offer. The pitch layer never becomes product navigation.

## Scope exclusions unless explicitly added

Website-to-Workspace ingestion; a unified portal; a generic CRM replacement; ERP, procurement, scheduling or manufacturing execution; automatic CAD/BOM generation; a multi-tenant platform; automatic pricing decisions from unreviewed AI output. Preserve the recorded CRM, SSO, signing and payment requirements in the coverage matrix rather than confusing these with excluded manufacturing scope.

## Requirement coverage

The matrix below covers every numbered requirement in section 4 of the supplied PAC discovery record. It is a scope and acceptance map, not a claim of completion. Provider-dependent items remain part of the plan and are closed only by implementation or an explicit recorded deferral.

| Requirement | Recorded capability | Package | Acceptance focus |
| --- | --- | --- | --- |
| 4.1.1 | Rep captures the project scope up front; the quote is generated from what the rep wrote down. The act of writing scope is part of the point. | S1, S2 | Written application persists and governs readiness. |
| 4.1.2 | Quoting starts after a conversation with the customer about their project. The system supports that conversation rather than replacing it. | S1, S2, S7 | The rep develops the customer conversation and explains its scope. |
| 4.1.3 | A deal (one customer, one opportunity) can hold 2 or 3 alternative quotes, because PAC often presents 2 or 3 machine options before the customer has decided a direction. | S1, S3, S6, S7 | One deal holds 2–3 distinct, comparable alternatives. |
| 4.1.4 | Quotes need a required-information gate: if something needed to quote is missing, the system asks for it before producing a quote. | S2, S3, S5 | Required missing information is named and blocks the relevant action. |
| 4.1.5 | Quote request can be entered conversationally ("create a quote for this machine with these options"), including pasting in emails. | S2 | Pasted/conversational input produces reviewable candidates, never an unchecked quote. |
| 4.2.1 | Configurator over PAC's standard machines and options, built from their Word quote templates and pricing. | F1, S3, S10 | Configuration uses source-backed templates and approved catalog data. |
| 4.2.2 | Clear delineation of standard vs custom vs special order. PAC's own terms: configured to order vs engineered to order, or "engineering requirement". | S3, S4 | Standard, Engineering requirement and Special order are distinct. |
| 4.2.3 | Custom items force a description of what is custom and why. Custom items are priced by engineering (hours, material) and the quote is flagged as not final until that is done. | S4, S5 | Description, reason, authorized engineering estimate and unresolved-price gate work. |
| 4.2.4 | Special order items change lead time. | S4 | Special-order lead-time effects are visible and preserved. |
| 4.2.5 | Accurate lead times and prices shown as the quote is configured. | S3, S4 | Live prices and lead times use an identified rule and catalog basis. |
| 4.2.6 | Per-option control over what is included in the base price vs what is a true add-on option (install was the example). | S3, S10 | Included features and paid additions are separately editable and displayed. |
| 4.2.7 | Add-ons: additional custom features, shipping, spare parts, a catalog of add-on equipment. | S3, S4 | Freight, spares, services and additional equipment are supported line types. |
| 4.2.8 | Configuration constraints (what cannot go with what) are explicit in the system. | S3, S10 | Compatibility and required-companion rules are enforced and explained. |
| 4.2.9 | Pricing and lead time tables must be easy for PAC to update themselves (yearly across-the-board increases, item-level adjustments). | S10 | PAC can publish batch and item-level price/lead-time changes safely. |
| 4.2.10 | Option matrix editable by PAC, with changes subject to internal review. | S10 | Option-matrix edits require the defined internal review before publication. |
| 4.2.11 | Price show / hide toggle so the same screen works in front of a customer and internally. Greg asked to see it twice. | S3 | Price visibility changes presentation without changing access rights. |
| 4.2.12 | Price override by role (sales may want to sell for more). | S0, S4, S5 | Only authorized roles can override price under the configured policy. |
| 4.3.1 | Structured review before a quote goes out: who reviewed it, and review against the application requirements. This is one of Greg's core complaints. | S5 | Reviewer identity, application check and exact revision are recorded. |
| 4.3.2 | Approval workflow. First thing Greg asked during the demo. | S5 | Submission, review, return and resubmission are operable. |
| 4.3.3 | Role-based rules: some users can skip approval, others cannot; who can edit custom pricing; who can override price; discounts that need sign-off. | S0, S4, S5 | Bypass, custom pricing, overrides and discounts follow server-enforced policy. |
| 4.3.4 | Approvals happen in the Annora system: the approver gets an email, clicks a link, approves. (Alternative of pushing to the CRM for approval was offered and not chosen.) | S5, S13 | A verified notification links to an authenticated review of the correct revision. |
| 4.3.5 | Approvals must work for people travelling: browser-based, internet connection only, no VPN, SSO via Google or Microsoft, "plane friendly". | S0, S5, S13 | A narrow-screen browser reviewer can use the selected SSO without VPN; interrupted connectivity is recoverable. |
| 4.3.6 | Quote revisions: rev 0, rev 1, rev 2. | S6 | Revision numbering and historical immutability survive saves and publication. |
| 4.4.1 | Quotes are presented, not just emailed. Something the rep walks the customer through. | S7 | A rep can guide the customer through the published proposal. |
| 4.4.2 | Interactive proposal: the customer can mark up, annotate, add notes and questions, and give feedback (price too high, lead time too long) inside the proposal. Patrick described a Google Doc style link with side comments; PAC agreed. | S8 | Anchored annotations, comments, questions and change requests retain their context. |
| 4.4.3 | The customer can share the proposal with their own team so several people can review and comment, since the decision is rarely one person. | S0, S8 | Multiple permitted buyers can review/comment across browser sessions. |
| 4.4.4 | A proposal for a deal covers the 2 or 3 quotes together and helps the customer choose between them. | S6, S7 | A composed proposal includes selected alternatives and supports comparison. |
| 4.4.5 | Embed PAC's YouTube videos, chosen to match the quoted machine and application, to show the machine running and guide the customer who "doesn't know what they don't know". | S7, S9 | The selected model/application video plays or provides a useful failure state. |
| 4.4.6 | Images and videos must be specific to the exact model and configuration quoted. A wrong picture on a quote once caused a customer to order the wrong machine. Patrick proposed a model / configuration media library; PAC agreed. | F1, S7, S9 | Media applicability matches the quoted model/configuration or is explicitly qualified. |
| 4.4.7 | Bring PAC's scattered content (videos, drawings, layouts, website material) together in the proposal. | S7, S9, S12 | Videos, drawings, layouts and other approved content are available in context. |
| 4.4.8 | Proposal shows what PAC understood of the need, what the machine will do, features and benefits for the application, and examples, so the customer makes the right selection rather than the model number they asked for. | S7 | The proposal explains the understood need, recommended capability and application evidence. |
| 4.4.9 | Append supporting documents to the quote to make it a proposal: cover page, PDFs, drawings and layouts tied to the version. | S9, S12 | Cover and supporting attachments are tied to the published version. |
| 4.4.10 | Quote output as PDF remains available and the quote stays fully editable. | S6, S12 | A matching PDF is available; edits continue in a working revision. |
| 4.4.11 | Send as a link; customer can sign; payment link after signature. Greg summarised "we can email them out, they can sign them" as agreed. | S8, S13 | Shared link, provider-confirmed signature and post-signature payment, or explicit recorded deferral of connected actions. |
| 4.5.1 | Integrate with PAC's CRM: pull customer / deal name, create or tie to a project, respect the existing "deal first, then quote number" gate. | S1, S11 | Real CRM linkage and numbering authority are verified for the connected release. |
| 4.5.2 | Track all quotes: owner, status, last contact, won / lost. Patrick showed this; PAC did not object. Intended to reduce the "black hole" of lost deals with no feedback. | S1, S11 | Owner, status, last contact, next action and won/lost information are usable. |
| 4.5.3 | Centralise quoting so every rep follows the same process. | S0, S1, S5 | All reps use the same authoritative records and policy. |
| 4.6.1 | Login for PAC users. | S0, S13 | Internal login establishes a real server-side identity. |
| 4.6.2 | SSO with Google or Microsoft accounts. | S13 | The selected Google or Microsoft SSO integration is verified. |
| 4.6.3 | PAC can give feedback, request changes and add products in the system without going through Annora, or ask Annora to do it. | S10, S13 | PAC can maintain supported catalog/settings and submit feedback through defined administration. |
| 4.6.4 | Base version quickly, then build on it. | M0–M5 | Reviewable milestones build on the same contracts without presenting an incomplete slice as final delivery. |

## Controlling references

- [Demo pitch and independent artifacts](PAC-DEMO-STRUCTURE.md): current product boundary and presentation logic.
- [PAC requirements record](</Users/kuanghongxu/Downloads/PAC-Machinery-Sales-Workspace-Requirements.md>): customer requirements and separately attributed Annora direction; historical commercial timing is not a new estimate.
- [Current design direction](../../DESIGN.md) and [approved screen pair](PAC-APPLICATION-DESIGN.md): Mercury, Linear details, PAC yellow and English content.
- [Recorded application journey](PAC-JOURNEY-REVIEW.md), [quote/review contract](QUOTE-REVIEW-CONTRACT.md) and [preservation contract](PRESERVATION-CONTRACT.md): behaviors and evidence to retain.
- [Static server](../../server.mjs), [sales domain](../../src/sales-domain.js), [workspace UI](../../src/sales-workspace.js) and [catalog](../../data/catalog/catalog/machines.json): implementation baseline.

Older architecture, execution and harness notes contain historical rollout states and superseded visual choices. Use them for evidence and methods; this delivery plan and the latest user direction govern current scope. No application code or deployment was changed while preparing this plan.
