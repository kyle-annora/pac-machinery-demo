# Current artifact capabilities and demo boundaries

Inventory date: November 8, 2026, after the Website-to-Workspace rollback. This document maps the surviving application to the pitch. It is an editing and rehearsal reference, not a production-readiness certificate. Screen evidence, the current artifact manifest and the release verification record determine what a particular presentation can show.

## Two artifacts, one sales story

**Website** and **Sales Workspace** are independent artifacts. Their value can be presented in a continuous pitch without connecting their customer records or navigation. The active application does not receive Website inquiries, expose an Inbox or create Deals from a Website form.

**Customer Proposal** is the customer-facing output of Sales Workspace, not a third product. It uses the PAC customer-facing brand family. **Explorer** is a capability within the current Deal; it is not another product and does not constitute a Website-to-Workspace bridge.

The approved current application remains the source of its screens and behavior. Do not restore old final Website or Workspace screens, the withdrawn intake experiment or a different visual system to fill a presentation slot.

## The two linear demonstrations

### Flow 1 — Prepare and publish an offer

**Deal → Requirements → A/B configuration → Save → Review → Publish → Customer Proposal**

Start with the illustrative Harbor Components Deal. Confirm the bag and process requirements. Compare standard loading with assisted opening, show the required fingers and bag-width rule, save both alternatives and approve their exact revisions. Publish a customer version and compare its options, included scope, equipment references and line items.

The customer's question at the end is the start of Flow 2. A working preview is not the published version. Saving, approval and publication are distinct actions; an approved draft is not an email delivery or a customer acceptance.

### Flow 2 — Clarify, revise and preserve the history

**Customer question → Activity → Equipment finding → Quote revision → Save and review → Publish → Compare versions**

Ask about a particular option and equipment detail in a published Proposal. The question appears in Activity with its version, alternative, quote revision and topic. Sales can reply, inspect PAC photographs or a clearly labeled reference assembly, and save an internal finding. Explicitly create the related quote revision or link the finding to an existing working revision. Review the changed scope and publish a new version; retain the earlier offer and its conversation.

For a short demonstration, use one PAC photo finding. The optional 3D branch demonstrates select, explode or operate, capture, save and restore before returning to the same Deal. A generic assembly illustrates the interaction only; it is not PAC equipment or PAC CAD. No automatic option selection, pricing or public transfer of the finding occurs.

These are rehearsal sequences over the current capabilities, not two additional applications. An end-to-end customer journey may also be described in the pitch, but the transition from Website to this sample sales case remains an explained handoff.

## Page and route inventory

Paths below are relative to the application repository root. They describe the actual application routes; they are not public demo destinations. The clean pitch source package need not contain application code. A published version exists only in the browser storage where it was created.

| Page or surface | Route or entry | What is available | Demo use |
| --- | --- | --- | --- |
| Deal directory | `application/#deals` | Search and open the single illustrative Harbor opportunity; stage, quote range, owner and next action; no-results state | Flow 1 entry; portfolio evidence |
| Deal overview | `application/#deal` | Customer/contact, owner, application brief, A/B status and totals, latest Proposal, recent conversation, next action and finding count | Flow 1 context; Flow 2 follow-up |
| Application requirements | `application/#requirements` | Shared bag width, length, material and target; edit dialog; visible items PAC must confirm | Flow 1 scope; Flow 2 only when the requested change affects both alternatives |
| Quote A | `application/#builder/a` | Standard-loading configuration, services, engineering scope, note, totals, save, revision and review actions | Flow 1 baseline |
| Quote B | `application/#builder/b` | Assisted-loading configuration, dependencies, services, engineering scope, note, totals and linked question/finding context | Flow 1 comparison; Flow 2 revision |
| Review and publication | **Review & publish** from Quotes or Published proposals | Both alternatives, revision-specific prices, validation issues, save/approve actions and publication gate | End of Flow 1; repeated for Flow 2 |
| Working customer preview | `application/#preview` | Current working configurations in the customer layout, visibly marked draft; customer questions disabled | Optional preparation check; never substitute for publication |
| Published proposal list | `application/#proposals` | Exact saved customer versions, A/B revision and total references, question counts and open-version actions | Flow 2 history proof |
| Customer activity | `application/#activity` | Version-specific questions, replies, response status, revise-related-option and open-original-version actions | Flow 2 entry and response |
| Equipment Explorer | `application/#explorer` | PAC photos, separate 3D reference, finding form, saved findings and explicit revision/link actions | Flow 2 clarification; optional detailed demonstration |
| Published customer view | `application/#proposal/1` or another locally available version number | Customer overview, comparison, equipment references, detailed line items, version selector and conversation | Flow 1 output; Flow 2 original/new version comparison |
| Customer-only presentation | `application/?view=customer#proposal/3` when V3 is available locally | Published customer surface without internal Workspace navigation | Customer role in either flow; UI isolation only |
| Workspace information | **Workspace details** in the sidebar | Local-demo limits and **Export workspace backup** | Presenter support, not a main pitch scene |
| Invalid or unavailable view | Invalid builder/page/version or unavailable stored record | Explicit unavailable/not-found state; does not silently substitute another alternative or publication | Supporting integrity evidence |

## Retained behavior by capability

### Deal and requirements

- The current directory contains one Harbor Components opportunity. It is not a multi-deal CRM or inquiry queue.
- Owner, next action and follow-up date are editable and stored with the Deal.
- Requirements are shared by A and B. Changing shared requirements invalidates their reviews; published alternatives need new working revisions before scope can change. Earlier publications retain their original scope.
- Missing input remains unknown. The buyer's target throughput is a requirement, not a performance promise.

### Quote builder and review

- A and B are alternatives in the same Deal, with separate revision numbers and working statuses.
- Equipment options include Easy Load Bag Opener and Seal Flattener Fingers. The opener requires fingers and a bag width of at least 10 inches.
- Start-up/training is a selectable service. Source pricing is inspectable and prices can be hidden while discussing configuration.
- Engineering scope accepts an explicit description, customer price and additional lead-time impact. Unknown engineering price or timing blocks approval; it is not treated as zero.
- Save, approval and publication are separate. Approval is tied to the exact reviewed content. Editing reviewed content requires save and reapproval.
- Published quotes are read-only until a revision is created. A new publication freezes the reviewed alternatives, requirements and customer context; it does not overwrite an earlier version.
- A source customer question or finding can remain attached to the working revision. Browsing equipment does not add a priced option.

### Customer Proposal and feedback

- The customer surface includes an overview, A/B cards and comparison, detailed line items, equipment reference photographs and contextual questions.
- Equipment reference controls cover bag opening, loading area and whole machine. **Ask about this detail** preselects the relevant topic.
- Questions record Proposal version, option, quote revision and topic. Sales replies remain with that conversation. Publishing a revision does not silently mark a question resolved.
- The version selector and Published proposals list preserve access to locally available earlier versions.
- **Print / PDF** invokes the browser print interface and includes detailed quotation content. This is not a generated, delivered or remotely stored PDF service. The existing verification records do not establish an end-to-end print/PDF acceptance test.

### Deal-local Explorer

- Real PAC photographs are the initial reference mode; they are model/option references, not proof of an exact assembled configuration.
- The separate crank-slider assembly supports component selection, Explore, Explode and Operate modes, view capture and saved-view restoration. Capture pauses motion. Loading or rendering failure leaves PAC photos available.
- Findings contain the selected reference, question/observation, option and quote revision. A 3D finding requires a captured view before save.
- Saved findings support view/restore, link to a working quote or create a revision, and mark addressed/reopen.
- Findings remain internal. They are not automatically copied into Customer Proposal, issued media or Website records. Creating a revision from a finding does not itself change its price.
- Verified PAC geometry, configuration-specific visuals and deliberate immutable publication of findings are future scope.

### Local persistence and operational controls

- Drafts, approvals, publications, comments, follow-up and findings persist in this browser under the original Harbor storage key.
- Cross-tab changes are detected. Storage failures and unavailable records have visible states; the app avoids silently replacing records.
- Backup export is present; an import/recovery UI is not. Existing evidence does not establish end-to-end backup recovery, storage-quota or cross-tab conflict acceptance testing.
- Customer mode hides internal navigation; it does not implement authentication or authorization. A URL does not carry the locally stored Proposal to another person or device.

## Recorded illustrative state

The rollback verification preserved Harbor V1, V2 and V3, customer comments, two findings and the next action. This is the reviewed browser's state, not a seed promised to every browser.

| Customer version | Option A | Option B | Demonstrated change |
| --- | --- | --- | --- |
| V1 | Rev 0 · $33,060 | Rev 0 · $40,810 | Initial standard/assisted comparison |
| V2 | Rev 0 · $33,060 | Rev 1 · $41,310 | Illustrative $500 loading guide and one-week engineering impact |
| V3 | Rev 0 · $33,060 | Rev 2 · $41,310 | Clarification-only revision; price unchanged |

Source-template prices are dated January 29, 2025, in USD: R3200 $27,580; start-up/training $5,480; opener $6,035; fingers $1,715. The $500 guide and one-week impact are illustrative test inputs, not PAC-sourced engineering estimates. PAC must confirm current prices, suitability, terms, freight, tax and final lead time before a real offer.

The recorded next action is to review the loading guide with Harbor and confirm bag samples. Two retained findings reference B Rev 1; a finding can preserve that original context while contributing to a later revision.

## Website: planned versus withdrawn

The independent Website remains an intended artifact for application education, matching PAC media, equipment exploration and a useful inquiry. Its next design/implementation must be evaluated independently; the existence of Workspace screens does not mean the Website has been completed.

The pitch now makes two **planned** Website entry paths explicit:

- **Request this product:** the buyer knows the model. Show it in the request, collect application context and let the buyer review the summary.
- **Help me choose:** the buyer knows the process or requirement. Guide the relevant questions, allow “not sure” and review the knowns and open questions together.

Both paths converge on a buyer-reviewable inquiry summary. The medical / shrink / manual example is derived from the new shared ChatGPT prompt; it is not a submitted PAC inquiry, suitability determination or Harbor Deal. Form submission, routing and a Workspace connection remain outside current working capabilities.

PAC’s existing public site already has a general quote page and a Dempack H30 Instant Quote form. The proposed difference is explicit product context and structured requirements, not the existence of a form. The current backend’s handling of product metadata was not verified.

The recent `site/` and intake experiment was withdrawn. Its Website form/receipt, Inbox, create/link-Deal actions, inquiry-created opportunities and cross-artifact reference import are not active capabilities. Preserved records do not authorize restoring them. The active application does not read the experiment's inquiry-created Deals.

Do not use Cedar screenshots or data. Exclude the entire `application/verification/intake-integration/` set from current presentation evidence. The older Website, legacy Workspace, seller-presentation routes and review-token pages are also not substitutes for the approved current screens. Keep a clearly labeled Website plan where current evidence is absent.

## Evidence selection for the pitch

Use actual current application screens. Keep the main story concise and provide the complete page inventory through the demo gallery/supporting pages. The deck's typography governs its surrounding copy; do not repaint application screenshot typography to make it resemble the deck.

Existing retained evidence, relative to the application repository root:

| Evidence | Appropriate use |
| --- | --- |
| `application/verification/rollback-2026-11-08/deals.png` | Post-rollback Harbor-only directory; no Inbox |
| `application/verification/deal-integration/overview-desktop.png` | Deal context and operational shell |
| `application/verification/deal-integration/builder-desktop.png` | Current Quote builder within the Deal |
| `application/verification/deal-integration/proposal-desktop.png` | Customer Proposal surface |
| `application/verification/deal-integration/explorer-desktop.png` | Actual reference renderer and Deal-local finding workflow |
| `application/verification/proposal-comparison-desktop.png` | Customer A/B comparison |
| `application/verification/deal-integration/overview-mobile.png` | Responsive Deal evidence |
| `application/verification/deal-integration/proposal-mobile.png` | Responsive customer surface |
| `application/verification/deal-integration/explorer-mobile.png` | Responsive Explorer stage |
| `application/verification/deal-integration/explorer-mobile-form.png` | Finding form and capture/save controls |
| `application/verification/deal-integration/explorer-mobile-findings.png` | Saved findings and restore/revision actions |

The earlier application root verification images document the accepted quoting slice before the full Deal shell. Prefer the later Deal-integration or newly captured post-rollback screens when both show the same capability. Use fresh captures for requirements, review, activity and published-version history if the gallery needs those exact pages. A screenshot proves its recorded state; it does not by itself prove every button or a live public endpoint.

The quote/Deal domain suites passed 24 tests after rollback. Desktop and mobile visual evidence and the recorded functional walkthrough are documented in `application/verification/deal-integration/README.md`; rollback scope is recorded in `application/verification/rollback-2026-11-08/README.md`. Verification limits remain part of the evidence.

## Presentation and handoff rules

- Current Workspace and Proposal may be shown as verified screen evidence of a **browser-local prototype**. Do not relabel them as an authenticated or remotely shared production service.
- Website and Workspace must remain visibly independent in diagrams. A narrated handoff is not an implemented data bridge.
- Keep the Website’s two planned inquiry paths distinct from the two current Workspace rehearsal flows. An illustrative summary must not be represented as a submitted record.
- Keep the full Proposal after configuration, review and publication in the main sales narrative. A brief result teaser is not a replacement for that forward sequence.
- Customer proof belongs after the PAC baseline discussion and immediately before the two-week Annora trial offer.
- Include original screens, screen provenance and the two run sequences in the Patrick handoff. Add new presentation assets and diagrams to the source-package allowlist so they survive packaging.
- Preserve public-demo URL validation. A public deck can show screenshots and instructions even when its interactive record is local. Never place a local address in a verified public-demo slot or substitute a stale artifact to make a link appear live.
- Signature, payment, email delivery, CRM synchronization, SSO, catalog administration and shared backend services are not connected. None is a current demo completion claim.
- The commercial proposal remains two weeks free, with defined cases and a joint review. Paid work starts only after mutual agreement on scope, fees and support; there is no automatic billing. Current prototype evidence is not a guarantee that every production dependency can be completed in two weeks.
