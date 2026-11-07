# PAC Monday demo — proposal first

Use the public demo's [Customer proposal](https://kyle-annora.github.io/pac-machinery-demo/#present/deal-pac-demo) entry point. Keep the same Northstar Components deal throughout. All sample customer details are fictional. The pricing catalog is PAC-supplied; engineering estimates and approval roles are demonstration assumptions.

The core walkthrough targets 11 minutes 45 seconds with the sample preloaded. Leave discussion time afterward. Start with A Standard loading at **$33,060** and B Assisted loading at **$40,810**, both issued Rev 0 snapshots.

## Opening — 45 seconds

“Today we will show the customer conversation first, then the workspace that makes it possible. The goal is a consistent way to understand the application, compare suitable configurations, obtain the right review, and agree what happens next.”

## 1. Present the proposal — 0:45 to 3:15

The customer proposal has the quote document on the left and **Your feedback** on the right, without the workspace sidebar. Use **A · Rev 0**, **B · Rev 0** and **Compare** to show each issued quote and the comparison table. Explain the recorded application, 12 x 16 inch bags, 25 bags/min target, selected options, source prices and lead-time terms. Do not describe a reference photograph or video as proof of the exact quoted configuration.

“These are two alternatives within one opportunity. Each can have its own revisions. The customer can compare them without receiving a disconnected collection of PDFs.”

Return to **A · Rev 0**. In the feedback rail, use **Questions and feedback** to record a fictional reviewer and a question against that issued **Quote revision**: “Could the standard configuration use a foot switch and a custom product guide for our mixed hardware kits?” Choose **Add comment**, then **Mark as preferred**. Explain that preference is a discussion outcome, not a signed order. Feedback remains local to this browser.

## 2. Open the sales workspace — 3:15 to 4:45

Choose **Open sales workspace** in the proposal header. The same deal opens in **Workflow**. Show its owner, CRM reference, stage, application scope, quote alternatives, customer feedback and next action. In the left sidebar, open **Sales hub**, show its **Deals** and **Quotes** tabs, then open **A Standard loading** from Quotes.

“The application, proposal feedback and sales follow-up belong to the same deal. A rep can see what was presented and what still needs attention.”

In **Configure**, show the **Alternative** and **Revision** selectors. Another configuration is different from an earlier version. The four quote tabs are **Configuration**, **Engineering**, **Special orders** and **Review & issue**. Return to A's current issued revision.

## 3. Revise and configure — 4:45 to 8:00

Choose **Create next revision**. The demo records a preset reason based on the proposal discussion; there is no separate reason-entry form. In **Configuration**, find **Add catalog options** and preview Easy Load Bag Opener with its required Seal Flattener Fingers and combined **$7,750** change. Choose **Cancel**, then add **Foot Switch** at **$535**, which adds directly. Briefly toggle **Show prices** off and on; this internal presentation control does not secure the data or hide prices in the customer proposal.

Open **Engineering → Add an engineering requirement**. Describe a custom product guide for mixed hardware kits and why it is needed. Leave it unpriced and show **Pricing pending** and the preliminary total. Open **Review & issue** to show the issue blocker. Return to **Engineering**, switch **Demo role** to **Engineering**, enter 3 labor hours and $300 material cost, then **Save requirement**. Explain the assumed $150/hour rate; PAC must confirm whether it is cost or selling price, material treatment and pricing authority.

“A missing engineering price is visible. It cannot silently become zero or be issued as a final quote. An approval belongs to the version that was actually reviewed.”

In **Review & issue**, choose **Confirm application** and **Confirm engineering**. Return to **Engineering**, change labor hours from 3 to 4 and **Save requirement**. Return to **Review & issue** and show that approvals have cleared. The rehearsal total is **$33,060 + $535 + (4 × $150 + $300) = $34,495**. These engineering figures are illustrative, not a PAC cost estimate or approved selling price. Do not issue yet.

## 4. Discover a requirement in 3D — 8:00 to 10:00

In the working quote's **Review & issue** tab, find **Application & evidence** and choose **Add 3D evidence**. This opens Explorer with this quote's context. Select **Connecting rod** in **Component**, choose **Frame selection**, adjust the view, and optionally **Play one cycle**. Choose **Capture this view**, inspect **Review before attaching**, add a discussion note, and explicitly choose **Attach to this quote**.

Browse another component, then **Restore saved view**. Use **Back to deal** to return to the same deal's Workflow. Reopen through **Inspect saved evidence** if time allows. A capture alone does not add a priced option; attaching evidence clears the working draft's applicable approvals.

“This reference assembly demonstrates the evidence workflow. It is not a PAC machine model. With approved PAC CAD, the same mechanism could preserve the machine or option being discussed.”

## 5. Close the loop — 10:00 to 11:45

From Workflow, reopen **A Standard loading → Review & issue**. With **Demo role** set to **Engineering**, inspect the final scope, $900 engineering amount and attached evidence; choose **Confirm application** and **Confirm engineering**. Switch to **Sales** before choosing **Issue Rev 1**. Engineering cannot issue a quote.

Use **Revision** to compare the new $34,495 snapshot with preserved Rev 0 at $33,060, then return to the latest revision. Open **Customer proposal** and select **A · Rev 1**. Show its matching total and attached evidence; the earlier comment still names Rev 0. A new issued revision clears the earlier preference, so the customer must review and choose again.

Use **Print / save PDF** in the proposal header. The print view includes both issued alternatives regardless of the selected on-screen tab. Return to the app, reload and verify the deal, issued revisions, feedback and evidence remain available. In **Workflow → Deal details**, set a named owner, next action and follow-up date, then **Save deal details**.

Optional follow-up branches: in **Review & issue**, save a discount with its reason, repeat application and engineering reviews, then switch to Manager for **Confirm manager** before issue. In **Special orders**, add confirmed scope, price and lead-time conditions. Keep these branches outside the core timing.

“The output is a proposal we can discuss, plus a sales record that tells us what to do next.”

## Decisions to capture with PAC

| Decision | Proposed owner | Required confirmation |
| --- | --- | --- |
| Pilot application and alternatives | Sales + engineering | Machine families, product samples, bag format and required information |
| Engineering pricing | Engineering + commercial owner | Labor rate, whether it represents cost or selling price, material treatment and final pricing authority |
| Review rules | Sales leadership | Who reviews applications, engineering exceptions, discounts and price overrides; who may bypass which gates |
| CRM workflow | CRM administrator | CRM name, required deal fields, quote-number convention and integration boundary |
| Media | Product/engineering owner | Approved model-specific photos, videos and drawings; availability of PAC CAD |
| Pilot acceptance | Project owner | Named test cases, source-price reconciliation, approvals/revisions, proposal feedback and follow-up expectations |

Record each decision with an owner and due date. Unresolved decisions remain open; do not convert internal timing or commercial ideas into PAC commitments.

## Demonstration boundaries

This build is browser-local. Role switching, deal references and customer comments demonstrate the workflow on one browser. There is no connected CRM, shared backend, authenticated role enforcement, SSO, email approval delivery, multi-user synchronization, e-signature or payment processing. Public GitHub Pages hosting does not make locally saved deals shareable across devices. This is a demo workflow; production readiness requires separate scope and acceptance.

Before the meeting, preload the proposal and 3D model, confirm the initial totals, and use **Sales hub → Export workspace** for a JSON backup. Rehearse in a fresh sample browser profile if needed without clearing existing data. Keep a current proposal PDF and screenshots as labeled fallback evidence. If the live view fails, state the failure; use **Reconnect Explorer** when offered or the prepared evidence. Public and localhost copies have separate browser data.

## Rehearsal acceptance

- Two alternatives are distinct from their revision histories.
- Missing scope, unresolved prices and missing reviews prevent issue.
- Commercial edits invalidate approval of the changed draft.
- Issued revisions remain unchanged when a new revision is edited.
- Proposal and PDF use issued snapshots and matching totals.
- Comments identify the quote and revision they discuss.
- Explorer evidence returns to the same deal and restores its saved view.
- Reload retains deals, revisions, comments and evidence.
- Desktop and phone views remain readable and keyboard actions retain focus.
