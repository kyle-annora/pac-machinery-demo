# PAC two-act demo production script

**Draft for script approval. Script review only.**

One fictional Harbor sales story, two independently playable acts, and one Next control. This is a production specification and script review, not a functioning guided demo. Audience interfaces and spoken narration are English.

This document defines the future demonstration. Advancing the review reader changes the script card only; it does not run or approve any action in the Website or Sales Workspace.

## Agreed production boundaries

- Website and Sales Workspace remain independent artifacts. The demo host performs a narrative transition; it never transfers inquiry records, creates an Inbox or connects a CRM.
- Customer Proposal is the published customer projection of the Workspace, with PAC customer-facing branding. It is not a third independent quoting system.
- Keep the currently approved application direction and official PAC/Annora branding. Withdrawn Website/intake experiments are not visual or implementation baselines.
- The standard run uses the product-request Website path. Help me choose is a fixed alternate preset chosen before rehearsal, not an on-stage branch.
- Act A ends on the first customer comparison. Act B starts with a question, then investigation, engineering, revision, publication and follow-up.
- All new actions and pages described here are production targets. Reuse current business logic where valid, then verify it; do not treat the current screenshot gallery as a live runner.
- Trial terms remain two weeks free and paid service only after mutual agreement. The trial sign-off is a deck decision, not a simulated purchase of a PAC machine.
- Website inquiry capture is a real local demo save with an explicit demo receipt. It is independent of the prepared sales case and sends nothing externally.

## Scenario and fixed inputs

- **Customer:**
  - **Company:** Harbor Components
  - **Contact:** Alex Morgan
  - **Email:** alex@harbor.example
  - **Fictional:** Yes
- **Deal:**
  - **Id:** DEMO-HARBOR
  - **Opportunity reference:** DEMO-042
  - **Crm connection:** None; prepared reference only
  - **Owner:** PAC sales team · demo
- **Roles:**
  - **Buyer:** Alex Morgan · sample customer
  - **Sales:** PAC sales team · demo
  - **Engineering:** Engineering · demo role
  - **Reviewer:** Demo reviewer
- **Application:**
  - **Product:** Irregular hardware kits
  - **Loading:** Manual
  - **Material:** Polyethylene
  - **Bag dimensions at website:** Unknown
  - **Confirmed bag width inches:** 12
  - **Confirmed bag length inches:** 16
  - **Throughput target:** 20 bags/min — customer target, not equipment guarantee
  - **Fit:** Requires representative sample review by PAC
- **Commercial basis:**
  - **Currency:** USD
  - **Source basis date:** 2025-01-29
  - **Basis status:** Dated sample template prices; not a current PAC offer
  - **Base:** 27580
  - **Training:** 5480
  - **Opener:** 6035
  - **Fingers:** 1715
  - **Quantity:** 1
  - **Training pricing:** Once per quote, included in both quoted subtotals; separately priced, not zero or free
  - **Base lead weeks:** 6
  - **Base lead status:** Illustrative scenario input, not sourced PAC delivery information
  - **Freight tax terms:** Excluded from displayed equipment/service subtotals; subject to PAC confirmation; never silently zero or included
- **Engineering:**
  - **Labor hours:** 4
  - **Labor rate usd:** 100
  - **Materials usd:** 100
  - **Estimate usd:** 500
  - **Customer add on usd:** 500
  - **Additional lead weeks:** 1
  - **Status:** All numbers illustrative; customer price explicitly reviewed separately from estimate
  - **Scope:** Loading-guide design and fabrication allowance, with final geometry and application fit subject to PAC review of representative parts and bags
- **Version ledger:**
  - **State:** A11
  - **A:** Rev0 $33,060
  - **B:** Rev0 $33,060
  - **Publication:** None
  - **State:** A12
  - **A:** Rev0 $33,060
  - **B:** Rev0 $39,095; invalid missing fingers
  - **Publication:** None
  - **State:** A13–A19
  - **A:** Rev0 $33,060
  - **B:** Rev0 $40,810
  - **Publication:** None
  - **State:** A20–B04
  - **A:** Rev0 $33,060
  - **B:** Rev0 $40,810
  - **Publication:** V1; no guide; 6-week illustrative lead time
  - **State:** B05
  - **A:** Rev0 $33,060
  - **B:** Rev1 $40,810; new draft
  - **Publication:** V1 unchanged
  - **State:** B06–B07
  - **A:** Rev0 $33,060
  - **B:** Rev1 total Pending; $40,810 standard subtotal
  - **Publication:** V1 unchanged
  - **State:** B08–B11
  - **A:** Rev0 $33,060
  - **B:** Rev1 $41,310; 7-week illustrative lead time
  - **Publication:** V1 unchanged
  - **State:** B12 onward
  - **A:** Rev0 $33,060
  - **B:** Rev1 $41,310
  - **Publication:** V2 new; V1 remains A0/B0 with original values
- **Dates:**
  - **Base date:** 2026-11-09
  - **Follow up date:** 2026-11-12
  - **Meaning:** Fixed illustrative scenario dates; never presented as measured PAC process performance
- **Media:**
  - **Media-r3200-base:** Existing official base-machine photograph; model reference
  - **Media-r3200-load:** Existing official loading-area photograph; inspect coverage before production
  - **Media-opener:** Official option photograph; verify exact represented parts
  - **Media-fingers:** Approved matching option evidence required
  - **Video-r3200-operation:** Official source and short segment must be verified and locked before production
  - **Custom guide:** No approved geometry or drawing available; do not fabricate a depiction
  - **Reference3d:** Separate crank-slider capability example only
- **Records:**
  - **Website:** Independent Website-only inquiry draft, idempotent demo submission and receipt; never sent to the Workspace or an external service
  - **Workspace:** Prepared Deal, quotes, approval records, publications, comments, findings and follow-up in its own demo session
  - **Question:** C1 always refers to V1/B Rev0
  - **Finding:** F1 links to the actual PAC photo and C1; internal only
  - **Reply:** R1 answers C1 and links V2 without rewriting C1 context

## Playback contract

- **Control:** Patrick uses Next or Right Arrow. Start applies the first step; each subsequent Next enters the next defined step and performs only its declared action. Speaker notes are separate from product UI.
- **Standard modes:**
  - Full run: A01–A24 then B01–B16, then return to the deck before baseline/proof/trial.
  - Act A only: initialize A-start and stop at A24.
  - Act B only: initialize the exact published-v1 checkpoint, then start B01.
  - Help me choose preset: H01–H04 replaces A01–A05, then rejoins A06.
- **Expected blocks:** A08, A12 and B07 are successful demonstration checkpoints when their specific validation block is visible. Next then enters the scripted resolution. Unexpected errors halt advancement.
- **One press contract:**
  - Prepare the target page and role, apply the declared action once, verify postconditions, then enable Next.
  - A step must not bundle configuration, approval and publication into one hidden operation.
  - No live typing, searching, selecting a record, opening an OS file dialog or responding to a browser print dialog is required.
  - Repeated clicks while a step runs are ignored. Stable action keys prevent duplicate questions, findings, revisions, replies or publications.
  - Back or restart restores a demo-only checkpoint; it does not undo or overwrite the existing reviewed Harbor workspace.
  - Forward replay from a checkpoint reuses or deterministically reconstructs its records. No stale approvals may survive a material change.
  - All inquiry receipts are idempotent Website-only records. A visible Demo inquiry recorded / Saved in this demonstration label distinguishes local capture from delivery to PAC.
- **Session isolation:** Use separate, namespaced demo stores for Website and Workspace plus a host cursor. The host may select the prepared case; it must not import or synchronize Website business records. Leave pac-application-20261108-v1 and all reviewed records untouched. A Website-only demo submission is allowed; it creates a local receipt, not a sales-system record.
- **Checkpoint contract:**
  - A-start: new Website session; no Workspace session mutated.
  - website-inquiry-recorded / website-inquiry-help-recorded: independent local Website receipt, no Workspace session mutated.
  - sales-start: prepared Deal with missing dimensions; no quote/publication.
  - requirements-confirmed: 12×16 inches and source confirmation; no alternatives yet.
  - saved-v1-drafts: A0/B0 saved, not approved.
  - published-v1 / act-a-complete: exact V1 A0/B0, no guide, no C1.
  - customer-question: V1 plus C1, no revisions or findings.
  - b-revision-start: V1+C1+F1; B1 copied, no engineering scope.
  - b-revision-saved: B1 saved at $41,310; no B1 approval.
  - published-v2: V1+V2 with C1 still unanswered.
  - act-b-complete: R1 answered; follow-up owned; no acceptance/payment.
- **Refresh and recovery:** Refresh resumes the last committed step. Failed actions retain the prior checkpoint and offer Retry; no success message before persistence succeeds. A single writer owns the session; other tabs are read-only or explicitly refreshed.
- **Media behavior:** Preload approved media and preset views. Next never depends on a third-party player finishing. A failed video shows a labelled still/source fallback; WebGL failure uses actual PAC photos, never a screenshot described as live 3D.
- **Presentation modes:** Presenter view shows the spoken line, action and expected result. Audience view shows the product plus a quiet demo indicator; engineering instructions and coverage notes are not customer UI.
- **Side effects:** No email, CRM write, remote share invitation, signature, payment or production approval is performed. Demo role records are explicit and do not imply live authentication.
- **Deck placement:** Insert after the AI-search evidence. In a full run, skip duplicate static app screenshots and return before baseline, related customer results, trial acceptance and trial sign-off. A split run pauses on A24, introduces the customer question, then starts B01. Exact host routes are assigned only during approved production.
- **Audience copy:** Keep commercial uncertainty beside the relevant price, timing or application decision. Put implementation status, source limitations and rehearsal instructions in presenter/production notes rather than repeating them as large audience-facing warnings.
- **Chapter end:** Keep Next as the single advance control. A24 proceeds to B01 in Full run; in Act A only it returns to the preselected pitch continuation. B16 returns to the preselected baseline/proof/trial pitch continuation on the next press. Choose mode and return anchor before rehearsal; no on-stage menu or routing decision.
- **Deck return talk track:** You have seen the two sides of the sales experience. The trial is where we check this with PAC’s agreed machines, cases and team: validate the outputs, record the gaps, and compare the work with your baseline. We then review the results together before agreeing any paid continuation.

## A From inquiry to a clear proposal

Website context, an explicit presenter role transition, valid alternatives and a reviewed customer offer.

**Target time:** 309 seconds  
**Entry checkpoint:** A-start  
**Exit checkpoint:** act-a-complete

### A01 Begin with the buyer’s application

**Role:** Buyer · Alex Morgan  
**Page:** Website / Homepage / hardware-kit application  
**Target:** Homepage / hardware-kit application  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 18 seconds

**Preset action on entry**

Start the Website scene with the hardware-kit application in view. Show a clear product path and Help me choose as the alternate entry.

**Prepared input**

- **Company:** Harbor Components
- **Application:** Irregular hardware kits
- **Packaging:** Pre-opened polyethylene bags
- **Entry:** Request this product preset

**Before**

- Website demo session is new. Workspace session is not opened.

**After**

- Website view = application introduction. No inquiry or Deal has been created.

**Audience should see**

- PAC branding, a strong application headline and relevant equipment media.
- Two visible entrances: Request this product and Help me choose.

**Spoken script**

> From that search example, let’s move to a separate sales case: Harbor Components, packaging hardware kits. The buyer can request a product or ask PAC for help choosing.

**PAC requirements:** 

**Patrick feedback:** P01, P02, P03, P04, P17

**Checkpoint:** A-start

**Production notes**

- AI-search evidence remains in the deck immediately before this segment. Do not recreate a live AI answer or claim a search ranking.
- The actual PAC site already has quote-request forms; this scene demonstrates a proposed improvement.

### A02 Explain one equipment detail

**Role:** Buyer · Alex Morgan  
**Page:** Website / Rollbag R3200 / loading detail  
**Target:** Rollbag R3200 / loading detail  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 20 seconds

**Preset action on entry**

Open the R3200 product view and select Loading. Focus the approved PAC photograph and reveal its matching explanation.

**Prepared input**

- **Model:** Rollbag R3200
- **Topic:** Loading and bag opening
- **Media:** MEDIA-R3200-LOAD

**Before**

- The application page is visible. No commercial selection exists.

**After**

- The selected topic changes to loading. Product interest remains R3200; no priced option is selected.

**Audience should see**

- Left-side topic selection and right-side equipment focus change together.
- One concise explanation, approved PAC media and a contextual inquiry action.

**Spoken script**

> The equipment and explanation stay together. We can look at the loading process and ask a more specific question about the application.

**PAC requirements:** 4.4.5

**Patrick feedback:** P02, P07, P12, P18

**Production notes**

- Mainline uses real PAC media. No generic reference mechanism is presented as an R3200.
- Verified video is introduced later in A22. The optional reference-only 3D sequence is X-3D.

### A03 Keep the requested product visible

**Role:** Buyer · Alex Morgan  
**Page:** Website / Product inquiry / selected model  
**Target:** Product inquiry / selected model  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Open Request this product. Carry the selected model and visible reference into the Website inquiry draft.

**Prepared input**

- **Requested model:** Rollbag R3200
- **Reference topic:** Loading and bag opening

**Before**

- R3200 loading detail is selected.

**After**

- Website inquiry draft exists with requestedModel=R3200 and referenceTopic=loading. No Workspace record changes.

**Audience should see**

- Selected machine and equipment reference above a short application form.
- The request is product interest, not a confirmed fit or configured order.

**Spoken script**

> A buyer who knows the model should not have to describe it again. The request keeps the selected product visible while asking about the actual application.

**PAC requirements:** 

**Patrick feedback:** P02, P03, P04, P05

**Production notes**

- Use the approved Website brand system. Keep this form independent from Workspace storage.

### A04 Enter the prepared application request

**Role:** Buyer · Alex Morgan  
**Page:** Website / Product inquiry / application fields  
**Target:** Product inquiry / application fields  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 15 seconds

**Preset action on entry**

Fill the prepared sample request, including an explicit Not confirmed bag-size answer. Do not invent dimensions. Open the reviewable summary, including contact details, before submission.

**Prepared input**

- **Name:** Alex Morgan
- **Company:** Harbor Components
- **Email:** alex@harbor.example
- **Product:** Irregular hardware kits
- **Material:** Polyethylene
- **Loading:** Manual loading
- **Target:** 20 bags/min — customer target
- **Bag dimensions:** Not confirmed
- **Question:** Would assisted bag opening help our operators?

**Before**

- Product inquiry draft exists. Application fields are empty.

**After**

- Draft contains the sample contact, application and question. Bag dimensions remain unknown.
- The buyer-reviewable summary is ready; the inquiry has not been submitted yet.

**Audience should see**

- Useful application details without forcing a guessed answer.
- The requested throughput is labelled as the buyer’s target.
- Contact, product, application and open questions in one reviewable summary.

**Spoken script**

> We capture what the buyer knows and make the open questions easy to resolve. Their target is 20 bags per minute; the bag size still needs a conversation.

**PAC requirements:** 4.1.4

**Patrick feedback:** P02, P03, P04, P05

**Production notes**

- All details are fictional rehearsal inputs. The .example address must never be used for outbound delivery.

### A05 Record the inquiry with a clear next step

**Role:** Buyer · Alex Morgan  
**Page:** Website / Inquiry confirmation / demo receipt  
**Target:** Inquiry confirmation / demo receipt  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 15 seconds

**Preset action on entry**

Record the reviewed inquiry once in the isolated Website demo store. After successful persistence, show the receipt and next-step summary.

**Prepared input**

- **Summary:** R3200 interest; hardware kits; polyethylene; manual loading; target 20 bags/min; bag size to confirm; assisted-loading question
- **Action:** Record demo inquiry
- **Receipt title:** Demo inquiry recorded
- **Receipt detail:** Saved in this demonstration.
- **Status:** demo-submitted
- **Idempotency key:** website-inquiry-main

**Before**

- The buyer-reviewable summary contains Alex’s contact details, R3200 interest, application facts and open questions.
- No Website inquiry submission exists yet; the Workspace is untouched.

**After**

- Website inquiry status = demo-submitted, with contact and application context preserved.
- The record exists only in this Website demonstration. No email, CRM action, Workspace record or external send occurs.

**Audience should see**

- Demo inquiry recorded / Saved in this demonstration.
- The requested model, contact details, application and open questions remain visible.
- Next step: Discuss bag dimensions and application fit with PAC.

**Spoken script**

> A clear confirmation closes the inquiry. The product, application and open questions stay together, giving the next conversation a useful starting point.

**PAC requirements:** 

**Patrick feedback:** P02, P03, P04, P06

**Checkpoint:** website-inquiry-recorded

**Production notes**

- Use an idempotent local submission command, not a success toast shown before saving. Retry cannot create duplicates.
- The demonstration records the inquiry locally. It must not say Sent to PAC, Email delivered or Deal created.

### A06 Move to the prepared sales example

**Role:** Presenter  
**Page:** Demo host / Role transition / after a conversation with PAC  
**Target:** Role transition / after a conversation with PAC  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Show the role transition and load the separate prepared Workspace scenario. Do not read, import or link the Website inquiry record.

**Prepared input**

- **Transition copy:** After a conversation with PAC
- **Case:** Harbor Components · Rollbag R3200
- **Workspace seed:** Harbor sales case; prepared independently

**Before**

- The Website has recorded its own demo inquiry and shown a receipt. The Sales Workspace has no related imported record.

**After**

- Workspace opens a seeded Harbor Deal with a recorded conversation and bag dimensions still to confirm. Website data is unchanged.

**Audience should see**

- A short, explicit change from buyer exploration to PAC’s sales discussion.
- The same fictional business context, with independent records.

**Spoken script**

> Now we switch to the sales team, using a separately prepared example after a conversation with PAC. The two artifacts share this story, without an automatic inquiry transfer.

**PAC requirements:** 4.1.2, 4.5.1

**Patrick feedback:** P06, P17

**Checkpoint:** sales-start

**Production notes**

- Narrative continuity is authorized; Website-to-Deal integration is not.
- Do not say that the inquiry has just arrived in an Inbox.

### A07 Review the opportunity and written scope

**Role:** Sales · demo role  
**Page:** Sales Workspace / Deal overview / Harbor Components  
**Target:** Deal overview / Harbor Components  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 15 seconds

**Preset action on entry**

Open the Deal overview and show the written scope, owner, open requirement and next action.

**Prepared input**

- **Deal:** Harbor Components · R3200
- **Opportunity reference:** DEMO-042 · prepared CRM reference
- **Owner:** PAC sales team · demo
- **Scope:** Package irregular hardware kits in polyethylene bags using manual loading. Compare standard loading with assisted bag opening. Confirm bag dimensions before preparing options.
- **Target:** 20 bags/min — customer target

**Before**

- Prepared Deal exists. No numbered commercial quote or publication exists yet.

**After**

- The Deal is visible with a prepared opportunity reference and incomplete requirements. No CRM connection is asserted.

**Audience should see**

- One customer and opportunity with a clear scope.
- Bag dimensions to confirm; follow-up owner and status visible.

**Spoken script**

> The conversation becomes a written scope in one opportunity. We can see what the customer wants, who owns the next step and what is still needed before quoting.

**PAC requirements:** 4.1.1, 4.1.2, 4.1.3, 4.1.5, 4.5.1, 4.5.2, 4.5.3

**Patrick feedback:** P01, P06

**Production notes**

- DEMO-042 demonstrates the deal-before-quote rule; it is not a live CRM lookup.
- The current app starts with drafts. The new demo seed and required-information gate need deliberate implementation.

### A08 Show the required-information gate

**Role:** Sales · demo role  
**Page:** Sales Workspace / Requirements / quote creation blocked  
**Target:** Requirements / quote creation blocked  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Attempt to prepare the alternatives. Show the bag-dimensions requirement and keep the Deal as work in progress.

**Prepared input**

- **Attempt:** Prepare quote alternatives

**Before**

- Bag width and length are unknown. No commercial alternatives have been created.

**After**

- Quote preparation is blocked for missing bag dimensions. Nothing is published or approved.

**Audience should see**

- A specific explanation of what is missing and why it matters.
- A direct path to complete the requirement.

**Spoken script**

> The system asks for the information that affects the configuration. We can keep working on the opportunity without turning an unknown into an offer.

**PAC requirements:** 4.1.4, 4.2.8, 4.5.1

**Patrick feedback:** P17

**Production notes**

- This is an expected blocked state. Next may proceed to the scripted resolution only after the blocker is visibly confirmed.

### A09 Use a prepared customer clarification

**Role:** Sales · demo role  
**Page:** Sales Workspace / Requirements / customer clarification  
**Target:** Requirements / customer clarification  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 15 seconds

**Preset action on entry**

Show the prepared follow-up message and place 12 × 16 inches into a proposed requirements update awaiting sales confirmation.

**Prepared input**

- **Email text:** Hi PAC team — our pre-opened polyethylene bags are 12 inches wide by 16 inches long. We load the hardware kits by hand. We would like to evaluate assisted bag opening. Our target is 20 bags per minute. — Alex
- **Suggested width:** 12
- **Suggested length:** 16
- **Units:** inches

**Before**

- The missing-dimensions prompt is visible.

**After**

- Original message is visible. Suggested values are not yet confirmed scope.

**Audience should see**

- The source message beside proposed structured values.
- A clear confirmation step.

**Spoken script**

> The customer has clarified the bag size. Sales can review the message alongside the proposed values before confirming the application.

**PAC requirements:** 4.1.1, 4.1.2, 4.1.4, 4.1.5

**Patrick feedback:** P06

**Production notes**

- This is a prepared text-to-fields example, not a live AI extraction claim. Full conversational ingestion remains a separately tested capability.

### A10 Confirm the application facts

**Role:** Sales · demo role  
**Page:** Sales Workspace / Requirements / confirmed for quoting  
**Target:** Requirements / confirmed for quoting  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Confirm the prepared requirements and save the scope. Preserve the separate application-fit condition.

**Prepared input**

- **Width:** 12
- **Length:** 16
- **Units:** inches
- **Material:** Polyethylene
- **Loading:** Manual
- **Target:** 20 bags/min
- **Scope confirmation:** Sales confirmed the supplied application facts
- **Fit condition:** PAC must confirm application fit using representative bags and parts

**Before**

- Proposed bag dimensions are 12 × 16 inches.

**After**

- Required facts are complete for this sample quotation. No performance or fit approval is inferred.

**Audience should see**

- Confirmed 12 × 16-inch bags and buyer target.
- The remaining sample-fit condition is explicit.

**Spoken script**

> Sales confirms the application once, so every alternative starts from the same brief. A sample review remains a clear next step for confirming fit.

**PAC requirements:** 4.1.1, 4.1.2, 4.1.4, 4.1.5, 4.4.8, 4.5.3

**Patrick feedback:** P02, P05, P06

**Checkpoint:** requirements-confirmed

### A11 Create two alternatives in one Deal

**Role:** Sales · demo role  
**Page:** Sales Workspace / Quote builder / A and B drafts  
**Target:** Quote builder / A and B drafts  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 15 seconds

**Preset action on entry**

Create A Rev 0 and B Rev 0 from the dated sample basis. Show A first; both drafts initially contain the same base machine and service.

**Prepared input**

- **Quantity:** 1
- **A:** Standard loading
- **B:** Assisted loading
- **Starting lines:**
  - **R3200:** 27580
  - **On-site start-up & training:** 5480
- **Starting total each:** 33060
- **Base lead weeks:** 6

**Before**

- Prepared Deal reference and confirmed requirements are present.

**After**

- A0=$33,060 and B0=$33,060, draft and unapproved. Six-week planning lead time is explicitly illustrative.

**Audience should see**

- Two alternatives under the same Deal, sharing application facts.
- Training is a priced service included in each quoted subtotal, not free or part of the machine base price.

**Spoken script**

> Both alternatives use the same application. We start with the R3200 and training, then make the optional equipment—and its price—explicit.

**PAC requirements:** 4.1.1, 4.1.3, 4.1.4, 4.2.1, 4.2.2, 4.2.5, 4.2.6, 4.3.6, 4.5.1, 4.5.3

**Patrick feedback:** P02, P05, P07, P18

**Production notes**

- Price source: January 29, 2025 sample basis. Current PAC prices need confirmation.
- Six weeks is a scenario input, not sourced PAC delivery information. Display the demo basis with the lead time.

### A12 Select assisted opening and expose its dependency

**Role:** Sales · demo role  
**Page:** Sales Workspace / Quote builder / Option B dependency  
**Target:** Quote builder / Option B dependency  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Select Easy Load Bag Opener in B. Calculate the draft subtotal and expose the required companion option.

**Prepared input**

- **Option:** Easy Load Bag Opener
- **Amount:** 6035
- **Fingers selected:** No

**Before**

- B0 contains base and training only. A0 is unchanged.

**After**

- B draft subtotal=$39,095; fingers dependency unresolved. Approval is unavailable. A remains $33,060.

**Audience should see**

- Selected opener, its price and the requirement for Seal Flattener Fingers.
- Minimum bag width of 10 inches; the confirmed 12-inch bags satisfy that rule.

**Spoken script**

> Assisted opening is an explicit option. The configurator also shows the companion equipment and bag-width rule, so the quote cannot quietly omit a requirement.

**PAC requirements:** 4.2.1, 4.2.2, 4.2.5, 4.2.7, 4.2.8

**Patrick feedback:** P07, P17, P18

**Production notes**

- Do not silently auto-select a companion while narrating that the user made the choice.

### A13 Complete the valid assisted-loading option

**Role:** Sales · demo role  
**Page:** Sales Workspace / Quote builder / Option B complete  
**Target:** Quote builder / Option B complete  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Add Seal Flattener Fingers and re-evaluate the option dependency.

**Prepared input**

- **Option:** Seal Flattener Fingers
- **Amount:** 1715

**Before**

- B draft is missing fingers.

**After**

- B0 draft total=$40,810; A0=$33,060; difference=$7,750. Required companion rule passes.

**Audience should see**

- A complete assisted-loading option, its component prices and the A/B difference.

**Spoken script**

> The required fingers complete the assisted-loading option. Sales can now explain exactly which equipment accounts for the difference in price.

**PAC requirements:** 4.2.1, 4.2.5, 4.2.6, 4.2.7, 4.2.8

**Patrick feedback:** P07, P18

### A14 Discuss the configuration without prices

**Role:** Sales · presenting to customer  
**Page:** Sales Workspace / Quote builder / prices hidden  
**Target:** Quote builder / prices hidden  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Use the price visibility control to hide customer price figures in the presentation view.

**Prepared input**

- **Display prices:** No

**Before**

- A/B configuration is valid; prices are currently visible.

**After**

- Only the view preference changes. Configurations, saved data and totals are unchanged.

**Audience should see**

- The equipment and scope remain readable without price figures.
- No internal engineering costs appear in a customer-facing view.

**Spoken script**

> Sales can discuss the application and equipment first, then bring pricing into the conversation when it is useful.

**PAC requirements:** 4.2.11

**Patrick feedback:** P07

### A15 Bring the commercial comparison back

**Role:** Sales · demo role  
**Page:** Sales Workspace / Quote builder / prices visible  
**Target:** Quote builder / prices visible  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Restore price visibility and show the itemized A/B difference.

**Prepared input**

- **Display prices:** Yes

**Before**

- Prices are hidden; commercial values are unchanged.

**After**

- A0=$33,060 and B0=$40,810 are visible again. Both use the illustrative six-week base planning lead time.

**Audience should see**

- The same prices as before hiding, with no silent configuration changes.

**Spoken script**

> The figures return exactly as configured. We can explain the optional equipment while keeping the commercial comparison consistent.

**PAC requirements:** 4.2.5, 4.2.11

**Patrick feedback:** P07

### A16 Save the working alternatives

**Role:** Sales · demo role  
**Page:** Sales Workspace / Quote builder / saved drafts  
**Target:** Quote builder / saved drafts  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 8 seconds

**Preset action on entry**

Save both working alternatives and the confirmed scope. Wait for successful persistence before advancing.

**Prepared input**

- **A.customer note:** Standard hand loading for the current hardware-kit process.
- **B.customer note:** Assisted bag opening for evaluation with your actual bags and parts.

**Before**

- A0 and B0 contain unsaved prepared changes.

**After**

- Both drafts have saved snapshots of scope, options, totals, notes and price basis. Neither is approved or published.

**Audience should see**

- Saved state with separate approval status.
- A=$33,060 and B=$40,810 remain unchanged.

**Spoken script**

> Saving preserves the work. Review and publication remain separate decisions.

**PAC requirements:** 4.1.3, 4.2.1, 4.3.2, 4.5.3

**Patrick feedback:** P05, P09, P17

**Checkpoint:** saved-v1-drafts

**Production notes**

- One Next may invoke a defined Save all transaction, but it may not approve or publish as a side effect.

### A17 Review the offer against the application

**Role:** Reviewer · demo role  
**Page:** Sales Workspace / Review and approval / first offer  
**Target:** Review and approval / first offer  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 20 seconds

**Preset action on entry**

Open the review view in the prepared reviewer role and show the checks against the saved alternatives.

**Prepared input**

- **Actor:** Demo reviewer
- **Review items:**
  - Application facts
  - Option dependencies
  - Included scope and exclusions
  - Price basis
  - Illustrative lead time
  - Matching media
  - Customer-facing conditions

**Before**

- Both alternatives are saved and unapproved.

**After**

- Review targets the saved A0/B0 snapshots. Both remain unapproved until explicit decisions.

**Audience should see**

- Application beside commercial scope and unresolved conditions.
- The demo reviewer identity, checked revision and any blockers.

**Spoken script**

> The reviewer checks the offer against the application, not just the total. Scope, option rules, timing and customer-facing materials are reviewed together.

**PAC requirements:** 4.1.1, 4.2.8, 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.4.6, 4.5.3

**Patrick feedback:** P05, P09, P18

**Production notes**

- Role switching is a scripted demo context, not evidence that SSO or production authorization exists.
- The full approval policy is an input to confirm with PAC.

### A18 Approve the saved standard option

**Role:** Reviewer · demo role  
**Page:** Sales Workspace / Review and approval / Option A  
**Target:** Review and approval / Option A  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 5 seconds

**Preset action on entry**

Approve the exact saved A0 snapshot and record the demo actor and revision.

**Prepared input**

- **Approve:** A Rev 0
- **Actor:** Demo reviewer

**Before**

- A0 and B0 are saved; neither is approved.

**After**

- A0 approved; B0 still awaits approval. Publication remains blocked for B.

**Audience should see**

- A approval record and the separate pending B state.

**Spoken script**

> The approval belongs to this saved revision.

**PAC requirements:** 4.3.1, 4.3.2, 4.3.3, 4.3.4

**Patrick feedback:** P05, P09

### A19 Approve the saved assisted-loading option

**Role:** Reviewer · demo role  
**Page:** Sales Workspace / Review and approval / Option B  
**Target:** Review and approval / Option B  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 5 seconds

**Preset action on entry**

Approve the exact saved B0 snapshot after its dependency checks pass.

**Prepared input**

- **Approve:** B Rev 0
- **Actor:** Demo reviewer

**Before**

- A0 is approved; B0 is saved and unapproved.

**After**

- A0 and B0 approved. Both approval records match current saved content.

**Audience should see**

- Both approved alternatives, ready for publication.

**Spoken script**

> Both alternatives are now reviewed and ready to publish.

**PAC requirements:** 4.3.1, 4.3.2, 4.3.3, 4.3.4

**Patrick feedback:** P05, P09

### A20 Publish the first customer version

**Role:** Sales · demo role  
**Page:** Sales Workspace / Publication / Proposal V1  
**Target:** Publication / Proposal V1  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 8 seconds

**Preset action on entry**

Publish V1 from the approved snapshots. Freeze its customer projection and resource manifest.

**Prepared input**

- **Publication:** V1
- **Quotes:**
  - A Rev 0
  - B Rev 0
- **Totals:**
  - 33060
  - 40810

**Before**

- A0/B0 are saved and approved. No publication exists.

**After**

- Exactly one published version exists: V1 contains A0/B0, $33,060/$40,810, six-week illustrative lead time. No email is sent.

**Audience should see**

- Publication confirmation with exact quote revisions.
- Open customer Proposal action.

**Spoken script**

> Publication creates the customer version from the reviewed offer. Later work will not silently change what the customer sees here.

**PAC requirements:** 4.1.3, 4.3.1, 4.3.2, 4.3.6, 4.4.1, 4.4.11, 4.5.3

**Patrick feedback:** P02, P05, P09, P10, P17

**Checkpoint:** published-v1

**Production notes**

- A publication URL in the demo does not prove remote protected access.
- Resource content and metadata must be bound to this version, not read from mutable drafts.

### A21 Present what PAC understood

**Role:** Customer · Alex Morgan  
**Page:** Customer Proposal / Proposal V1 / your application  
**Target:** Proposal V1 / your application  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 20 seconds

**Preset action on entry**

Open the customer presentation at the application summary, with internal Workspace navigation removed.

**Prepared input**

- **View:** Your application
- **Summary:** Irregular hardware kits; manual loading; 12 × 16-inch polyethylene bags; target 20 bags/min

**Before**

- V1 is published and matches reviewed A0/B0.

**After**

- Customer reads the frozen V1 application and conditions. No configuration is editable from this view.

**Audience should see**

- What PAC understood, the operation being discussed and the sample-fit condition.
- A clear path through the proposal rather than only a total or model number.

**Spoken script**

> We begin with the customer’s application. The proposal explains what PAC understood and what still needs to be confirmed, before asking the buyer to compare options.

**PAC requirements:** 4.1.1, 4.1.2, 4.4.1, 4.4.4, 4.4.8

**Patrick feedback:** P02, P05, P10

### A22 Make the equipment understandable

**Role:** Customer · Alex Morgan  
**Page:** Customer Proposal / Proposal V1 / equipment and operation  
**Target:** Proposal V1 / equipment and operation  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 20 seconds

**Preset action on entry**

Open Equipment and play or show the preloaded approved operation segment. Pair option explanations only with media that actually depicts those options.

**Prepared input**

- **Base media:** MEDIA-R3200-BASE
- **Operation video:** VIDEO-R3200-OPERATION
- **Option media:**
  - MEDIA-OPENER
  - MEDIA-FINGERS
- **Clip:** One approved short segment; exact source and time range must be locked before production

**Before**

- V1 customer view is open. Its media manifest is fixed.

**After**

- Only the viewing state changes. V1 scope and prices remain frozen.

**Audience should see**

- Matching model and option media, clear captions and a concise application explanation.
- A paused labelled fallback if playback is unavailable.

**Spoken script**

> The customer can see the loading process and the components behind the assisted-opening option. The visuals give us something concrete to discuss alongside the quoted scope.

**PAC requirements:** 4.4.1, 4.4.5, 4.4.6, 4.4.7, 4.4.8

**Patrick feedback:** P07, P10, P18

**Production notes**

- MEDIA-GATE blocks production acceptance until source, model, configuration coverage and video segment are reviewed.
- Do not claim an exact installed B configuration from a generic base-machine video. Label model references and show verified option-specific evidence separately.
- Next must remain operable without autoplay, sound, third-party cookies or waiting for a whole external video.

### A23 Keep the documents with the version

**Role:** Customer · Alex Morgan  
**Page:** Customer Proposal / Proposal V1 / documents  
**Target:** Proposal V1 / documents  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Open Documents and show the version-bound quote PDF in an in-page viewer, with supporting sources alongside it.

**Prepared input**

- **Files:**
  - Quote V1.pdf
  - PAC R3200 product reference
  - Verified option references
- **Excluded:** No invented custom-guide drawing

**Before**

- V1 has a frozen resource manifest.

**After**

- V1 PDF and resource metadata point to A0/B0 and the same issued values. No browser print dialog or download is required.

**Audience should see**

- V1 identification, same prices and scope, and document provenance.
- Supporting files labelled by their real coverage.

**Spoken script**

> The customer still gets the quote document, with supporting material attached to the same version. The numbers and scope match the proposal they just reviewed.

**PAC requirements:** 4.4.1, 4.4.7, 4.4.9, 4.4.10

**Patrick feedback:** P10, P18

**Production notes**

- Persistent version-bound PDF output is a build target; the current browser Print action alone is not sufficient.
- Do not invent drawings or layouts that PAC has not supplied.

### A24 Compare the two loading choices

**Role:** Customer · Alex Morgan  
**Page:** Customer Proposal / Proposal V1 / compare options  
**Target:** Proposal V1 / compare options  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 20 seconds

**Preset action on entry**

Return to the comparison and reveal matching line items, included scope, exclusions and the question action.

**Prepared input**

- **A:** Standard loading · $33,060
- **B:** Assisted loading · $40,810
- **Difference:** 7750
- **Base lead weeks:** 6
- **Guide:** Not included in either V1 option

**Before**

- V1 application, equipment and documents have been presented.

**After**

- The first act ends on an understandable V1 offer. Guide scope is not included. No customer has accepted or bought an option.

**Audience should see**

- A/B differ only by the opener and fingers in this sample.
- Clear offer conditions and a contextual way to ask about Option B.

**Spoken script**

> Both choices address the same application: standard loading, or assisted opening. The scope and price difference are clear, so the buyer can ask about the option that matters to them.

**PAC requirements:** 4.1.3, 4.2.1, 4.2.6, 4.4.1, 4.4.4, 4.4.8, 4.6.4

**Patrick feedback:** P01, P02, P05, P07, P10, P17

**Checkpoint:** act-a-complete

**Production notes**

- This is the natural pause between acts. Full-run Next continues to B01; an A-only rehearsal stops here.

## B From customer feedback to a revised offer

A version-specific question becomes an explained, reviewed revision and an owned follow-up.

**Target time:** 208 seconds  
**Entry checkpoint:** published-v1  
**Exit checkpoint:** act-b-complete

### B01 Ask about the missing guide scope

**Role:** Customer · Alex Morgan  
**Page:** Customer Proposal / Proposal V1 / Option B question  
**Target:** Proposal V1 / Option B question  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 15 seconds

**Preset action on entry**

Post the prepared question once, attached to the displayed option, revision, version and equipment topic.

**Prepared input**

- **Author:** Alex Morgan · sample customer
- **Question:** Could you include a loading guide for our irregular hardware parts in Option B, and show the price and timing impact?
- **Context:**
  - **Proposal:** V1
  - **Quote:** B
  - **Revision:** 0
  - **Topic:** Loading area

**Before**

- V1 contains A0/B0. B0 does not include a loading guide.

**After**

- Question C1 exists on V1/B0 with status Awaiting sales. No quote, price or acceptance state changes.

**Audience should see**

- The exact question beside its V1/B0 context.
- No indication that asking is accepting the offer.

**Spoken script**

> The customer can ask about the specific option they reviewed. The question keeps its version and equipment context.

**PAC requirements:** 4.1.2, 4.4.2, 4.4.3

**Patrick feedback:** P01, P02, P10, P11, P17

**Checkpoint:** customer-question

**Production notes**

- A fresh B-only run restores the prepared V1 checkpoint, then performs this step; it does not depend on Kyle’s browser history.

### B02 Bring the question into sales follow-up

**Role:** Sales · demo role  
**Page:** Sales Workspace / Activity / question C1  
**Target:** Activity / question C1  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 12 seconds

**Preset action on entry**

Switch to Sales Activity and focus C1, its owner and the related published offer.

**Prepared input**

- **Owner:** PAC sales team · demo
- **Next action:** Assess loading-guide scope with engineering

**Before**

- C1 is attached to V1/B0 in the isolated Workspace demo session.

**After**

- Sales is viewing the question; its commercial context is unchanged. Follow-up is explicit.

**Audience should see**

- Customer question, exact version, owner and next action.

**Spoken script**

> Sales can pick up the question without guessing which document the customer meant. The next action is to assess the guide with engineering.

**PAC requirements:** 4.4.2, 4.5.2

**Patrick feedback:** P11, P12

### B03 Inspect the actual equipment reference

**Role:** Sales · demo role  
**Page:** Sales Workspace / Explorer / PAC loading photo  
**Target:** Explorer / PAC loading photo  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 15 seconds

**Preset action on entry**

Open the Deal’s Explorer and focus the approved PAC loading photograph at the preset position.

**Prepared input**

- **Mode:** PAC equipment photos
- **Media:** MEDIA-R3200-LOAD
- **Topic:** Loading and sealing area
- **Related quote:** B Rev 0

**Before**

- C1 is selected. No revision or engineering add-on exists.

**After**

- Explorer selection changes; commercial scope, price and V1 do not.

**Audience should see**

- The actual PAC photograph, the relevant detail and question context.
- The selected related quote is explicitly B0.

**Spoken script**

> The customer’s question sits beside the relevant loading detail. Sales and engineering have a shared reference for discussing the proposed guide.

**PAC requirements:** 4.4.6, 4.4.8

**Patrick feedback:** P12

**Production notes**

- Optional X-3D is a separate reference interaction, not evidence of guide fit. It is excluded from the standard mainline.

### B04 Save a finding with the Deal

**Role:** Sales · demo role  
**Page:** Sales Workspace / Explorer / saved finding  
**Target:** Explorer / saved finding  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 12 seconds

**Preset action on entry**

Save finding F1 once with its selected view and references.

**Prepared input**

- **Title:** Loading-guide scope
- **Note:** Customer requested a guide for irregular parts. Review representative bags and part samples before confirming guide geometry.
- **Links:**
  - C1
  - V1
  - B Rev 0
  - MEDIA-R3200-LOAD

**Before**

- PAC loading photo and B0 are selected.

**After**

- F1 is an internal Deal finding related to B0 and C1. No priced option or public content changes.

**Audience should see**

- Saved photo reference, note and quote link.
- The distinction between an investigation and a commercial decision.

**Spoken script**

> We keep the selected view and observation with the deal, ready for engineering review. That context stays available as the quote changes.

**PAC requirements:** 4.4.8

**Patrick feedback:** P12

**Production notes**

- Internal findings and draft engineering notes are excluded from the Customer Proposal.

### B05 Create a deliberate revision of Option B

**Role:** Sales · demo role  
**Page:** Sales Workspace / Quote builder / B Rev 1  
**Target:** Quote builder / B Rev 1  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Create B Rev 1 from the finding, copying the published B0 commercial scope into a new working revision.

**Prepared input**

- **Revise:** B
- **From revision:** 0
- **To revision:** 1
- **Source finding:** F1
- **Source question:** C1

**Before**

- B0 is published in V1; F1 and C1 exist. A0 is unchanged.

**After**

- B1 draft starts at $40,810 with no guide allowance. B1 is unapproved. A0 and frozen V1 remain intact.

**Audience should see**

- Explicit B Rev 1 label and links to its reason for change.
- A0 stays at its existing revision.

**Spoken script**

> Sales deliberately creates a revision of B. A and B are alternatives; this is a new revision of one alternative, while the original offer stays available.

**PAC requirements:** 4.2.2, 4.3.6, 4.4.10, 4.5.3

**Patrick feedback:** P08, P11, P12

**Checkpoint:** b-revision-start

### B06 Describe the engineering requirement

**Role:** Sales · demo role  
**Page:** Sales Workspace / Quote builder / engineering requirement pending  
**Target:** Quote builder / engineering requirement pending  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 15 seconds

**Preset action on entry**

Add the described engineering requirement and reason, leaving all unconfirmed commercial inputs blank.

**Prepared input**

- **Type:** Engineering requirement
- **Scope:** Loading-guide design and fabrication allowance for irregular hardware parts.
- **Reason:** Support repeatable manual positioning during loading. Final geometry requires PAC review of representative parts and bags.
- **Hours:** Not specified
- **Labor rate:** Not specified
- **Materials:** Not specified
- **Customer add on:** Not specified
- **Additional lead weeks:** Not specified

**Before**

- B1 is a working revision without custom scope.

**After**

- B1 engineering status=Awaiting engineering. Known standard subtotal remains $40,810; complete total and final timing are Pending.

**Audience should see**

- What is custom and why, plus unknown hours, materials, customer price and timing.
- Pending values are visibly different from zero.

**Spoken script**

> We describe the engineering requirement and why it matters to this application. The missing estimate and timing are visible, ready for engineering to complete.

**PAC requirements:** 4.2.2, 4.2.3, 4.2.7

**Patrick feedback:** P08, P11, P12, P18

### B07 Prove incomplete engineering blocks release

**Role:** Sales · demo role  
**Page:** Sales Workspace / Review / engineering blocker  
**Target:** Review / engineering blocker  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Save the incomplete draft if needed and attempt review. Show the exact missing engineering inputs; do not approve or publish.

**Prepared input**

- **Attempt:** Review for publication

**Before**

- B1 engineering inputs are pending.

**After**

- B1 remains unapproved and unpublishable. V1 still has the original B0 scope and $40,810 amount.

**Audience should see**

- A specific blocked state for incomplete engineering scope/price/timing.
- V1 is still available to the customer.

**Spoken script**

> The team can save unfinished work, but cannot publish it as a complete offer. The customer’s existing version is preserved.

**PAC requirements:** 4.2.2, 4.2.3, 4.2.5, 4.3.2

**Patrick feedback:** P08, P09, P17

**Production notes**

- An expected blocker completes this scripted step. Unexpected errors do not. Next then moves to the prepared engineering resolution.

### B08 Price and time the engineering allowance

**Role:** Engineering · demo role  
**Page:** Sales Workspace / Engineering requirement / prepared estimate  
**Target:** Engineering requirement / prepared estimate  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 20 seconds

**Preset action on entry**

Enter the prepared engineering inputs and calculate the estimate. Explicitly set a proposed customer add-on and timing impact for review.

**Prepared input**

- **Labor hours:** 4
- **Illustrative labor rate usd:** 100
- **Materials allowance usd:** 100
- **Estimate usd:** 500
- **Proposed customer add on usd:** 500
- **Additional lead weeks:** 1
- **Base lead weeks:** 6
- **Result lead weeks:** 7

**Before**

- B1 engineering commercial fields are pending.

**After**

- Engineering estimate=4×$100+$100=$500. Proposed B1 customer total=$41,310. Illustrative planning lead time=7 weeks. B1 remains unapproved.

**Audience should see**

- Calculation components, scope reason and one-week impact.
- A clear separation between engineering inputs and the customer-facing price decision.

**Spoken script**

> Engineering makes the allowance explicit: hours, rate and materials, with a timing impact. These are illustrative inputs; the proposed customer price still needs review.

**PAC requirements:** 4.2.3, 4.2.5, 4.2.7, 4.3.3

**Patrick feedback:** P08, P18

**Production notes**

- All engineering numbers and six-week base lead time are illustrative scenario inputs, not current PAC costs or commitments.
- Demo pricing policy proposes a $500 customer add-on for this $500 estimate. Do not infer PAC’s margin, rate or pricing rules.
- Do not describe this engineering item as a special-order catalog item; X-SPECIAL covers that separate rule.

### B09 Save the engineering resolution

**Role:** Engineering and sales · demo roles  
**Page:** Sales Workspace / Quote builder / B Rev 1 saved  
**Target:** Quote builder / B Rev 1 saved  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 8 seconds

**Preset action on entry**

Save B1’s scope, engineering estimate, proposed customer price, timing and customer-facing explanation.

**Prepared input**

- **Customer note:** Includes a $500 illustrative loading-guide engineering allowance. Final geometry and application fit require PAC review of representative parts and bags. Planning lead time: 7 weeks, illustrative.

**Before**

- B1 has complete prepared engineering inputs, proposed price and timing, but no current approval.

**After**

- B1 saved at $41,310 with seven-week illustrative lead time. Prior B0 approval does not approve B1.

**Audience should see**

- Saved revision, explicit engineering line and pending review.

**Spoken script**

> The engineering scope, price and timing are saved together. The change is now ready for a fresh review.

**PAC requirements:** 4.2.3, 4.3.2, 4.3.6, 4.4.10, 4.5.3

**Patrick feedback:** P08, P09, P11

**Checkpoint:** b-revision-saved

### B10 Review only what changed

**Role:** Reviewer · demo role  
**Page:** Sales Workspace / Review / B Rev 1 change summary  
**Target:** Review / B Rev 1 change summary  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 18 seconds

**Preset action on entry**

Open review against B0 and the confirmed application. Show the proposed changes, their reason and the exact saved B1 snapshot.

**Prepared input**

- **Changes:**
  - Guide engineering allowance added
  - Customer price +$500
  - Illustrative lead time +1 week
  - Updated customer note
- **Unchanged:**
  - A Rev 0
  - Base machine
  - Opener and fingers

**Before**

- B1 is saved and unapproved. A0 is still valid and unchanged.

**After**

- Review is focused on B1. No approval or publication happens yet.

**Audience should see**

- Old/new scope, amount and timing on shared baselines.
- A0 is unchanged; internal engineering detail is kept out of the customer projection.

**Spoken script**

> Review focuses on the change: the guide allowance, price, timing and explanation. The unchanged alternative does not need an unnecessary revision.

**PAC requirements:** 4.2.3, 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.4.6, 4.5.3

**Patrick feedback:** P08, P09, P11, P18

**Production notes**

- No unverified guide drawing is added. Describe the allowance and remaining geometry condition honestly.

### B11 Approve the revised option

**Role:** Reviewer · demo role  
**Page:** Sales Workspace / Review / B Rev 1 approved  
**Target:** Review / B Rev 1 approved  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 5 seconds

**Preset action on entry**

Approve the exact saved B1 snapshot, including its proposed customer price and timing.

**Prepared input**

- **Approve:** B Rev 1
- **Actor:** Demo reviewer

**Before**

- B1 review checks pass; A0’s saved approval remains valid.

**After**

- B1 approved; A0 remains approved/published at Rev0. Publication is now allowed.

**Audience should see**

- B1 approval record, actor and revision.

**Spoken script**

> The changed option is approved against its saved scope.

**PAC requirements:** 4.2.3, 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.3.6

**Patrick feedback:** P08, P09, P11

### B12 Publish the revised customer version

**Role:** Sales · demo role  
**Page:** Sales Workspace / Publication / Proposal V2  
**Target:** Publication / Proposal V2  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 8 seconds

**Preset action on entry**

Publish V2 once from A0/B1, freezing its customer projection and resource manifest.

**Prepared input**

- **Publication:** V2
- **Quotes:**
  - A Rev 0
  - B Rev 1
- **Totals:**
  - 33060
  - 41310
- **Lead weeks:**
  - **A:** 6
  - **B:** 7

**Before**

- A0 and B1 match their saved approvals. V1 exists and C1 remains unanswered.

**After**

- Exactly two publications exist. V2=$33,060/$41,310; V1 remains $33,060/$40,810. C1 is not automatically answered.

**Audience should see**

- New version and the exact included revisions.
- A clear separate action to respond to the customer.

**Spoken script**

> We publish V2 from the approved revision and keep V1 intact. Next, sales answers the original question and directs the customer to the revised offer.

**PAC requirements:** 4.1.3, 4.3.1, 4.3.2, 4.3.6, 4.4.11, 4.5.3

**Patrick feedback:** P09, P11, P17

**Checkpoint:** published-v2

### B13 Answer the original question

**Role:** Sales · demo role  
**Page:** Sales Workspace / Activity / reply to C1  
**Target:** Activity / reply to C1  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 15 seconds

**Preset action on entry**

Post the prepared reply once on C1 and link the new version. Keep the original question’s V1/B0 association.

**Prepared input**

- **Reply:** Proposal V2 adds a $500 illustrative loading-guide engineering allowance to Option B and shows a one-week planning impact. Final geometry and application fit need PAC review of your sample parts and bags. Please review V2 and confirm the sample-review step.
- **Link:** Proposal V2
- **Status:** Answered · awaiting customer

**Before**

- V2 is published. C1 remains attached to V1/B0.

**After**

- Reply R1 exists on C1. C1 is answered, not customer-resolved or accepted. Next responsibility is the customer/sample-review discussion.

**Audience should see**

- The answer and V2 link, with the original version context preserved.

**Spoken script**

> Sales explicitly answers the question and points to the new version. The original conversation stays attached to the offer that prompted it.

**PAC requirements:** 4.1.2, 4.4.2, 4.4.3, 4.4.11, 4.5.2

**Patrick feedback:** P11

**Production notes**

- No outgoing notification is claimed. A reply and a published version are separate state changes.

### B14 Show the customer the revised scope

**Role:** Customer · Alex Morgan  
**Page:** Customer Proposal / Proposal V2 / revised Option B  
**Target:** Proposal V2 / revised Option B  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 18 seconds

**Preset action on entry**

Open V2 with the changed scope, price, planning timing and reply context visible.

**Prepared input**

- **A:** 33060
- **B:** 41310
- **Aversus bdifference:** 8250
- **Bchange from v1:** 500
- **Blead weeks:** 7
- **Alead weeks:** 6

**Before**

- V2 contains A0/B1 and the version-bound customer resources.

**After**

- Customer sees V2’s frozen content, not a live working draft. Internal estimate inputs and findings are excluded.

**Audience should see**

- B changed by $500 from V1; A/B now differ by $8,250.
- The guide allowance and remaining sample-fit condition are clear.

**Spoken script**

> The buyer sees what changed and why. B includes the engineering allowance and revised planning timing, while A remains the same.

**PAC requirements:** 4.1.3, 4.2.5, 4.4.1, 4.4.2, 4.4.3, 4.4.4, 4.4.5, 4.4.6, 4.4.7, 4.4.8, 4.4.9, 4.4.10

**Patrick feedback:** P11

**Production notes**

- Customer output shows the approved engineering line, not internal labor/material details or internal findings.

### B15 Prove the earlier offer is still intact

**Role:** Customer · Alex Morgan  
**Page:** Customer Proposal / Previous versions / Proposal V1  
**Target:** Previous versions / Proposal V1  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 12 seconds

**Preset action on entry**

Open V1 from the version history and show its original values and resources.

**Prepared input**

- **Open:** V1
- **Expect a:** 33060
- **Expect b:** 40810
- **Expect brevision:** 0
- **Expect guide:** Not included
- **Expect lead weeks:** 6

**Before**

- V1 and V2 exist; C1/R1 retain original context.

**After**

- V1 is still A0/B0 at $33,060/$40,810, with no guide allowance and six-week illustrative lead time. V2 is unchanged.

**Audience should see**

- Original scope, price and version-bound PDF remain intact.
- The original question and response keep their context.

**Spoken script**

> The earlier offer has not been overwritten. Sales and the customer can explain the history without reconstructing old files.

**PAC requirements:** 4.3.6, 4.4.2, 4.4.9, 4.4.10

**Patrick feedback:** P11

### B16 Finish with an owned next action

**Role:** Sales · demo role  
**Page:** Sales Workspace / Deal overview / follow-up  
**Target:** Deal overview / follow-up  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 15 seconds

**Preset action on entry**

Return to the Deal and save the prepared owner, waiting-on status and next action. Show the latest recorded contact from reply R1.

**Prepared input**

- **Stage:** Awaiting customer
- **Owner:** PAC sales team · demo
- **Next action:** Confirm representative sample parts and bags for the guide review.
- **Follow up date:** 2026-11-12 · illustrative demo date
- **Waiting on:** Customer sample-review confirmation
- **Last contact:**
  - **Date:** 2026-11-09 · illustrative demo date
  - **Channel:** Proposal reply
  - **Record:** R1 on C1
  - **Delivery:** Recorded within the demo; no email-delivery claim

**Before**

- V2 is published and C1 has a reply; the buyer has not accepted an offer.

**After**

- The Deal has an explicit next step. No won status, signature or payment is recorded.
- Latest recorded contact is derived from R1; it is not a manually invented email event.

**Audience should see**

- Published V2, the answered question, latest contact (Proposal reply · Nov 9), an owner and a dated follow-up.
- A clear business conclusion to the demonstration.

**Spoken script**

> The team can see the current offer, last contact and owned next step together. We would evaluate this process with PAC using agreed cases and its own baseline.

**PAC requirements:** 4.5.2, 4.5.3, 4.6.4

**Patrick feedback:** P01, P02, P11, P17

**Checkpoint:** act-b-complete

**Production notes**

- Return to the deck before baseline, customer proof, trial acceptance and the trial sign-off. Do not repeat the entire static screenshot sequence.
- Preset dates and event timing are rehearsal data, not measured PAC cycle times.

## Optional presets and supplementary demonstrations

### H Help me choose Website preset

Choose before rehearsal. Replaces the standard Website entry; returns to A06 without selecting a model on the buyer’s behalf.

### H01 Start without a chosen model

**Role:** Buyer · Alex Morgan  
**Page:** Website / Homepage / Help me choose  
**Target:** Homepage / Help me choose  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Open Help me choose instead of the product-request preset.

**Prepared input**

- **Entry:** Help me choose
- **Requested model:** Not specified

**Before**

- A fresh independent Website demo session is open.

**After**

- No model is selected. The buyer starts with their application.

**Audience should see**

- Application-led questions, with no forced machine selection.

**Spoken script**

> Some buyers know the application but not the model. They should be able to begin without guessing.

**PAC requirements:** 

**Patrick feedback:** P02, P03, P04, P17

### H02 Describe the application in plain language

**Role:** Buyer · Alex Morgan  
**Page:** Website / Guided application request  
**Target:** Guided application request  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 15 seconds

**Preset action on entry**

Fill the prepared contact details and application answers; retain Not sure for machine preference.

**Prepared input**

- **Product:** Irregular hardware kits
- **Packaging:** Polyethylene bags
- **Loading:** Manual
- **Target:** 20 bags/min
- **Bag dimensions:** Not confirmed
- **Machine preference:** Not sure
- **Name:** Alex Morgan
- **Company:** Harbor Components
- **Email:** alex@harbor.example

**Before**

- No model is selected.

**After**

- Application needs are recorded; requestedModel remains null.
- Buyer contact and company are recorded in the independent Website draft.

**Audience should see**

- Short, relevant questions and an explicit unsure answer.
- Alex Morgan · Harbor Components · alex@harbor.example, ready for buyer review.

**Spoken script**

> The request starts with the product and process. It does not require the buyer to know PAC’s catalog.

**PAC requirements:** 

**Patrick feedback:** P02, P04, P05

### H03 Keep uncertainty visible

**Role:** Buyer · Alex Morgan  
**Page:** Website / Guided request / questions for PAC  
**Target:** Guided request / questions for PAC  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Show the unanswered items and capture the prepared question without selecting a model automatically. Open the buyer-reviewable summary with contact details.

**Prepared input**

- **Question:** Which bagging setup should we evaluate for our operators?
- **Unknowns:**
  - Model selection
  - Bag dimensions
  - Application fit

**Before**

- Application answers are prepared; model and dimensions are unknown.

**After**

- Unknowns remain explicit. No product recommendation is approved.
- The summary is ready to submit locally; no receipt exists yet.

**Audience should see**

- Known needs and open questions, with no fabricated certainty.

**Spoken script**

> The summary gives PAC a useful brief and makes the remaining questions easy to discuss.

**PAC requirements:** 

**Patrick feedback:** P04

### H04 Record the application-led inquiry

**Role:** Buyer · Alex Morgan  
**Page:** Website / Inquiry confirmation / no selected model  
**Target:** Inquiry confirmation / no selected model  
**Current readiness:** Production target; not a claim that this scripted interaction is implemented  
**Suggested pace:** 10 seconds

**Preset action on entry**

Record the reviewed inquiry once in the isolated Website store and show the demo receipt. The next step rejoins A06.

**Prepared input**

- **Requested model:** Not specified
- **Next:** Sales conversation
- **Action:** Record demo inquiry
- **Receipt title:** Demo inquiry recorded
- **Receipt detail:** Saved in this demonstration.
- **Status:** demo-submitted
- **Idempotency key:** website-inquiry-help

**Before**

- Application brief is complete enough to discuss; model is unselected.

**After**

- Website inquiry is demo-submitted and preserves model=unselected plus buyer contact and application details.
- A06 subsequently loads the separate prepared sales case after a conversation; no inferred recommendation, import or external send occurs.

**Audience should see**

- Demo inquiry recorded / Saved in this demonstration.
- Contact, application needs and open questions remain reviewable; no machine has been selected for the buyer.

**Spoken script**

> Both entry paths produce a useful conversation starter. PAC can then discuss the application and decide what equipment to evaluate.

**PAC requirements:** 

**Patrick feedback:** P02, P03, P04, P05, P06, P17

**Checkpoint:** website-inquiry-help-recorded

**Production notes**

- This replaces A01–A05 when selected before the rehearsal. Do not run both forms in the standard mainline.
- Use the same idempotent, Website-only submission behavior as A05. Show the receipt only after saving succeeds.

### X-3D Reference-only 3D interaction

Optional 30-second capability insert after B03. Select a prepared component, show an exploded pose, capture and restore it, then return to the real PAC photo before B04.

- **Contract:**
  - **Before:** B03 is complete; commercial state unchanged
  - **Preset:** Crank-slider reference; Slider carriage; approved camera and pose
  - **Action:** Select → explode → capture → restore using successive Next beats
  - **After:** Only a separate reference-view record exists; no commercial finding or quote price changes
  - **Spoken:** This reference assembly shows how a particular view can stay with a question. We would use an approved PAC model before making claims about this machine’s geometry.
  - **Boundary:** Not PAC equipment or PAC CAD. Never use this capture to justify the loading-guide design or price.
  - **Return to:** B04

### X-CATALOG PAC catalog maintenance

Separate optional demonstration: draft annual/item price and lead-time changes, add a sample product, edit an option rule, review and activate; show old issued versions unchanged. Also expose a catalog feedback/change request and the Annora assistance route. Not part of the mainline or current implemented capability.

- **Contract:**
  - **Requirements:**
    - 4.2.9
    - 4.2.10
    - 4.6.3
  - **Required proof:** PAC-owned product, price, lead-time and rule edits have review, effective version and a visible effect on new quotes; historical publications remain frozen. A catalog feedback/change request has an owner and next step; the Annora assistance route is explicit without pretending a support message was sent.
  - **Dependency:** Approved maintenance policy and catalog data model.

### X-SPECIAL Special orders and additional equipment

Separate optional segment: select an explicitly illustrative special-order catalog item, expose its price/lead-time effect and exclusions. Demonstrate shipping, spare-parts and included/add-on semantics using scoped sample data.

- **Contract:**
  - **Requirements:**
    - 4.2.2
    - 4.2.4
    - 4.2.6
    - 4.2.7
  - **Required proof:** Special order is distinct from engineering work; lead-time composition follows an agreed rule. Unknown freight or tax is not zero.
  - **Dependency:** PAC-approved classification, lead-time policy and source items; do not invent an available PAC option.

### X-ROLES Approval policy and price overrides

Separate optional segment: a restricted role attempts a price override, the correct reviewer receives it and a saved change invalidates the relevant approval. The demo policy is labelled and does not claim deployed identity controls.

- **Contract:**
  - **Requirements:**
    - 4.2.12
    - 4.3.3
    - 4.3.4
    - 4.3.5
    - 4.6.1
    - 4.6.2
  - **Required proof:** Role, request, exact changed revision and review record are visible.
  - **Dependency:** PAC confirms approvers, bypass rights and pricing ownership. Live SSO and email remain separate integrations.

### X-CLOSE Signature and payment design

Design-only closing states: customer review → signature requested → signed → payment requested → paid, with failure and cancellation states. No real signature, charge or order is executed in the artifact rehearsal.

- **Contract:**
  - **Requirements:**
    - 4.4.11
  - **Required proof:** A customer question, preference or viewing event never becomes acceptance; payment follows valid signing under an explicitly scoped service.
  - **Dependency:** Real providers, terms, role permissions and service integration require their own implementation and acceptance.

## Production gates

- **Id:** SCRIPT-GATE
- **Title:** Approve the two-act script
- **Criterion:** Kyle confirms the mainline, alternate preset, fixed business data and boundaries before artifact production begins.
- **Id:** MEDIA-GATE
- **Title:** Verify model and configuration media
- **Criterion:** Record each exact file, official source, model/option coverage, usage basis, selected video range and fallback. No incorrect equipment imagery, invented guide geometry or generic CAD substitute. Missing matching evidence remains an open acceptance item.
- **Id:** COMMERCIAL-GATE
- **Title:** Keep sample inputs distinct from PAC facts
- **Criterion:** Dated 2025 prices, illustrative six-week base lead time and $500/+1-week engineering scenario are labelled consistently across builder, review, web proposal and PDF. Replace only with PAC-confirmed inputs when supplied.
- **Id:** DOMAIN-GATE
- **Title:** Complete the required business behaviors
- **Criterion:** Required-information gate; engineering hours/rate/materials; clear pending state; reviewer/revision attribution; immutable publications/resources; contextual replies; explicit next action. Do not force every requirement into the mainline or label partial coverage complete.
- **Id:** VISUAL-GATE
- **Title:** Finish every visible page and state
- **Criterion:** Homepage, product detail, inquiry and summary; Deal, requirements, builder, validation states, engineering, review, publication; customer application, media, comparison, documents, questions and history. Approved PAC brand family, aligned typography, exact media and stable loading/error/focus states throughout.
- **Id:** RUNNER-GATE
- **Title:** Make the sequence deterministic
- **Criterion:** Fresh browser, full run, each act independently, alternate Website preset, repeated Next, back/replay, refresh, media failure and paused exploration all reach the documented state without touching reviewed records.
- **Id:** RELEASE-GATE
- **Title:** Accept the delivered demonstration honestly
- **Criterion:** Record which behaviors are real local operations, prepared demo states, design-only future states and live services. Verify the actual sharing environment and data availability before calling a link a remotely usable app.

## Acceptance checks

- A fresh browser can complete the full standard run with Next only; no manual field entry or hidden setup is required.
- Act A and Act B each start from their documented checkpoint and produce the same meaningful result as the combined run.
- Website and Workspace remain independent; no inquiry IDs or records cross their business-state boundary.
- Both Website entry presets preserve contact, application and selected-or-unknown product context in one idempotent local demo receipt; the receipt never claims an external send.
- Every quoted amount and revision in the version ledger matches builder, review, Proposal and its version-bound PDF.
- Unknown required facts and engineering values create the documented blocked state; they are not substituted with zero or a guessed fact.
- A material quote change invalidates relevant approval; unchanged A0 remains intact when only B is revised.
- Publishing V2 does not alter V1, answer C1, mark the Deal won or initiate an external action.
- Customer views exclude internal costs, estimates, private findings, approval controls and draft information.
- Every image and video matches its declared model/option scope; absent approved CAD never becomes a geometric claim.
- Each visible page, modal, validation message, saved state and media fallback passes visual review at the agreed presentation size and a narrow viewport.
- Pause, retry, refresh and repeated Next cannot create duplicate publications, comments or revisions or overwrite the reviewed workspace.
- The spoken English explains the actual visible state, uses no unsupported conversion/revenue claims and fits the rehearsal timing.

## Related documents

- [Requirements coverage](REQUIREMENTS-COVERAGE.md)
- [Patrick feedback alignment](FEEDBACK-ALIGNMENT.md)
- [Interactive script reader](index.html)
- [Canonical script data](script.json)
