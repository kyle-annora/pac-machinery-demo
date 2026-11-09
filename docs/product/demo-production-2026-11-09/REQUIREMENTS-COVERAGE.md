# PAC requirements coverage

**Draft production coverage. This is not a claim of implemented functionality.**

Planned proof in the script and the current implementation baseline are recorded separately.

## Coverage definitions

- **Main:** Directly evidenced in the primary two-act script within its declared sample scope.
- **Partial:** Some required behavior is shown, but material parts remain outside the primary script or depend on further input.
- **Appendix:** A separate optional demonstration or follow-on specification; not part of Patrick's main Next-only path.
- **Integration:** Requires an external service, deployment, access control or shared backend; a local preview does not prove completion.
- **Design:** States and interaction design are specified; the real service is deliberately outside first-round execution.
- **Deferred:** Explicitly excluded from this production pass.

## Source and scope

- **File:** PAC-Machinery-Sales-Workspace-Requirements.md
- **Document date:** 2026-11-04; updated 2026-11-07
- **Scope:** All 41 numbered requirements in section 4. Sections 1–9 record PAC requests and agreements. Section 10 records Annora build direction and is separated below.
- **Citation note:** Citations reproduce the requirement document's transcript references. C1 is 27 October 2026; C2 is 28 October 2026. This matrix does not independently authenticate those recordings.
- **C1:** https://notes.granola.ai/d/65d6df5e-e566-4040-988d-b22d1015c605
- **C2:** https://notes.granola.ai/d/7b206966-04e8-4cad-b551-09446169972d

## How to interpret this coverage

- **Coverage:** Planned demonstration coverage, not delivered functionality. Main means the scripted path directly shows the requirement within the stated sample scope; it does not imply production readiness or full catalog coverage.
- **Proof:** Observable acceptance expected after the proposed production work is complete. These are target checks, not claims that the current app already passes them.
- **Current status:** Historical assessment of the application base when the script was prepared. See demo/README.md and demo/verification/README.md for implemented guided-run behavior and checks. This matrix is not a production readiness report.
- **Independence:** Website and Sales Workspace remain independent artifacts. A06 changes the presentation to a prepared sales deal. No automatic inquiry-to-deal integration is claimed.
- **Commercial:** The user's current framing is two weeks free, followed by paid work only after mutual confirmation. Historical fees, percentages and automatic conversion are not approved terms.

## Current implementation status definitions

- **Working-base:** Existing local domain/UI behavior provides a usable base; it has not thereby passed the new scripted acceptance checks.
- **Partial:** Some behavior exists, but a material requirement or new script behavior is missing.
- **Not-built:** The required capability has no implemented equivalent in the current local application.
- **External-input:** A necessary PAC decision, source asset, policy or integration identity is unresolved; any current demonstration must label its substitute.

## Sample boundaries

- Source-template prices are dated 29 January 2025. They are demo inputs, not current PAC pricing commitments.
- Both initial alternatives contain the $27,580 R3200 base plus a separately charged $5,480 training allowance: $33,060 each. Training is not free or included in the machine base price.
- Option B adds the $6,035 Easy Load Bag Opener and $1,715 Seal Flattener Fingers, giving $40,810. The opener requires the fingers and a bag width of at least 10 inches.
- The 12 × 16 inch dimensions are prepared illustrative values, confirmed by a demo actor. The 20 bags/minute figure is a customer goal, not a machine performance guarantee.
- A six-week base lead time is illustrative only. One additional illustrative engineering week makes seven weeks for B Rev 1. PAC must confirm actual timing.
- The engineering example is four hours at a hypothetical $100/hour plus $100 materials. The $500 proposed customer add-on is separately reviewed; this is not PAC's approved rate or margin policy.
- V1 contains A Rev 0 at $33,060 and B Rev 0 at $40,810. V2 contains unchanged A Rev 0 and B Rev 1 at $41,310.
- An exact configuration media mismatch is a release hold. Generic reference geometry and a base-machine photo cannot be described as evidence of an unverified configuration. No synthetic custom-guide image is approved.
- The primary Explorer uses PAC equipment photos and recorded findings. The separate 3D capability example is a reference assembly, not PAC CAD.
- CRM, delivered emails, SSO, authenticated reviewer roles and remote multiuser proposal collaboration are not live in the current local application.

## Context that must survive production

- **Source ref:** Sections 2–3 · C1 5:13; 9:15; 10:21–10:34; 14:05–14:47
- **Rule:** Do not invent a severe quote-production time problem. PAC reported roughly ten minutes to build a quote and typical delivery within 24 hours. Lead with a better buying conversation, structured review, higher win rate and faster close; do not promise an outcome from the demo.
- **Source ref:** Section 5 · C1 20:38; Website
- **Rule:** Website intake and AI search are Annora's partnership value proposition, not PAC's primary discovery ask. Keep the entry sequence brief and reserve most time for quoting and proposal discussion.
- **Source ref:** Sections 1 and 9 · Website Instant Quote Machines; C1 7:28
- **Rule:** The Website's existing Instant Quote and Request A Quote paths must be acknowledged. Their future integration policy and PAC's CRM are unresolved. New product-specific and needs-help routes do not establish a production connection.
- **Source ref:** Section 6 · C1 24:18–24:24; 8:28; 10:21; 12:14
- **Rule:** Do not make auto-drawings, line integration, change-order analytics, more leads or ERP integration prerequisites for the first sales demonstration.
- **Source ref:** Sections 7 and 9 · C2 32:38
- **Rule:** 3D model availability is unconfirmed. Photo-based Explorer can support a concrete question and finding; reference 3D is an optional capability preview and cannot supply exact-configuration evidence.

## 4.1.1 Capture the project scope up front and generate the quote from the rep's written scope.

- **Source ref:** Section 4.1.1 · C1 6:04–6:17
- **Source type:** Asked
- **Coverage:** main
- **Step ids:**
  - A07
  - A09
  - A10
  - A11
  - A17
  - A21
- **Proof:** The prepared deal displays the source request and the rep's written application scope. The rep confirms that scope before creating the two drafts. Review and the published proposal show the same scope without retyping.
- **Gap:** Structured scope exists, but the prepared source-request presentation, explicit confirmation step and deterministic script checkpoint still need production work.
- **Current status:** partial

## 4.1.2 Start quoting after a conversation about the customer's project; support the conversation rather than replace it.

- **Source ref:** Section 4.1.2 · C2 0:58
- **Source type:** Asked
- **Coverage:** main
- **Step ids:**
  - A06
  - A07
  - A09
  - A10
  - A21
  - B01
  - B13
- **Proof:** The presentation explicitly moves to an independently prepared sales deal after a customer conversation. The rep checks missing information, confirms the application, presents the proposal, and answers the customer's later question.
- **Gap:** The demo must supply the conversation context and prepared follow-up. Website submission must not imply an automatic quote or an implemented inquiry-to-deal integration.
- **Current status:** working-base

## 4.1.3 Keep two or three alternative quotes for one customer opportunity in one deal, including different machine choices.

- **Source ref:** Section 4.1.3 · C2 33:32–34:28
- **Source type:** Asked, then agreed to the deal / quote 1–2–3 framing
- **Coverage:** partial
- **Step ids:**
  - A07
  - A11
  - A16
  - A20
  - A24
  - B12
  - B14
- **Proof:** One deal holds A and B with separate configuration, revision, approval and total. The proposal presents both together. Publishing B Rev 1 preserves A Rev 0 and the prior publication.
- **Gap:** The main demo proves two alternatives for one R3200. Three alternatives and comparison across different machine families remain a separate catalog and data-model acceptance case.
- **Current status:** working-base

## 4.1.4 Ask for missing required inputs before producing a quote.

- **Source ref:** Section 4.1.4 · C2 25:37–26:09
- **Source type:** Agreed
- **Coverage:** main
- **Step ids:**
  - A04
  - A08
  - A09
  - A10
  - A11
- **Proof:** A missing bag width blocks draft creation at A08. The system identifies the missing field, shows the prepared clarification, and creates the drafts only after the rep confirms 12 × 16 inch bags at A10.
- **Gap:** Current completeness validation gates approval, not initial draft creation. The earlier creation gate and its guided recovery must be implemented; an approval-only error is insufficient evidence for this requirement.
- **Current status:** partial

## 4.1.5 Accept conversational quote requests, including pasted customer emails.

- **Source ref:** Section 4.1.5 · C2 5:33–7:16; 24:52–24:59
- **Source type:** Agreed
- **Coverage:** partial
- **Step ids:**
  - A07
  - A09
  - A10
- **Proof:** The source email is visible next to suggested structured requirements. The rep can inspect and confirm the prepared values before they enter the quote scope. The explanation says the extraction is a prepared demonstration.
- **Gap:** A general paste-email intake and live extraction service are not established by this deterministic example. Do not present prepared text or suggested dimensions as a live AI result.
- **Current status:** not-built

## 4.2.1 Configure PAC standard machines and options using their Word quote templates and pricing.

- **Source ref:** Section 4.2.1 · C1 15:47–16:00; C2 28:18
- **Source type:** Asked
- **Coverage:** main
- **Step ids:**
  - A11
  - A12
  - A13
  - A16
  - A24
- **Proof:** The R3200 configuration uses the dated source basis and named PAC options. Selecting opener and fingers updates the line items and B total from $33,060 to $40,810 while A stays unchanged.
- **Gap:** The existing base covers a small R3200 sample. Current PAC validation, broader template ingestion, additional machines and self-service catalog operations are outside this main demonstration.
- **Current status:** working-base

## 4.2.2 Distinguish standard configuration, engineering requirements and special-order items.

- **Source ref:** Section 4.2.2 · C2 11:53; 16:43–17:39
- **Source type:** Agreed
- **Coverage:** partial
- **Step ids:**
  - A11
  - A12
  - B05
  - B06
  - B07
  - X-SPECIAL
- **Proof:** Catalog options remain standard configured items. A new custom guide is explicitly marked Engineering requirement and cannot be treated as ready while price or timing is unknown. An optional special-order example shows its separate classification.
- **Gap:** The current base distinguishes a custom engineering amount from standard options, but does not establish a distinct special-order item type or handling policy.
- **Current status:** partial

## 4.2.3 Require a what-and-why description for custom items, engineering hours and material pricing, and a not-final flag until engineering is complete.

- **Source ref:** Section 4.2.3 · C2 16:44; 19:47–20:12
- **Source type:** Agreed
- **Coverage:** main
- **Step ids:**
  - B06
  - B07
  - B08
  - B09
  - B10
  - B11
- **Proof:** The custom guide records what changes and why. Review blocks while the engineering estimate or lead-time impact is unknown. Four hours × $100/hour plus $100 materials produces a $500 estimate; the proposed $500 customer add-on and one additional week receive a separate recorded review before approval.
- **Gap:** Current engineering input accepts a description, direct customer amount and additional weeks. Separate why, hours, configurable rate, materials, cost-versus-selling-price fields and engineer attribution still need implementation. All estimate values remain illustrative.
- **Current status:** partial

## 4.2.4 Reflect special-order items in the quote lead time.

- **Source ref:** Section 4.2.4 · C2 17:17
- **Source type:** Agreed
- **Coverage:** appendix
- **Step ids:**
  - X-SPECIAL
- **Proof:** A separately classified special-order item shows its confirmed lead-time impact and changes the displayed quote timing according to the agreed policy.
- **Gap:** The main story's extra engineering week does not prove special-order handling. A special-order item model, PAC timing rule and optional demonstrator still need to be defined.
- **Current status:** not-built

## 4.2.5 Show accurate prices and lead times while configuring the quote.

- **Source ref:** Section 4.2.5 · C1 4:30; 9:25
- **Source type:** Asked
- **Coverage:** partial
- **Step ids:**
  - A11
  - A12
  - A13
  - A15
  - B07
  - B08
  - B14
- **Proof:** Visible totals follow the selected line items exactly. Pending engineering values remain unknown rather than zero. The sample timing moves from an explicitly illustrative six weeks to seven weeks after the approved one-week addition.
- **Gap:** Prices come from the 29 January 2025 source basis and are not confirmed current. Actual base lead time and engineering timing require PAC validation. The current base does not contain a confirmed base lead time, so accuracy of live commercial terms cannot yet be claimed.
- **Current status:** partial

## 4.2.6 Control per option whether its cost is included in the base or charged as an add-on.

- **Source ref:** Section 4.2.6 · C2 18:39–19:10
- **Source type:** Asked
- **Coverage:** partial
- **Step ids:**
  - A11
  - A13
  - A24
  - X-SPECIAL
- **Proof:** The main quote makes the machine base, chargeable options and separately charged training explicit. The optional catalog demonstration changes one item's inclusion policy without double counting the base or silently zeroing a charge.
- **Gap:** The current sample selects chargeable lines; it does not provide a general included-in-base versus add-on control. Training is charged at $5,480 in both alternatives and must never be described as free or included in the machine base.
- **Current status:** partial

## 4.2.7 Support custom features, shipping, spare parts and catalog add-on equipment.

- **Source ref:** Section 4.2.7 · C2 19:10; 20:46
- **Source type:** Agreed
- **Coverage:** partial
- **Step ids:**
  - A12
  - A13
  - B06
  - B08
  - X-SPECIAL
- **Proof:** Standard options and the engineering add-on appear as separately identified quote lines. The optional add-on catalog demonstrates shipping, spare parts and auxiliary equipment with their own quantity, charge and timing treatment.
- **Gap:** The main story demonstrates machine options and one custom feature. Shipping, spare-parts catalogs and general auxiliary equipment are not demonstrated or implemented by those lines; their pricing inputs remain to be supplied.
- **Current status:** partial

## 4.2.8 Make configuration compatibility constraints explicit.

- **Source ref:** Section 4.2.8 · C2 24:59
- **Source type:** Agreed
- **Coverage:** main
- **Step ids:**
  - A08
  - A12
  - A13
  - A17
- **Proof:** Adding the Easy Load Bag Opener exposes its requirement for Seal Flattener Fingers and bags at least 10 inches wide. The incomplete configuration cannot be approved or published; adding the fingers with confirmed 12-inch width resolves the blocker.
- **Gap:** A working constraint exists for this sample. The production pass still needs the visible blocked state and recovery choreography; a full cross-product constraint matrix requires PAC input.
- **Current status:** working-base

## 4.2.9 Let PAC update pricing and lead-time tables, including broad yearly increases and individual adjustments.

- **Source ref:** Section 4.2.9 · C1 12:22–13:05; C2 17:54
- **Source type:** Asked
- **Coverage:** appendix
- **Step ids:**
  - X-CATALOG
- **Proof:** A catalog administrator previews an across-the-board increase, edits an exception and lead time, reviews the resulting basis, and publishes a new effective version while issued proposal snapshots retain their original basis.
- **Gap:** The current BASIS is a frozen code constant, not a PAC-editable table. Catalog editing, effective dates, batch adjustment, review, permissions and historical price-basis selection require new implementation.
- **Current status:** not-built

## 4.2.10 Allow PAC to edit the option matrix with internal review of changes.

- **Source ref:** Section 4.2.10 · C2 22:06
- **Source type:** Agreed
- **Coverage:** appendix
- **Step ids:**
  - X-CATALOG
  - X-ROLES
- **Proof:** A draft option or compatibility-rule change is visible to a reviewer and cannot become the active catalog until approved. Existing issued proposals remain unchanged.
- **Gap:** The present options and rules are code-defined. Editable matrices, change review, authorized catalog publication and role policy are not built.
- **Current status:** not-built

## 4.2.11 Provide a price show/hide toggle for internal and customer-facing conversations.

- **Source ref:** Section 4.2.11 · C2 10:09–10:36; 15:42
- **Source type:** Agreed
- **Coverage:** main
- **Step ids:**
  - A14
  - A15
- **Proof:** Hide prices removes line prices and totals without altering the configuration or stored values. Show prices restores exactly the same figures. The current presentation mode remains visually obvious.
- **Gap:** The local toggle is a working base. The guided transition must check that summaries, sticky totals and any visible price-bearing secondary UI obey the same setting. This is presentation control, not a security boundary.
- **Current status:** working-base

## 4.2.12 Allow authorized users to override selling prices, including increases.

- **Source ref:** Section 4.2.12 · C2 20:31–20:46
- **Source type:** Agreed
- **Coverage:** appendix
- **Step ids:**
  - X-ROLES
- **Proof:** An authorized role records a selling-price override and reason. An unauthorized role cannot do so. A price change invalidates the prior approval and appears in the review trail.
- **Gap:** PAC's override and discount authorities are unresolved. Local form editing or the engineering add-on is not proof of authenticated role-based price overrides.
- **Current status:** external-input

## 4.3.1 Review the quote against the application requirements before issue and record who reviewed it.

- **Source ref:** Section 4.3.1 · C1 4:30–4:50; 5:19; 7:22
- **Source type:** Asked
- **Coverage:** main
- **Step ids:**
  - A17
  - A18
  - A19
  - A20
  - B10
  - B11
  - B12
- **Proof:** Review shows scope, configuration constraints, price, timing and media readiness for each alternative. The demo records a clearly labeled prepared reviewer identity, decision and quote revision. A changed quote cannot reuse an outdated approval.
- **Gap:** Snapshot approval invalidation exists. Reviewer identity, application-review checklist and immutable actor trail still need work. A prepared demo actor is not an authenticated PAC approval policy.
- **Current status:** partial

## 4.3.2 Provide a quote approval workflow.

- **Source ref:** Section 4.3.2 · C2 8:31
- **Source type:** Asked
- **Coverage:** main
- **Step ids:**
  - A16
  - A17
  - A18
  - A19
  - A20
  - B07
  - B09
  - B10
  - B11
  - B12
- **Proof:** A and B must be saved and individually approved before V1 can publish. Unknown engineering blocks B Rev 1 approval. Once the change is saved, reviewed and approved, V2 publishes without silently reapproving or changing A.
- **Gap:** Local save, approval and publish gates provide a working base. Named actor recording, real reviewer assignment and remote approval delivery are separate work.
- **Current status:** working-base

## 4.3.3 Apply role-based approval, custom-pricing, price-override and discount-signoff rules.

- **Source ref:** Section 4.3.3 · C2 8:34; 20:25–20:44
- **Source type:** Agreed
- **Coverage:** partial
- **Step ids:**
  - A17
  - A18
  - A19
  - B08
  - B10
  - B11
  - X-ROLES
- **Proof:** The main script distinguishes sales, engineering and reviewer responsibilities with prepared demo actors. The optional policy case verifies who can skip approval, edit custom pricing, override price or approve a discount, including a denied action.
- **Gap:** Current local actions do not enforce authenticated roles. PAC must name approvers and define skip, override and discount rules; a UI role label cannot stand in for enforcement.
- **Current status:** external-input

## 4.3.4 Notify approvers by email and let them approve through a link in the Annora system.

- **Source ref:** Section 4.3.4 · C2 40:29–41:26
- **Source type:** Agreed
- **Coverage:** integration
- **Step ids:**
  - A17
  - A18
  - A19
  - B10
  - B11
  - X-ROLES
- **Proof:** In the integrated release, an authorized reviewer receives a real notification, opens the referenced saved revision, approves in the application, and the original sales session observes the recorded decision.
- **Gap:** Only local approval actions exist. Email delivery, durable review links, recipient authorization and shared status are not live. Prepared email or reviewer screens must be labeled previews, not sent messages.
- **Current status:** partial

## 4.3.5 Make approvals usable while travelling in a browser without VPN, with Google or Microsoft SSO.

- **Source ref:** Section 4.3.5 · C2 41:31–42:43
- **Source type:** Asked
- **Coverage:** integration
- **Step ids:**
  - X-ROLES
- **Proof:** An authorized reviewer can open the hosted application on an ordinary internet connection, sign in through the agreed provider and complete review at supported laptop and mobile sizes without VPN.
- **Gap:** Browser UI exists but does not establish hosted approval, identity, remote persistence or poor-connectivity behavior. The source asks for travel-friendly access; it does not authorize a promise of offline approval.
- **Current status:** partial

## 4.3.6 Support numbered quote revisions such as Rev 0, Rev 1 and Rev 2.

- **Source ref:** Section 4.3.6 · C2 20:46
- **Source type:** Agreed
- **Coverage:** main
- **Step ids:**
  - A11
  - A20
  - B05
  - B09
  - B11
  - B12
  - B15
- **Proof:** Revising published B Rev 0 creates B Rev 1 as a draft. V2 points to A Rev 0 and B Rev 1; V1 still shows A Rev 0 and B Rev 0 with its original amounts, scope and conversation context.
- **Gap:** Revision and frozen-publication primitives exist. A deterministic initial state, visible revision comparison and Next-driven sequence still need production work; previous publications in one browser are not portable fixtures.
- **Current status:** working-base

## 4.4.1 Give the rep a customer proposal to present and walk through, not only an emailed quote.

- **Source ref:** Section 4.4.1 · C1 6:20–6:33; C2 28:27–29:07
- **Source type:** Asked
- **Coverage:** main
- **Step ids:**
  - A20
  - A21
  - A22
  - A23
  - A24
  - B14
- **Proof:** After publication, the presenter opens the actual versioned customer view and explains the need, machine, application fit, options, resources and decision. Internal review controls and costs are absent from that view.
- **Gap:** The proposal has a working local base. The planned narrative hierarchy, richer media and polished presentation sequence remain to be produced. The forward flow supersedes the older proposal-first demo order.
- **Current status:** working-base

## 4.4.2 Let customers annotate, ask questions and discuss price or lead time inside the proposal.

- **Source ref:** Section 4.4.2 · C2 29:07–30:11
- **Source type:** Asked / Agreed
- **Coverage:** partial
- **Step ids:**
  - B01
  - B02
  - B13
  - B14
  - B15
- **Proof:** A customer question attaches to V1 and B Rev 0, appears in sales Activity with the same context, and receives a reply linking V2. The original question remains associated with its original publication.
- **Gap:** Contextual comments are a working base. Freehand markup, rich annotations and remote shared commenting are not demonstrated by a local text thread and need separate scope.
- **Current status:** partial

## 4.4.3 Allow the customer to share a proposal with teammates so multiple people can review and comment.

- **Source ref:** Section 4.4.3 · C2 31:39–31:58
- **Source type:** Asked
- **Coverage:** integration
- **Step ids:**
  - B01
  - B13
  - B14
- **Proof:** In the integrated release, two separately authenticated or explicitly authorized customer sessions open the same durable proposal, retain reviewer attribution and see each other's comments without copying browser storage.
- **Gap:** A local version URL does not carry the saved proposal to another browser. Shared backend persistence, invitation/access policy, reviewer identities and multiuser updates are not live. Seeded personas must not be portrayed as real remote collaborators.
- **Current status:** not-built

## 4.4.4 Present the deal's two or three alternative quotes together and help the customer choose.

- **Source ref:** Section 4.4.4 · C2 33:32–34:28
- **Source type:** Asked
- **Coverage:** main
- **Step ids:**
  - A21
  - A24
  - B14
- **Proof:** A single versioned proposal compares A's standard loading and B's assisted loading, lists the actual option differences, prices and constraints, and shows the B Rev 1 change without implying that the underlying R3200 has changed.
- **Gap:** Two alternatives are supported. The primary script does not validate a third quote or a different machine family; comparison copy must explain application tradeoffs rather than merely two prices.
- **Current status:** working-base

## 4.4.5 Embed PAC videos matched to the quoted machine and application to help the customer understand how it runs.

- **Source ref:** Section 4.4.5 · C2 30:40–31:09; 34:28–35:03
- **Source type:** Asked
- **Coverage:** main
- **Step ids:**
  - A02
  - A22
  - B14
- **Proof:** A22 opens a verified PAC video with a caption naming the demonstrated model, application and configuration. The presenter explains the relevant loading behavior. Playback has a controlled poster and fallback without hiding a configuration mismatch.
- **Gap:** Verified machine/application clips and their configuration mapping must be supplied or approved. A general PAC video or base-machine clip is not proof of the quoted custom guide or every selected option. This is a production hold until the intended claim is supported.
- **Current status:** external-input

## 4.4.6 Use images and videos that accurately match the exact quoted model and configuration.

- **Source ref:** Section 4.4.6 · C2 32:03–32:33
- **Source type:** Asked / Agreed
- **Coverage:** main
- **Step ids:**
  - A17
  - A22
  - B03
  - B10
  - B14
  - X-3D
- **Proof:** Each media asset identifies the model and options it supports. Review blocks a claim of exact configuration match when evidence is missing. A base-machine reference is labeled as such; B Rev 1 does not display a fabricated image of the proposed guide.
- **Gap:** Available photos and the reference 3D assembly do not prove every quoted configuration. PAC-specific CAD and verified custom-guide imagery are unconfirmed. Honest labels avoid deception but do not by themselves satisfy the full exact-configuration requirement.
- **Current status:** external-input

## 4.4.7 Bring relevant PAC videos, drawings, layouts and website material together in the proposal.

- **Source ref:** Section 4.4.7 · C2 31:39; 39:20
- **Source type:** Asked
- **Coverage:** partial
- **Step ids:**
  - A22
  - A23
  - B14
- **Proof:** The proposal has a concise resources area with actual approved files or links, readable titles, media purpose and version context. Each displayed resource opens the promised content.
- **Gap:** Current equipment references are a base. Verified videos, drawings, layouts and a versioned resource manifest are not complete. Do not fill empty resource slots with invented engineering documents.
- **Current status:** partial

## 4.4.8 Explain the understood need, machine behavior, application benefits and relevant examples so the customer selects the right solution.

- **Source ref:** Section 4.4.8 · C1 6:33–6:36; C2 34:54–35:15
- **Source type:** Asked
- **Coverage:** main
- **Step ids:**
  - A10
  - A21
  - A22
  - A24
  - B03
  - B04
  - B14
- **Proof:** The proposal begins with the customer's application and loading concern, explains standard versus assisted loading and the confirmed constraints, and later connects the proposed guide to the original question. Customer targets remain distinct from PAC performance commitments.
- **Gap:** The present scope and option summaries need a stronger application-led explanation and verified visual evidence. Unsupported throughput, fit, savings or operator-effort guarantees must not enter the script.
- **Current status:** partial

## 4.4.9 Attach cover pages, PDFs, drawings and layouts to the appropriate quote or proposal version.

- **Source ref:** Section 4.4.9 · C2 7:23–7:46; 39:20
- **Source type:** Asked
- **Coverage:** main
- **Step ids:**
  - A23
  - B14
  - B15
- **Proof:** A23 opens a PDF identified with V1, A Rev 0 and B Rev 0. V2 resources identify B Rev 1. Returning to V1 still opens its original document and resource list, with no silent replacement by the latest files.
- **Gap:** A version-bound attachment manifest and frozen hosted/exported files are not established. PAC drawings/layouts are pending inputs. The main pass must build the PDF/resource binding; absence of drawings must remain explicit.
- **Current status:** not-built

## 4.4.10 Keep PDF quote output available while allowing continued quote editing.

- **Source ref:** Section 4.4.10 · C2 7:31
- **Source type:** Agreed
- **Coverage:** main
- **Step ids:**
  - A23
  - B05
  - B09
  - B14
  - B15
- **Proof:** The customer can open or download a legible PDF for the published version. Sales can edit a new working revision and issue an updated PDF, while the prior issued document remains unchanged.
- **Gap:** Browser print and editable revisions exist. A consistently formatted, version-bound PDF artifact with stable resource handling still needs production work. Editing must create a revision rather than mutate an already issued publication.
- **Current status:** partial

## 4.4.11 Send a proposal link, collect the customer's signature and provide a payment link after signature.

- **Source ref:** Section 4.4.11 · C2 26:36–27:26; 28:23
- **Source type:** Agreed
- **Coverage:** design
- **Step ids:**
  - A20
  - B12
  - B13
  - X-CLOSE
- **Proof:** The optional close-stage design distinguishes presented, awaiting signature, signed, payment requested and paid states. Payment is unavailable before signature. The first-round main path ends with customer feedback and sales follow-up rather than simulating a real signature or charge.
- **Gap:** The user explicitly chose feedback and revision first, with signature/payment design only. Durable delivery, signing identity, service integration and payment processing are not implemented; a local publication link is not proof of email delivery.
- **Current status:** partial

## 4.5.1 Connect to PAC's CRM, tie customer and opportunity records together, and enforce deal first, then quote number.

- **Source ref:** Section 4.5.1 · C1 7:28; C2 4:38; 9:53–10:09
- **Source type:** Asked
- **Coverage:** integration
- **Step ids:**
  - A06
  - A07
  - A08
  - A11
- **Proof:** The integrated release retrieves or verifies a real CRM customer and opportunity before assigning an official quote number. The main local demonstration instead shows a prepared deal and explicitly labels any CRM reference as sample context.
- **Gap:** PAC's CRM identity, API, record ownership and quote-number policy are unconfirmed. A prepared deal is not a CRM connection, and the independent Website transition must not imply one.
- **Current status:** external-input

## 4.5.2 Track quote ownership, status, last contact and won/lost outcomes to reduce unobserved follow-up gaps.

- **Source ref:** Section 4.5.2 · C1 10:42–10:54; C2 9:28; 14:24
- **Source type:** Agreed (implied)
- **Coverage:** partial
- **Step ids:**
  - A07
  - B02
  - B13
  - B16
- **Proof:** The final sales view identifies the deal owner, current proposal version, latest recorded customer contact, open question status and dated next action. It does not label a sent reply as a won deal.
- **Gap:** Local Activity and follow-up provide a base. Reliable last-contact capture, a complete won/lost pipeline, CRM synchronization and organization-wide reporting remain outside the demonstrated loop.
- **Current status:** partial

## 4.5.3 Centralize quoting so every rep follows the same process.

- **Source ref:** Section 4.5.3 · C1 7:02; 7:47
- **Source type:** Asked
- **Coverage:** main
- **Step ids:**
  - A07
  - A10
  - A11
  - A16
  - A17
  - A20
  - B05
  - B09
  - B10
  - B12
  - B16
- **Proof:** Both stories follow the same scope, configuration, save, review, approval, publication and follow-up rules. Revisions cannot bypass required information or reuse stale approval.
- **Gap:** The local application demonstrates process consistency, not an organization-wide deployed service. Multi-rep accounts, shared persistence, administration and operational rollout are separate acceptance work.
- **Current status:** working-base

## 4.6.1 Provide login for PAC users.

- **Source ref:** Section 4.6.1 · C2 7:52
- **Source type:** Asked
- **Coverage:** integration
- **Step ids:**
  - X-ROLES
- **Proof:** Only authorized PAC users can access internal deal data; login, session expiry and logout behave correctly. Customer proposal access remains separately scoped.
- **Gap:** Current local workspace and customer-view separation are interface boundaries, not authenticated access. A demonstrator role selector must not be represented as real login.
- **Current status:** not-built

## 4.6.2 Support Google or Microsoft single sign-on.

- **Source ref:** Section 4.6.2 · C2 41:53–42:06
- **Source type:** Agreed
- **Coverage:** integration
- **Step ids:**
  - X-ROLES
- **Proof:** A user signs in through PAC's selected identity provider, receives the correct tenant and role, and loses access when the account is no longer authorized.
- **Gap:** The identity provider, tenant restrictions and role provisioning need PAC confirmation. No SSO integration is active in the local application.
- **Current status:** not-built

## 4.6.3 Let PAC provide feedback, request changes and add products directly or ask Annora to help.

- **Source ref:** Section 4.6.3 · C1 17:04
- **Source type:** Agreed (Patrick stated; Greg acknowledged)
- **Coverage:** appendix
- **Step ids:**
  - X-CATALOG
- **Proof:** A PAC administrator can submit a change request with context or add a draft product, see its review status and choose the agreed Annora support route. Internal product feedback is distinct from a customer's proposal question.
- **Gap:** Customer comments do not satisfy catalog administration or product feedback. Self-service product creation, administrative review and a defined Annora support workflow are not built.
- **Current status:** not-built

## 4.6.4 Deliver a useful base quickly, then build on it.

- **Source ref:** Section 4.6.4 · C2 38:27
- **Source type:** Asked
- **Coverage:** main
- **Step ids:**
  - A24
  - B16
- **Proof:** The demonstration completes one bounded R3200 sales loop and one feedback-to-revision loop. The accompanying scope distinguishes what works locally, what the proposed trial will validate, and what needs PAC input or a later integration.
- **Gap:** The current application is a usable local base. Trial scope, named owners, input readiness and acceptance remain to be confirmed; a scripted demo does not imply that all 41 requirements are production-complete or committed within two weeks.
- **Current status:** working-base

## Annora build direction from section 10

- **Source ref:** Section 10 · Patrick Byrne notes to Wes, 7 November 2026 [PB]
- **Not pacrequirements:** Yes
- **Items:**
  - **Id:** PB-10.1-configurator
  - **Direction:** Use the MPI build as a capability reference for the full configurator, not as a mandate to copy its visual design.
  - **Requirement ids:**
    - 4.2.1
    - 4.2.2
    - 4.2.3
    - 4.2.4
    - 4.2.5
    - 4.2.6
    - 4.2.7
    - 4.2.8
    - 4.2.9
    - 4.2.10
    - 4.2.11
    - 4.2.12
  - **Step ids:**
    - A11
    - A12
    - A13
    - A14
    - A15
    - B06
    - B08
    - X-CATALOG
    - X-SPECIAL
    - X-ROLES
  - **Remaining:** The main story is intentionally narrower than the full configurator requirement set. Optional catalogs, role policies and special-order behavior are not silently counted as delivered.
  - **Id:** PB-10.1-engineering
  - **Direction:** Allow an option to carry an engineering requirement with what and why, labor hours at one configurable rate, and material cost.
  - **Requirement ids:**
    - 4.2.2
    - 4.2.3
  - **Step ids:**
    - B06
    - B07
    - B08
    - B09
    - B10
    - B11
  - **Remaining:** Current engineering input is a direct customer amount. Cost build-up and separate customer-price review are new work. The example rate and costs are illustrative; applying engineering requirements to any arbitrary option remains beyond the single custom-guide demonstration.
  - **Id:** PB-10.1-approval
  - **Direction:** Provide review, approval and numbered revisions.
  - **Requirement ids:**
    - 4.3.1
    - 4.3.2
    - 4.3.3
    - 4.3.4
    - 4.3.5
    - 4.3.6
  - **Step ids:**
    - A16
    - A17
    - A18
    - A19
    - A20
    - B05
    - B07
    - B09
    - B10
    - B11
    - B12
    - X-ROLES
  - **Remaining:** A local approval engine is not an authenticated, emailed approval service. Reviewer roles and skip/override policies require PAC decisions.
  - **Id:** PB-10.1-proposal
  - **Direction:** Provide both a quote PDF and a presented multi-quote proposal with application benefits, customer comments and matching equipment videos.
  - **Requirement ids:**
    - 4.4.1
    - 4.4.2
    - 4.4.3
    - 4.4.4
    - 4.4.5
    - 4.4.6
    - 4.4.7
    - 4.4.8
    - 4.4.9
    - 4.4.10
  - **Step ids:**
    - A21
    - A22
    - A23
    - A24
    - B01
    - B13
    - B14
    - B15
  - **Remaining:** Machine/application walkthrough content is an Annora working assumption for meeting PAC's goal. Exact media, resources and version-bound PDFs require additional production and PAC validation. Mr Winter is a behavior reference for comments, not a visual template.
  - **Id:** PB-10.2-demo-sequence
  - **Direction:** Populate real sample quotes and specific-equipment proposals from PAC source materials.
  - **Requirement ids:**
    - 4.2.1
    - 4.4.5
    - 4.4.6
  - **Step ids:**
    - A11
    - A20
    - A21
    - A22
    - A23
    - A24
  - **Remaining:** The document's original proposal-first sequence has been superseded by the user's later acceptance of Patrick's forward flow. Do not restore it: Website → prepared sales deal → quote configuration → approval → publication → customer proposal.
  - **Id:** PB-10.3-commercial
  - **Direction:** Describe phased delivery and continuing support without treating historical fee examples as approved terms.
  - **Requirement ids:**
    - 4.6.4
  - **Step ids:**
  - **Remaining:** Commercial framing belongs in the pitch after the artifact walkthrough. Use the current user-approved two-week free trial followed by mutual confirmation before paid work. Prices, automatic renewal and lead-revenue percentages are not approved.
  - **Id:** PB-10.4-inputs
  - **Direction:** Confirm source templates and prices, equipment videos, labor rate and approver roles with PAC.
  - **Requirement ids:**
    - 4.2.1
    - 4.2.3
    - 4.2.5
    - 4.3.3
    - 4.4.5
    - 4.4.6
  - **Step ids:**
    - A11
    - A17
    - A22
    - B08
    - B10
  - **Remaining:** The existing dated price basis supports an illustrative demonstration, not current commercial validation. Unconfirmed role policy, base lead time and exact configuration media remain explicit dependencies.
