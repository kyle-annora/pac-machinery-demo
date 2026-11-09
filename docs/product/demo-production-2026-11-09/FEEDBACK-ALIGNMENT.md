# Patrick feedback alignment

**Feedback alignment for the approved guided screenplay.**

## Source register

### PB05 Patrick: Demo Flow and Visuals

- **Date:** 2026-11-05
- **Location:** Private source supplied by Kyle: Demo Flow and Visuals (1).md
- **Authority:** Patrick's recorded narrative and demo direction; later user decisions control conflicts.
- **Note:** Read the complete transcript. The transcript is a single paragraph at line 6, without per-statement timestamps. It describes the wider manufacturing-order context, five sales jobs, persuasive proposals, revisions, and a low-risk commercial decision. Its Website-to-Workspace integration and commercial brainstorming are historical proposals, not current implementation authority.

### PB08 Patrick: storyboard screen-recording feedback

- **Date:** 2026-11-08
- **Location:** tmp/pdfs/Screen Recording 2026-11-08 at 16.56.37.txt
- **Authority:** Patrick's later, specific corrections to the demo sequence and offer narrative.
- **Note:** Read the complete transcript. Locators below are text-file line numbers, not video timecodes. Patrick asks for a forward journey, visible customization and review, customer feedback and revision, a historical baseline, and ongoing value framed around outcomes.

### PB07 Patrick's build direction to Wes

- **Date:** 2026-11-07
- **Location:** Private source supplied by Kyle: PAC-Machinery-Sales-Workspace-Requirements.md, section 10
- **Authority:** Annora's proposed implementation approach, explicitly distinguished in the source from statements made by PAC.
- **Note:** Covers the MPI-style configurator, engineering requirements, quote approval and revision, quote PDF, multi-quote proposals, customer comments, matching videos, and build dependencies. The older Proposal-first presentation order and commercial phases are superseded where they conflict with current user decisions.

### PB-SLACK-AEO Patrick: AEO evidence, inquiry entry points, and proof-slide placement

- **Date:** Date not established in the supplied screenshot
- **Location:** User-supplied Patrick Slack screenshot; https://chatgpt.com/share/6af17b57-16e4-83eb-b11a-091a431935c6; presentation/2026-11-08/evidence/search-records.json
- **Authority:** Patrick's direction relayed by Kyle, with the shared conversation previously checked and recorded in the repository evidence register.
- **Note:** Patrick asks to link the conversation, explain a specific-product request and a requirements-based inquiry, and move delivered-customer results to just before the offer. The evidence register records that the new conversation already recommends PAC and that PAC has both general Request Quote and product-page Instant Quote forms. The improvement is richer context and easier next steps, not the invention of an absent form.

### PB-CASE-OUTCOMES Patrick: delivered customer outcomes

- **Date:** Date not established in the supplied message
- **Location:** Patrick feedback pasted by Kyle in the current conversation; existing pitch case-context records
- **Authority:** Customer outcomes reported by Patrick; not independently verified PAC forecasts.
- **Note:** MPI: enough order backlog to justify a new factory within nine months of the quoting system going live. Kannegiesser: $1m additional revenue, 5% AOV increase from quoting spare parts with machines, and complex quotes reduced from 40 hours to less than one hour. Mr Winter: doubled quote capacity with the same sales team, and quote plus approval drawing reduced from two hours to five minutes. Use precise attribution and context; do not imply the software alone caused every outcome or promise these results to PAC.

### REQ PAC Machinery Sales Workspace Requirements

- **Date:** Prepared 2026-11-04; updated 2026-11-07
- **Location:** Private source supplied by Kyle: PAC-Machinery-Sales-Workspace-Requirements.md
- **Authority:** Requirements summary prepared for Wes. Sections 1-9 capture PAC context and requests; section 10 records Annora build direction.
- **Note:** Use requirement identifiers for the detailed coverage matrix. PAC's priority is helping the existing sales process close more effectively. Templates, pricing, matching equipment videos, labor-rate assumptions, and approver roles require explicit source or confirmation. A planned script is not evidence that every requirement is already implemented.

### USER-INDEPENDENCE Current user decision: independent Website and Sales Workspace

- **Date:** Confirmed in the current conversation; rollback documented 2026-11-08
- **Location:** Current conversation; application/verification/rollback-2026-11-08/README.md
- **Authority:** Explicit user scope decision; overrides earlier inferred integration and Website-to-Deal handoff plans.
- **Note:** Website and Sales Workspace are separate artifacts. The presenter may tell a continuous customer story, but no automatic inquiry import, inbox bridge, or Deal creation is implied or restored. Use separate prepared fixtures and a visible presenter role transition. Preserve the working current experience rather than returning to superseded pages.

### USER-COMMERCIAL Current user decision: two-week free trial and mutual decision to continue

- **Date:** Confirmed in the current conversation
- **Location:** Current conversation: explicit selection and repetition of the two-week free-trial terms
- **Authority:** Explicit current commercial direction; overrides older fee, partner-percentage, and automatic-continuation ideas.
- **Note:** Two weeks are free. Paid service begins only after both sides confirm the subsequent scope and terms. Do not add automatic billing, an unapproved price, a guaranteed launch date, or a promise of particular sales results. The meeting should secure approval of the trial scope and participants, not fabricate a signed contract.

### USER-TWO-ACTS Current user decision: two preset linear walkthroughs, script before production

- **Date:** 2026-11-09
- **Location:** Current conversation: latest approved production-script request
- **Authority:** Immediate task definition and presentation constraints.
- **Note:** Prepare a production-ready step script with the page, preset action, state change, and English talk track for every step. Patrick should be able to complete either act by pressing Next. Keep both artifacts independent. Align each step with Patrick's feedback and PAC requirements, then confirm the script before changing artifacts. Screens and speaker notes remain in English.

## Feedback and production decisions

### P01 Explain the manufacturing-order context, then focus this demo on sales.

- **Source ids:**
  - PB05
  - PB08
  - REQ
- **Locator:** PB05: full narrative at transcript line 6; PB08: line 3; REQ: PAC objectives and section 10.1.
- **Implementation:** The pitch introduces the order context before opening the artifacts. Act A demonstrates a clear buying and quoting process; Act B demonstrates how sales handles a customer's question and a revision. Keep the spoken payoff about better customer decisions, quote accuracy, and follow-up rather than claiming an implemented manufacturing execution system.
- **Step ids:**
  - A01
  - A07
  - A24
  - B01
  - B16
- **Limits:** Factory capacity is business context. No downstream manufacturing system, additional lead volume, or PAC revenue improvement is represented as delivered by these two artifacts.

### P02 Organize the sales story around five jobs, rather than a vague three-step funnel.

- **Source ids:**
  - PB05
  - PB08
- **Locator:** PB05: five sales jobs in transcript line 6; PB08: line 5.
- **Implementation:** Map the jobs to observable moments: relevant discovery in the pitch's AI evidence; finding the right equipment in the Website; requirements capture; quote construction and proposal presentation; and customer feedback plus sales follow-up. Explain where closing fits without extending the first implementation into real signature or payment processing.
- **Step ids:**
  - A01
  - A02
  - A03
  - A04
  - A05
  - A10
  - A11
  - A20
  - A21
  - A24
  - B01
  - B16
  - H01
  - H02
  - H04
- **Limits:** The discovery evidence and eventual commercial closing are wider narrative context. The artifact script does not claim that the entire customer acquisition or payment process is implemented.

### P03 Use the actual AI-search conversation to show why discovery and useful inquiry capture belong together.

- **Source ids:**
  - PB08
  - PB-SLACK-AEO
  - REQ
- **Locator:** PB08: lines 7 and 9; PB-SLACK-AEO: request to add the shared conversation as a link; evidence/search-records.json: leadCaptureExample.
- **Implementation:** Keep the verified ChatGPT example and its source link in the pitch before Act A. Explain that the observed conversation already recommends PAC, then show a Website that makes the next buying step easier. State AEO work as improving useful product information and measuring discoverability. Transition explicitly from the medical/shrink search example to the separate illustrative Harbor Components/R3200 sales scenario.
- **Step ids:**
  - A01
  - A03
  - A04
  - A05
  - H01
  - H04
- **Limits:** One conversation is not an AI visibility audit or proof of conversion lift. Do not claim control over AI answers, guaranteed recommendations, verified medical suitability, or that the ChatGPT user's inquiry became the Harbor Deal. Do not replay a fabricated live AI answer.

### P04 Make both Website inquiry intents understandable: request a known product or describe the application and ask for help.

- **Source ids:**
  - PB05
  - PB08
  - PB-SLACK-AEO
  - USER-TWO-ACTS
- **Locator:** PB05: finding needs and capturing requirements; PB08: lines 11 and 13; PB-SLACK-AEO: specific-product request and requirements form.
- **Implementation:** The primary linear route follows the known R3200 product into a product-aware inquiry with preset contact and application details, a reviewable summary and a Website-only demo receipt. The alternate H01–H04 route captures the same contact and needs with no model selected. Preserve product/application context and the next questions on the receipt. Both paths capture locally; they do not claim delivery to PAC.
- **Step ids:**
  - A01
  - A03
  - A04
  - A05
  - H01
  - H02
  - H03
  - H04
- **Limits:** PAC already has Request Quote and Instant Quote forms. The demo proposes clearer contextual capture; it does not prove the current backend drops metadata or has no forms. A second entry does not require a second mandatory branch in Patrick's main Next-only route.

### P05 Follow the forward sales sequence; capture requirements before building and presenting the full proposal.

- **Source ids:**
  - PB08
  - PB07
  - USER-TWO-ACTS
- **Locator:** PB08: lines 11-19; PB07: section 10.2 contains the older Proposal-first order; current user chose Patrick's forward order.
- **Implementation:** Act A proceeds Website inquiry, sales-side requirement confirmation, A/B configuration, saving, review, approval, publication, and then the full Customer Proposal. An opening outcome preview may remain in the pitch, but the Proposal walkthrough happens only after publication in the scripted sequence.
- **Step ids:**
  - A03
  - A04
  - A10
  - A11
  - A16
  - A17
  - A18
  - A19
  - A20
  - A21
  - A24
  - H02
  - H04
- **Limits:** The original Proposal-first demo direction in Requirements section 10.2 is historical and superseded. A teaser must not imply a draft has already been issued.

### P06 Keep narrative continuity without connecting the two independent artifacts.

- **Source ids:**
  - PB05
  - USER-INDEPENDENCE
  - USER-TWO-ACTS
- **Locator:** PB05: original Website lead transfer idea; USER-INDEPENDENCE: explicit correction and rollback README.
- **Implementation:** After the Website-only demo receipt, a presenter transition names the role change. Next opens a separately prepared Sales Workspace Deal with a related illustrative brief. The submitted demo inquiry remains in its own Website store; the sales-side email is a prepared input that a rep reviews and confirms. No record is transferred.
- **Step ids:**
  - A05
  - A06
  - A07
  - A09
  - A10
  - H04
- **Limits:** No automatic import, synced inbox, generated Deal, or Website-to-Workspace identifier bridge. Similar customer names and shared narrative context do not constitute an integration. Customer Proposal belongs to the sales quote lifecycle and uses the approved customer-facing brand language.

### P07 Show useful product education and concrete A/B choices, not generic feature screens.

- **Source ids:**
  - PB08
  - PB07
  - REQ
- **Locator:** PB08: lines 9 and 13; PB07: sections 10.1-10.2; REQ: sections 4.2 and 4.4.
- **Implementation:** Use equipment imagery and application-specific media. Build Standard loading and Assisted loading as separate quotes for the same Deal. Show the Easy Load Bag Opener dependency and required Seal Flattener Fingers before saving. Demonstrate the customer-facing price visibility choice in context, then compare the correctly priced, approved options in the Proposal.
- **Step ids:**
  - A02
  - A11
  - A12
  - A13
  - A14
  - A15
  - A22
  - A24
- **Limits:** Only use verified configuration rules and sourced demo prices. The exact matching video, option compatibility, and final commercial terms require their own evidence; general machine footage must not be described as proof of the selected custom configuration.

### P08 Show custom work as an engineering requirement with explicit rationale and pricing inputs.

- **Source ids:**
  - PB08
  - PB07
  - REQ
- **Locator:** PB08: line 15; PB07: section 10.1, engineering requirements; REQ: 4.2.2-4.2.3 and section 10.4.
- **Implementation:** Act B turns the customer's application concern into an engineering requirement on the revision of Option B. The script first exposes a missing-input blocker, then enters the custom description and reason, labor hours, configurable assumed hourly rate, materials cost, and stated timing impact. Keep the estimate visible to reviewers before approving the revised quote.
- **Step ids:**
  - B05
  - B06
  - B07
  - B08
  - B09
  - B10
  - B11
- **Limits:** Use PAC's term engineering requirement. An assumed demo labor rate is not PAC's approved rate. An estimate or timeline impact does not establish engineering feasibility or a confirmed base lead time. Custom work cannot bypass review simply because the presenter presses Next.

### P09 Make review and approval happen before an offer is published.

- **Source ids:**
  - PB08
  - PB07
  - REQ
- **Locator:** PB08: line 15; PB07: section 10.1 quote review and approval; REQ: section 4.3.
- **Implementation:** Distinguish a saved working draft from an approved quote and a published Proposal snapshot. Show both A and B passing review before V1 publication. In Act B, only the revised B follows the review and approval path again before V2 publication. Surface validation failures and resolved state rather than silently forcing approval.
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
- **Limits:** Demonstration roles and approval rules are prepared fixtures until PAC confirms who may skip approval and who signs off custom pricing. The script must not conflate save, approve, publish, and customer acceptance.

### P10 Make the Proposal a persuasive customer conversation, supported by the quote document.

- **Source ids:**
  - PB05
  - PB07
  - REQ
- **Locator:** PB05: proposal should help sell the equipment; PB07: section 10.1 proposal/presentation layer and PDF; REQ: 4.4.1-4.4.10.
- **Implementation:** After publishing V1, open the customer's needs summary, explain the machine and its application, show matched equipment media, expose version-bound quote resources, and compare both approved choices. Separate buyer benefits from internal estimating and approval details. The rep's English talk track explains the recommendation and invites a question.
- **Step ids:**
  - A20
  - A21
  - A22
  - A23
  - A24
  - B01
- **Limits:** A PDF and a visual Proposal serve different jobs; neither substitutes for the other. No customer signature or payment service is implied by the first demo. Do not use internal notes, engineering assumptions, or invented performance results as confirmed customer-facing promises.

### P11 Show the customer's feedback producing an accountable revision and a clear response.

- **Source ids:**
  - PB08
  - PB07
  - REQ
- **Locator:** PB08: lines 17 and 19; PB07: section 10.1 customer notes/comments and quote revisions; REQ: sections 4.3-4.4.
- **Implementation:** Act B starts with a question attached to the published Option B. The sales Activity view preserves that context. A revision records the engineering requirement, review, approval, and V2 publication; a reply explains what changed and points the buyer to V2. Show the prior V1 separately and finish with a visible sales follow-up action.
- **Step ids:**
  - B01
  - B02
  - B05
  - B06
  - B09
  - B10
  - B11
  - B12
  - B13
  - B14
  - B15
  - B16
- **Limits:** Do not edit V1 in place, lose the question's option/version association, imply customer acceptance from an opened link, or pretend an email was delivered when only a local demo reply was recorded.

### P12 Use Explorer where it helps explain equipment or clarify a question; keep it subordinate to the sales task.

- **Source ids:**
  - PB05
  - PB08
  - USER-INDEPENDENCE
  - USER-TWO-ACTS
- **Locator:** PB05: visual product explanation and requirements capture; PB08: lines 9 and 13; current user direction on Explorer and independent artifacts.
- **Implementation:** Use the Website equipment view for discovery and the Sales Workspace photo Explorer to inspect the area named in the customer question. Capture an observation or finding in that sales context and carry it into the same Deal's revision discussion. Keep any 3D extension optional and explicitly dependent on a suitable, approved model.
- **Step ids:**
  - A02
  - B02
  - B03
  - B04
  - B05
  - B06
- **Limits:** A reference mechanism is not PAC R3200 CAD and cannot establish fit, clearances, operation, or engineering approval. The Website Explorer does not export data into the Sales Workspace. 3D is not a prerequisite for the linear demo or for the quote's commercial correctness.

### P13 Agree a useful baseline and inspect what actually slows down the sales process.

- **Source ids:**
  - PB08
  - REQ
  - USER-COMMERCIAL
- **Locator:** PB08: line 21; REQ: PAC sales objectives and current process.
- **Implementation:** Return to the deck after the artifact walkthroughs. Propose a baseline on agreed representative cases: time to prepare a quote/proposal, review and revision effort, missing-information loops, and the ability to follow up with the right customer context. Distinguish functional acceptance during the trial from longer-term close-rate or sales-cycle measurement.
- **Step ids:**
- **Limits:** Do not fabricate PAC baseline numbers, time a preset Next sequence and call it a measured productivity gain, or promise that two weeks establish statistically reliable revenue or win-rate impact.

### P14 Explain the ongoing service through continued operating value and improvement.

- **Source ids:**
  - PB08
  - PB07
  - USER-COMMERCIAL
- **Locator:** PB08: lines 23-29; PB07: historical section 10.3; USER-COMMERCIAL: current continuation terms.
- **Implementation:** In the deck return, explain the proposed continuing work: maintain the agreed deployed workflow and catalog/rules, support the sales team, add approved improvements, and review observed outcomes against the baseline. Relate these services to the configuration, review, customer feedback, and follow-up moments just demonstrated.
- **Step ids:**
- **Limits:** These are items to agree in the paid scope, not already contracted entitlements. Do not reuse an unapproved monthly amount, percentage-of-leads model, unlimited-change promise, or guaranteed revenue result from historical brainstorming.

### P15 Place delivered customer results immediately before the trial offer, after PAC has seen the relevant experience.

- **Source ids:**
  - PB-SLACK-AEO
  - PB-CASE-OUTCOMES
- **Locator:** Patrick's supplied Slack screenshot: move the delivered-results page much later, possibly just before the offer; Patrick's pasted MPI, Kannegiesser, and Mr Winter outcomes.
- **Implementation:** Return from Act B to the pitch's proof page, then introduce the two-week trial. Use the reported examples to establish relevant delivery experience: quote capacity, quote/drawing preparation time, spare-parts attachment, and order backlog. Keep the slide concise and place attribution/context in the speaker notes and supporting material.
- **Step ids:**
- **Limits:** These are Patrick-reported customer outcomes, not guaranteed PAC results or controlled causal studies. Keep the original quantities and conditions intact; do not compress Kannegiesser's revenue, AOV, and quote-time outcomes into a different combined claim.

### P16 Finish with a clear trial decision: what is delivered, how it is checked, and how paid continuation is agreed.

- **Source ids:**
  - PB05
  - PB08
  - PB07
  - USER-COMMERCIAL
- **Locator:** PB05: low-risk decision with decision makers present; PB08: lines 29-31; PB07: historical section 10.3; current user commercial decision.
- **Implementation:** The deck's closing sequence asks PAC to approve a bounded two-week free trial on mutually selected machines and cases, name participants/approvers, and schedule kickoff and review. Define acceptance as walking the agreed cases through configuration, review, publication, customer feedback, and revision with checked outputs and recorded issues. At review, agree whether to continue and confirm paid scope and terms before service becomes chargeable.
- **Step ids:**
- **Limits:** The final meeting sign-off concerns the Annora trial; it is not a customer acceptance button inside the PAC Proposal. No automatic billing, unspecified full-system delivery in two weeks, guaranteed launch, unapproved fee, or promise to reproduce other customers' commercial outcomes.

### P17 Make the two acts reliable for a presenter who only presses Next.

- **Source ids:**
  - USER-TWO-ACTS
  - USER-INDEPENDENCE
- **Locator:** Latest approved request: production-ready steps, preset actions and state changes, English talk tracks, independent artifacts, confirm script before production.
- **Implementation:** Specify deterministic fixtures and a named visible result for every step. Next performs the preset interaction and stops on the resulting page/state. A08, A12 and B07 complete when their expected validation block is visible; the following Next enters the defined resolution. Unexpected validation or loading failures stop advancement. Keep presenter notes separate from the audience screen, allow either act to start from its own known snapshot, and define reset/re-entry behavior.
- **Step ids:**
  - A01
  - A06
  - A08
  - A12
  - A16
  - A20
  - A24
  - B01
  - B07
  - B12
  - B16
  - H01
  - H04
- **Limits:** This deliverable defines the production script, not completed automation or already-implemented functionality. Do not modify either artifact before script confirmation. Preset narration and fixtures must not hide a broken rule, manufacture an external send, or make simulated state look like a live customer transaction. A demo receipt records local Website capture only, not external delivery.

### P18 Make data and asset readiness part of production acceptance.

- **Source ids:**
  - PB07
  - REQ
  - USER-TWO-ACTS
- **Locator:** PB07: section 10.4 dependencies; REQ: sections 7 and 9 plus individual configuration/proposal requirements.
- **Implementation:** Before building the scripted scenes, verify each quoted machine and option against the available templates/pricing; record any illustrative fixture explicitly. Confirm matching media, approver rules, labor-rate assumptions, and the boundaries of custom work. Keep a source register and a requirement-by-requirement coverage matrix alongside this feedback alignment so production can distinguish primary flow, optional branch, and deferred integration.
- **Step ids:**
  - A02
  - A11
  - A12
  - A13
  - A17
  - A22
  - A23
  - B06
  - B08
  - B10
- **Limits:** Availability of a public product image or a previous prototype is not evidence that pricing, compatibility, an engineering estimate, or an approval role is confirmed. Do not substitute historical visual output for the current design rules or claim all requirements are covered by the main two acts.
