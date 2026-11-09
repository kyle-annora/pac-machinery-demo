# PAC demo — two presenter paths

Prepared November 8, 2026, against the retained `application/` after the Website-to-Deal experiment was withdrawn. Audience copy and spoken lines below are English. Suggested elapsed times are rehearsal targets, not timestamps from Patrick's recording.

These are two practical demonstrations assembled from current capabilities. Patrick did **not** prescribe exactly these two paths. They implement his priorities: explain the application, configure accurately, review before publishing, present the offer, and handle questions without losing history.

## The boundary to preserve

Website and Sales Workspace are independent artifacts. Website education belongs in the pitch prelude; the current Website rebuild is not ready to demonstrate. The withdrawn `site/` and intake experiment must not return through screenshots, links, narration or a staging shortcut. The old `website/` is not the visual baseline for the new work.

Customer Proposal is the customer-facing output of the Sales Workspace, not a third independent product. Explorer in the Workspace records internal findings for the same Harbor Deal. It does not import Website inquiries, select paid options automatically or publish internal findings to the customer.

**Prelude, approximately 90 seconds:** show the new shared conversation, explain the two Website entry paths and their review summary, then deliberately switch to the existing Harbor sales example. These are the Website’s two buyer paths; they are distinct from the two working sales demonstrations below.

1. **AI search:** open [Patrick’s shared conversation](https://chatgpt.com/share/6af17b57-16e4-83eb-b11a-091a431935c6) or its preserved capture. Point to PAC Machinery / Clamco in the shortlist. The later submitted requirements are shrink, medical and manual. Do not change the embedded form or imply its displayed defaults reproduce that request.
2. **Known product:** explain **Request this product**. Keep the requested model visible, ask the application questions that matter, and let the buyer review the request.
3. **Needs help:** explain **Help me choose**. Begin with the process and packaging requirements, allow “not sure,” and review both known facts and open questions before an inquiry.
4. **Inquiry summary:** show the proposed summary, not a submitted customer record. PAC confirms suitability; an AI recommendation is not that confirmation.

Say: “PAC already appears in this answer. The next opportunity is to make the buyer’s next step clearer: request a specific product, or explain the application and ask for help choosing. Both paths should preserve what the buyer knows and make the open questions visible.”

Say: “That medical shrink-packaging example explains the Website opportunity. For the working sales demonstration, we will now switch to a separate illustrative case: Harbor Components and the Rollbag R3200.”

PAC already provides a general Request a Quote page and a Dempack H30 Instant Quote form. Do not say it has no forms. The proposed improvement is explicit product context, guided requirements and a useful review summary; we have not verified the current form’s backend handling.

Do not say “This inquiry has just arrived in the workspace.” There is no active inquiry Inbox or Website-to-Deal handoff. Neither artifact is changed by this pitch update.

## Before the meeting

1. Open the released deck and its demo links once before the call. Use the deployment's actual application entry; do not assume local browser records travel with a shared URL. For local rehearsal, use the already-running complete workspace preview. If it is not running, serve the complete repository root with `python3 -m http.server 4363 --bind 127.0.0.1` and open `application/#deal` on the server address shown. Do not change the origin if you intend to use the reviewed records. The gallery's local launcher works only with this complete workspace and its local server. A pitch-only source package does not contain or run the application.
2. Keep one origin and browser profile for the demonstration. Records are browser-local. A new browser starts with Harbor's draft A/B alternatives and no published proposals; an existing profile may already contain later versions.
3. In the reviewed browser, use **Workspace details → Export workspace backup** before rehearsing. This is an export, not a tested one-click recovery mechanism: there is no import UI. Preserve the reviewed profile and its original Harbor records.
4. For an end-to-end rehearsal from initial drafts, use a separate browser profile at the same application URL. Do not clear, replace or reset the reviewed profile. A separate profile demonstrates the same application with isolated browser storage; it is not a second Deal in one shared database.
5. Use one application tab for mutations. Navigate between the workspace and customer view, or reload the other tab when prompted about an external change. Two tabs editing stale state can cause a conflict.
6. Check the version numbers actually present. In the previously reviewed profile, V1/V2/V3 survived rollback; V3 contained A Rev 0 at $33,060 and B Rev 2 at $41,310. Do not promise these records on another machine or origin. Refer to “the previous version” and “the new version” unless you have just verified their numbers.
7. Preload Explorer before presenting. If the 3D renderer is unavailable, use the PAC equipment photographs and explain the reference-view interaction from the recorded evidence. Do not substitute a static image while claiming the viewer is interactive.
8. Keep these records visible for checking: January 29, 2025 sample price basis; initial A $33,060; initial B $40,810; opener requires fingers and bags at least 10 inches wide. PAC still needs to confirm application suitability, current prices, lead time and commercial terms.

## Path A — Prepare an offer the buyer can understand

**Approximately 4–5 minutes.** Requirements → A/B configuration → save → review and publish → customer comparison → contextual question.

Start in the isolated rehearsal profile for the clean first-publication story. When using a profile with existing publications, inspect the saved requirements and use **Create revision** before editing a published alternative. Preserve old versions. A customer-facing change is required to publish another version; merely saving an identical revision does not create a new offer.

### A1. Confirm the application — 0:00–0:40

- **Open:** Deal overview, then **Requirements** (`#deal` → `#requirements`).
- **Do:** Show Harbor Components, the owner and next action. Review 12 × 16-inch polyethylene bags and the customer's target of 20 bags/min. The initial sample already contains these requirements; this is a review, not a simulated website import.
- **Observe:** Both alternatives use the same application requirements. The target is explicitly a customer requirement, not guaranteed machine performance.
- **Say:** “We start with the customer's process and the facts that change the quote. Both alternatives use the same application, so we can compare the loading approach fairly.”

### A2. Explain the alternatives — 0:40–1:40

- **Open:** **Quotes**, Option A and Option B (`#builder/a`, `#builder/b`).
- **Do:** Show A with the R3200 and training. Show B with the same base, training, Easy Load Bag Opener and Seal Flattener Fingers. Use the actual machine and bag-opening photographs to explain the difference. In a fresh profile, add a concise customer-facing note to each option and choose **Save changes**.
- **Suggested notes:** A: “Standard hand loading for the current hardware-kit process.” B: “Assisted bag opening for evaluation with your actual bags and parts.”
- **Observe:** A starts at $33,060; B starts at $40,810. B's additional standard equipment is $7,750. These are dated sample amounts, not a current PAC offer. The photo is a model or option reference, not a rendered exact configuration.
- **Say:** “The machine is the same. We are making the loading choice visible, including the equipment and price behind it.”

### A3. Show the accuracy check — 1:40–2:10

- **Do:** Point to the opener's minimum bag width and fingers dependency. If demonstrating a blocker, remove fingers from the working B quote, save, and open **Review & publish**. Show the blocked approval, then restore fingers, save and reopen review. Skip this detour if it interrupts the conversation.
- **Observe:** An incomplete configuration can be saved as work in progress, but cannot be approved. Restoring the required option resolves the specific blocker. Browsing media never changes options.
- **Say:** “A draft can preserve unfinished work. The approval check prevents that unfinished configuration from becoming the customer offer.”

### A4. Review and publish — 2:10–2:50

- **Do:** Choose **Review & publish**. Use **Save option A/B** if needed, then **Approve option A** and **Approve option B**, followed by **Publish proposal**.
- **Observe:** Publication locks the reviewed scope and amounts into a customer version. The quote and its revision remain identifiable. Approval is recorded locally for the demo; there is no authenticated PAC reviewer or outgoing email.
- **Say:** “The customer sees the reviewed version. A later change creates a revision rather than silently changing the offer they already received.”

### A5. Present the offer — 2:50–4:00

- **Open:** **Published proposals → Open proposal** or the current customer view. Never hardcode V3 on a fresh profile.
- **Do:** Compare the two alternatives, open **View line items**, and show the equipment detail. Explain the included scope, difference and outstanding application confirmation. The customer view has its own PAC presentation, without internal workspace navigation.
- **Observe:** The published amounts and revision references match the review. Equipment details support the conversation; they do not guarantee fit or performance.
- **Say:** “Now we can walk the buyer through the decision, not just send a total. They can see what changes, what is included and what still needs confirmation.”

### A6. Leave a useful customer question — 4:00–4:30

- **Do:** Select **Loading area**, then **Ask about this detail**. Keep Option B selected, enter `Alex Morgan`, and submit: “Can you clarify whether a loading guide is included in Option B, and what would change if we need one?”
- **Observe:** The question identifies the displayed proposal version, Option B, its quote revision and the loading-area topic. It appears in **Activity** in this browser. No email is sent.
- **Say:** “The question stays with the exact offer and equipment detail the customer reviewed. Sales does not have to reconstruct which document they meant.”

**Return to the deck:** this demonstrates the configured and published offer. The next path shows what happens when the team needs to investigate and revise it.

## Path B — Turn a discovery into a controlled revision

**Approximately 4–5 minutes.** Explorer → saved Deal finding → explicit quote revision → save and reapprove → new publication → customer reply and preserved history.

Run after Path A so the current quote is published and a customer question exists. It also works against an existing reviewed publication. Record the starting proposal version and B revision before the first action.

### B1. Investigate the equipment detail — 0:00–0:50

- **Open:** **Explorer** (`#explorer`) inside the same Harbor Deal.
- **Do:** Use **PAC equipment photos → Loading & sealing area**. Select related quote B. Enter title `Loading-guide scope` and note: “Clarify whether a loading guide is included and review the customer's actual bag and part samples before confirming a custom guide.” Choose **Save to deal**.
- **Observe:** The saved finding carries the Deal, selected quote revision, actual photo reference and note. It is internal discovery. The quote's price and selected options have not changed.
- **Say:** “We can keep the equipment reference and the application question together, with the sales opportunity that needs the answer.”

### B2. Show 3D as a bounded capability — 0:50–1:30

- **Do:** Switch to **3D reference**, select **Slider carriage**, choose **Explode**, then **Capture current view**. Give it a separate title such as `Reference-view interaction` and note: “Interaction demonstration only; not a PAC loading-clearance assessment.” Choose **Save to deal**, then **Restore view** on that finding.
- **Observe:** Selection and pose can be captured and restored. The assembly is explicitly labeled **Not PAC equipment or PAC CAD**. It cannot validate the R3200's dimensions, movement, clearance or proposed custom guide.
- **Say:** “This reference assembly demonstrates how a specific view can stay with a question. We would need an approved PAC model before using 3D to explain this machine's geometry.”
- **Keep the transition clear:** return to the actual PAC photo finding for the commercial revision. Do not use the generic assembly as evidence that a PAC modification fits.

### B3. Create the revision deliberately — 1:30–2:00

- **Do:** On the PAC photo finding choose **Create quote revision**. If B is already a working revision, the action is **Link to working quote** instead.
- **Observe:** The application opens B in its explicit quote context. Creating a revision retains the existing options and amount. The finding does not silently add engineering scope or change the price.
- **Say:** “Investigation and commercial scope are separate decisions. Sales chooses when a finding should become a quote revision.”

### B4. Record and review the resolution — 2:00–3:00

- **Recommended short path:** clarify the customer-facing note: “PAC will review the actual bags and sample parts with Harbor before finalizing the loading guide scope.” Preserve the existing commercial configuration and its included/excluded status. The reviewed Harbor B already contains an illustrative guide allowance; the note must not contradict its line items. Choose **Save changes**, then **Review & publish**, approve changed B and **Publish proposal**. An unchanged approved/published A does not need a gratuitous revision.
- **Optional engineering branch, fresh rehearsal profile only:** use **Add engineering requirement** and leave price/timing blank. Save and show that review blocks approval. Resolve the scope and enter an explicitly illustrative $500 allowance and one additional week before approval. These values are test inputs, not PAC-confirmed engineering pricing or delivery. Initial B would become $41,310. Do not run this addition against the reviewed quote that already contains the allowance.
- **Observe:** Unknown engineering price/timing cannot become a zero-cost commitment. Edits require fresh approval; the new customer version reflects the changed scope or note. A clarification-only revision may have the same total.
- **Say:** “If the change affects the offer, we make it explicit and review it again. If we do not yet know the price or timing, the system keeps that uncertainty visible.”

### B5. Close the communication loop — 3:00–4:00

- **Open:** **Activity** (`#activity`), find the question from Path A, choose **Reply**, and post a reply referring to the actual new version: “The revised proposal clarifies the loading-guide scope. Please review the new version; the earlier offer and your original question remain available.” Add the actual scope/price/timing change if using the engineering branch.
- **Observe:** Publishing did not automatically reply to or resolve the customer's question. The reply stays with its original version/option/revision. The separate **Revise option B** action is an alternative way to start a customer-requested revision; do not click it after this path already created and published a revision unless another change is intended.
- **Say:** “Publishing a new offer does not finish the conversation. Sales still answers the customer's question and makes the next decision clear.”

### B6. Prove the history survived — 4:00–4:40

- **Open:** **Published proposals** (`#proposals`), inspect the previous and new versions, then open the new Customer Proposal. Return to **Overview** to set the owner/next action if useful.
- **Observe:** Previous prices, scope and questions remain on the previous version. The new version carries the new quote revision. Internal Explorer findings are not exposed in the customer Proposal.
- **Say:** “We can improve the offer without losing what the customer previously saw. The team has a clear next action, and the customer has a clear version to review.”

## What to prove, and what not to imply

The current working proof is the Harbor Deal: shared requirements, A/B configuration, saved quotes, local approval, frozen customer versions, contextual questions/replies, explicit revisions, and Deal-local Explorer findings. Customer Proposal uses real PAC reference photographs; the 3D viewer demonstrates a separately labeled reference assembly.

The demo does not establish live Website intake, CRM synchronization, delivered email, remote protected customer access, production role permissions, signing, payment, win/loss analytics or a live catalog. Browser Print/PDF is available, but a hosted immutable PDF attachment service has not been demonstrated. The customer-only route removes internal navigation; it is not authentication. Shared static application URLs do not carry a presenter's local records to Patrick or a customer.

## Proof before the offer

After the baseline discussion, show **We have delivered this before** (`02-proof`) immediately before **Two weeks. Defined work you can evaluate** (`12-trial`). This is proof before Annora’s service offer to PAC, not a reason to move the customer Proposal earlier in the sales demonstration.

Say: “We have delivered related quoting systems for MPI, Kannegiesser and Mr Winter. These are customer outcomes reported by Patrick, not a forecast for PAC. We propose a bounded trial so your team can evaluate the work against its own cases.”

Use the preserved case context for details. Do not turn MPI’s order backlog into a claim that a factory was completed within nine months, or generalize a spare-parts quoting metric to every complex quote.

## Trial and continuation close — approximately 60 seconds

Say: “We propose two weeks at no fee, focused on the agreed PAC machines and a small set of sales cases. We agree the inputs, owners and review date at kickoff. Your team then runs the cases: prepare a standard offer, identify an incomplete engineering requirement, and handle a customer-requested revision. We check the outputs, record the time and open issues, and decide what is ready to use.”

Say: “Continued work keeps the system useful as prices, options and customer requirements change. Support, maintenance and agreed improvements are tied to the bottlenecks we observe. We confirm the scope, fees and support together before paid work starts. There are no automatic charges.”

The two-week review evaluates agreed outputs and cases; it does not guarantee production launch, revenue improvement or AI rankings. The AEO / inquiry work remains a scoped evaluation pack: buyer-question baseline, linked observations, priorities, one application-page draft showing both entry paths and the review summary, and a measurement plan. Review product context, known requirements and visible unknowns. A working production form, backend connection or site launch is not included by implication. Do not turn Patrick's exploratory same-day price examples into an agreed PAC fee.

## Obtain the trial decision — final scene

Leave **Let’s put this to work for PAC** visible. The whole closing frame is shown immediately; there is no process animation to finish or approval button to click.

- Confirm the scope: agreed machines, sales cases and deliverables from the trial pages.
- Name one PAC lead and the people who will review the work.
- Set the kickoff and joint review dates. Finalize the written brief and inputs before work begins.

Ask: **“Can we agree to proceed with the two-week free trial?”** Then pause and let PAC answer.

If they agree, restate and record the scope, owner, dates and any conditions. If they are not ready, establish the remaining decision and its owner. Do not equate interest or scheduling with approval. This sign-off covers the free evaluation; paid work still requires mutual agreement on scope, fees and support. No approval is collected by the presentation itself.

## Why this follows Patrick's feedback

Source locations are provided for internal editing. Neither transcript contains per-sentence timecodes; do not invent recording timestamps.

- **November 5 — `Demo Flow and Visuals (1).md`, line 6:** “present that proposal” and “make it real” explain why Path A spends time on customer understanding after configuration. “different revs” and “double pathways” support a separate revision path; they do not specify a two-flow navigation architecture. “shift away from website… sales workspace” describes the pitch transition. The user's subsequent independent-artifact decision controls the current implementation boundary.
- **November 8 — `Screen Recording 2026-11-08 at 16.56.37.txt`, lines 5–13:** five sales jobs; AI-led buyer question; education through product demo/video; Website followed by requirements capture rather than an immediate complete Proposal. The edited storyboard's final `const copy` block repeats “Educate the customer” and changes scene 6 to “Capture their requirements.” This is the reason to preserve a short Website prelude and a forward configuration/publication sequence.
- **November 8 recording, lines 15–19:** customizations, review before the offer goes out, feedback and revision. These are demonstrated by configuration rules, the optional engineering blocker, explicit publication, question context and retained versions.
- **November 8 recording, lines 21–25:** examine what adds time to a deal; continued service should focus on results. Time the rehearsal and later trial cases; do not present a fabricated dashboard or claim measured business improvement from the demo.
- **November 8 recording, lines 27–31:** commercial options and payment only if valuable; kickoff, feedback and testing. The user's later agreed terms are two weeks free, then paid work only after both parties confirm. No automatic billing and no invented final fee.
- **Latest Patrick feedback:** move customer results immediately before the Annora trial offer; add the new ChatGPT conversation as a link; explain specific-product and requirements-led inquiry paths. Treat AEO plus useful lead capture as a value hypothesis to measure, not a promised sales increase.
- **Current implementation:** `application/README.md`, lines 3–7, 25–38 and 40–74; `application/verification/deal-integration/README.md`, lines 13–20; `application/verification/rollback-2026-11-08/README.md`, lines 3–13. These distinguish retained working behavior from withdrawn intake work and from future scope.

Source register:

- Patrick's November 5, 2026 narrative: *Demo Flow and Visuals (1).md*, line 6. Private original; not included in the published package.
- Patrick's November 8, 2026 recorded feedback: *Screen Recording 2026-11-08 at 16.56.37.txt*, lines 5–31 as referenced above. Private original; not included in the published package.
- Patrick's November 8, 2026 edited storyboard: *pac-storyboard-edited.html*, final `const copy` block. Private original; not included in the published package.
- Current application contract: `application/README.md`, November 8, 2026, lines 3–7, 25–38 and 40–74. Available in the complete workspace repository, not the pitch-only package.
- Observed Deal/Proposal/Explorer walkthrough: `application/verification/deal-integration/README.md`, November 8, 2026, lines 13–20. Available in the complete workspace repository.
- Rollback boundary and retained records: `application/verification/rollback-2026-11-08/README.md`, November 8, 2026, lines 3–13. Available in the complete workspace repository.
- New shared discovery / product-selection evidence: [Packaging Equipment Search](https://chatgpt.com/share/6af17b57-16e4-83eb-b11a-091a431935c6). The saved prompt and shortlist are source observations, not application approval.
