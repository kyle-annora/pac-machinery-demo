# PAC Machinery — guided demonstration

This is the working, preset walkthrough for Patrick. The Website and Sales Workspace are separate artifacts; the presenter tells one customer story across them. Customer Proposal is the Workspace’s published customer-facing output.

**Open publicly:** [Full walkthrough](https://kyle-annora.github.io/pac-machinery-demo/demo/?mode=full#A01). For local source-package rehearsal, run `npm run serve` and use its printed origin with `/demo/?mode=full#A01`.

The audience interface and presenter script are English. The sample customer is Harbor Components. The main story follows the approved [production script](../docs/product/demo-production-2026-11-09/script.json); the [script review reader](../docs/product/demo-production-2026-11-09/index.html) contains the step-by-step rationale and requirement mappings.


## Sharing and pitch entry

Established public routes (see the [current release verification record](../presentation/handoff/RELEASE-2026-11-09.md) for the deployed revision and checked scope):

- Pitch: https://kyle-annora.github.io/pac-machinery-demo/presentation/
- Complete demonstration: https://kyle-annora.github.io/pac-machinery-demo/demo/?mode=full#A01
- Act A: https://kyle-annora.github.io/pac-machinery-demo/demo/?mode=a#A01
- Act B: https://kyle-annora.github.io/pac-machinery-demo/demo/?mode=b#B01
- Editable source: https://github.com/kyle-annora/pac-machinery-pitch

Start from pitch slide **7**, **Let’s walk through the sales experience** (`07-demo-routes`), using the guided-demo action. Run both acts continuously or select either act before starting. The demo’s final **Back to pitch** action returns to slide **16**, **Understand where the sales process slows down** (`11-baseline`). Stable scene IDs take precedence if page numbers change. The dated source-route alias is preserved in the packaged site so this return works from both local source and flattened publication layouts.

**Pitch Next and demo Next are different.** At pitch slide 7, click **Start the full walkthrough** to enter the demonstration. Pitch Next intentionally skips backup slides 8–15 and goes directly to slide 16, even before the demo has played. Within the demo, Next executes the prepared action and advances one step. If the pitch was advanced accidentally, Previous from slide 16 returns to slide 7. Individual Act A/B runs each return to slide 16; choose the full walkthrough to run both together.

The public URL runs the real demonstration UI and domain commands with each browser’s own sample data. It is not a shared customer portal or a hosted multi-user sales backend. Sharing a URL does not share the presenter’s local records. The old screenshot gallery remains archived reference, not the current walkthrough.


## Keep the live presentation in one tab

The pitch launches the guided demonstration in the same audience tab and the final return continues at slide 16. The separate native MPI 3D example is the other main-presentation page departure; it returns to customer outcomes. The Website and Sales Workspace remain independent artifacts inside the guided demonstration. Sharing a presentation tab does not connect their business records.

Keep the operation video and version-bound PDF in their existing page viewers. Patrick does not need to open YouTube, the PAC product website, or a downloaded PDF to complete the scripted walkthrough. Optional original-source links sit under **Reference details** and are available for questions or verification. If the video cannot play, use the equipment photo and continue with Next.

The inline **Presenter notes** panel is sufficient for the walkthrough. A separate presenter window and the production-script link remain optional preparation tools; they are not steps the audience needs to follow.

## Presenting

1. Open the full walkthrough. Use the bottom-left **Choose walkthrough** menu before presenting if you want one act or a different Website entry.
2. Choose **The complete story**, **Act A · Inquiry to proposal**, or **Act B · Feedback to revision**. The Website entry can be **Request a product** or **Help me choose**.
3. Press **Next** to perform the preset action and show its result. The right arrow does the same when focus is outside an input. Previous or the left arrow returns to the preceding scripted state.
4. Use **Presenter notes** for the current English talk track. **Open separate presenter view** opens a synchronized notes-only tab, with Previous/Next controls. Share the audience tab, not the notes tab.
5. At the end, use **Back to pitch** to continue with baseline, customer proof, the two-week trial and the trial decision. Trial sign-off is separate from the machine quotation.

Quick entry points:

- [Full story](https://kyle-annora.github.io/pac-machinery-demo/demo/?mode=full#A01): 40 main steps, approximately 8 minutes 37 seconds of scripted pacing. Allow about ten minutes before questions.
- [Act A](https://kyle-annora.github.io/pac-machinery-demo/demo/?mode=a#A01): Website inquiry, confirmed application, A/B configuration, review, publication and the first Proposal.
- [Act B](https://kyle-annora.github.io/pac-machinery-demo/demo/?mode=b#B01): Customer question, Explorer finding, engineering, revision, V2 and follow-up. This initializes the prepared V1 case; Act A does not need to have run first.
- [Help-me-choose entry](https://kyle-annora.github.io/pac-machinery-demo/demo/?mode=a&entry=help#H01): four application-led Website steps, then the same explicit sales-role transition.

The controls are outside the artifacts. Their presence does not create a Website-to-Workspace integration.

## How the preset behavior works

Next applies the approved scene through the local domain operations, persists the result in that artifact’s demo namespace, and advances after a completion acknowledgement. Configuration, saving, approval, publication and customer response remain distinct actions.

A08, A12 and B07 deliberately show missing-information or configuration blockers. These are part of the story: the following Next supplies the scripted resolution. Unexpected failures pause the run and expose **Retry this step** instead of claiming success.

Forms, option controls, topic selection and customer-facing sections remain interactive. If you explore manually, the next guided step restores its approved preset. **Casual edits do not rewrite the rehearsal script.** This keeps Patrick’s next action predictable. For a new scenario, change the source scenario and script deliberately, then validate the resulting sequence.

Previous, restarting and direct act entry reconstruct the relevant demo checkpoint. They affect this demonstration’s records only. Use **Restart this walkthrough** in the menu to repeat the selected act from its first scene. The URL retains a run ID; refreshing the host resumes its saved cursor. A new run can be started with a new `run` value, or from the duplicate-run notice. The host requests a single-writer browser lock when that browser supports it; a notes popout is not a second data writer.

## Independent artifacts and storage

The Website records a sample inquiry with **Demo inquiry recorded / Saved in this demonstration**. It retains contact, application, product interest or an unselected model, and the open questions. It does not send that record to the Workspace.

At A06, the presenter explicitly switches to a separately prepared sales case after a conversation with PAC. Shared names, branding, source photos and a run ID are narrative/presentation context. The host does not import Website inquiry fields into the Deal.

| Namespace | Owner | Stored content |
| --- | --- | --- |
| `pac-guided-website-v1:<runId>` | Website iframe | Website draft, locally recorded inquiry and receipt |
| `pac-guided-workspace-v1:<runId>` | Workspace iframe | Prepared Deal, working quotes, approvals, published versions, questions, findings and follow-up |
| `pac-guided-host-v1:<runId>` | Demo host | Presentation cursor, mode and Website-entry preset only |
| `pac-guided-last-run` | Host session storage | Convenience pointer to the last run in the tab session |

The active application key, **`pac-application-20261108-v1`**, is not used for guided-demo writes. Existing reviewed Harbor records stay in their original application namespace.

Iframe messages identify the step and run; they do not transfer inquiry or quote records to the host. The renderer accepts messages from its same-origin parent; the host checks the sending iframe. This is local demo isolation, not a production authentication or remote collaboration service.

## Sample data and commercial meaning

All customer details and event dates are fictional rehearsal inputs. The email address uses `.example`. The buyer’s **20 bags/min** is a requested target, not a promised performance result. The prepared conversation confirms **12 × 16 inch** polyethylene bags; application fit still needs representative parts and bags.

The source-template price basis is **January 29, 2025**, in USD:

| Item | Sample price |
| --- | ---: |
| Rollbag R3200 | $27,580 |
| On-Site Start-Up & Training | $5,480 |
| Easy Load Bag Opener | $6,035 |
| Seal Flattener Fingers | $1,715 |

Training is charged once in each quote. It is included in the displayed equipment/service subtotal, not free or included in the base-machine price. The opener requires fingers and a bag width of at least ten inches.

- **Proposal V1:** A Rev 0 is **$33,060**. B Rev 0 is **$40,810**. Difference: **$7,750**.
- **Proposal V2:** A Rev 0 remains **$33,060**. B Rev 1 is **$41,310**. Difference between A and B: **$8,250**. The change to B is **$500**.
- **Engineering example:** four hours at an illustrative $100/hour, plus $100 materials, gives a $500 estimate. A $500 proposed customer add-on is explicitly reviewed separately; this does not establish PAC’s rate or margin policy.
- **Planning example:** six weeks initially; an illustrative one-week engineering impact makes seven weeks for revised B. These are not PAC-confirmed lead times.

Freight, tax and final terms are outside these displayed equipment/service subtotals and require PAC confirmation. No final custom-guide geometry is issued. V1 remains intact after V2 is published; C1 stays associated with V1 / B Rev 0, and the later reply points to V2.

The Proposal and quotation PDFs use their issued version’s customer projection. Internal estimates, approval fingerprints and Explorer findings do not belong in the customer view. PDF documents are generated locally from the frozen published content.

## Media and service boundaries

The main Explorer uses original PAC equipment and option photographs. The operation-video control references PAC’s R3200 manual-loading video; a model video does not verify every selected option or the proposed guide. Use the equipment-photo fallback if the external player is unavailable. The main sequence does not rely on generic 3D geometry to describe the R3200.

The optional reference-only 3D insert described in the production script is not part of this 40-step main route. It must remain identified as a capability reference unless an approved PAC model is supplied.

This demonstration performs local saves, review records, publication, questions and replies. It does not deliver email, synchronize a CRM, authenticate through SSO, share records across devices, collect a signature, charge a payment or create a manufacturing order. A recorded reply or an opened Proposal is not customer acceptance.

The commercial discussion remains **two weeks free**, followed by a mutual decision on paid continuation, scope and terms. There is no automatic billing or unapproved subscription price in the demo.

## Running and changing the package

In the editable GitHub source package, run from the repository root:

```sh
npm run serve
```

It builds and serves `dist/`, normally at `http://127.0.0.1:4364/`. Open the printed origin with `/demo/?mode=full#A01`; set `PAC_PITCH_PORT` if needed. After source edits, run `npm run build` in another terminal, then refresh. Ordinary pitch/demo builds need Node.js 20+ and Python 3.9+, with no npm dependencies to install.

Use HTTP rather than a file URL because the application uses JavaScript modules. Keep `presentation/`, `demo/`, `application/`, shared `brand` tokens, script JSON and vendor assets in the documented sibling layout. The local preview URL is not remotely shareable.

Key files:

- `host.js` / `host.css` / `index.html`: mode selection, cursor, frame orchestration, presenter notes and recovery UI.
- `website-domain.mjs` / `website.js` / `website.css` / `website.html`: independent buyer experience and inquiry capture.
- `scenario.mjs`: deterministic A/B scenario using the existing application domain operations.
- `workspace.js` / `workspace.css` / `workspace.html`: sales and customer surfaces, reusing the approved application foundation.
- `pdf.mjs`: version-bound quotation generation.
- `../application/domain.mjs` and `../application/deal-domain.mjs`: quotation, publication, comments and finding rules.
- [DESIGN-LOCK.md](DESIGN-LOCK.md): reusable visual and interaction rules.
- [Production script](../docs/product/demo-production-2026-11-09/script.json): English narration, fixed inputs and step contract.

When changing a scene, update its script, domain state transition and visible proof together. Do not patch a screenshot or silently substitute a success state for a failed business operation. New demos should keep the shared visual and domain foundations, while supplying their own named scenario, namespace, assets and evidence.

Validation: [current release and verification snapshot](../presentation/handoff/RELEASE-2026-11-09.md). The earlier guided acceptance run covered all 40 main steps and 43 domain tests; the release record distinguishes that retained evidence from current release checks, deployment status and service limits. Large local captures are not bundled in this source package.
