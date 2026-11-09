# PAC demo — production screenplay and traceability

Status: the approved main screenplay is implemented in the guided demonstration under `demo/`. This documentation records the scenario and traceability; it is not a claim that all 41 requirements or production integrations are complete.

Open `index.html` to review the sequence one step at a time. It is self-contained and can be opened directly, or served from the repository. The review reader’s Next button advances documentation. To operate the actual pages, open `../../../demo/?mode=full#A01`; see `demo/README.md` for controls, isolation and rehearsal checks.

In the editable GitHub source package, run `npm run serve`, then open the printed local origin with `/docs/product/demo-production-2026-11-09/index.html`. The default package port is 4364.

## The agreed story

**Act A — From inquiry to a clear proposal:** Website discovery and a contextual inquiry; an explicit presenter transition to a separately prepared sales example; confirmed requirements; two valid alternatives; save, review, approval and publication; a customer-facing proposal with equipment, documents and a comparison. 24 steps, approximately 5 minutes 9 seconds.

**Act B — From customer feedback to a revised offer:** A question about Option B; sales follow-up; an equipment finding in Explorer; an engineering requirement; saved and approved B Rev 1; Proposal V2; a response to the original question; version history and an owned next action. 16 steps, approximately 3 minutes 28 seconds.

The combined spoken/action target is **8 minutes 37 seconds**. Reserve approximately 10 minutes for an uninterrupted walkthrough, then allow discussion separately. Timing is a rehearsal target, not measured PAC productivity.

The product-request path is the default. **Help me choose** is a four-step alternate entry selected before rehearsal. Both entries are visible in the main Website view; Patrick need not run two forms or decide between branches during the presentation.

Website and Sales Workspace remain independent. The Website creates its own explicitly labelled local demo inquiry receipt. A role transition opens a separately prepared Workspace case; no inquiry import, CRM bridge or shared business record is implied. Customer Proposal is the Workspace’s published customer-facing output, with the customer-facing PAC brand family.

## How to review

Start at **A01**, then use Next or the right arrow. Every card separates the page and role, preset action, state before and after, visible proof and English spoken line. Expand the production details for exact inputs, checkpoints, requirements and Patrick feedback.

The key narrative checkpoints are **A05–A07** (capture and independent transition), **A12–A20** (configuration through publication), **A21–A24** (customer persuasion), **B03–B12** (Explorer, engineering and revision), and **B13–B16** (reply, version history and follow-up). The reader can link directly to any of these step IDs.

The Requirements view covers **all 41 numbered requirements**, with 19 in the main path, 10 partially covered, five in supplementary demonstrations, six requiring integrations and one scoped to design. These are the original planned coverage levels, not completion claims. Requirement-level currentStatus entries preserve the planning baseline; implemented guided behavior and verification are recorded in `demo/README.md` and `demo/verification/README.md`. The Patrick view contains 18 feedback mappings with sources and explicit treatment of superseded directions.

## Scenario boundaries to preserve

- Keep the two acts, product-request default and approximately ten-minute demonstration length. The needs-help preset is available separately.
- Use the dated sample R3200 prices, with training charged once in each alternative. A is $33,060; B is $40,810. The revised B is $41,310. Freight, tax and final terms are outside these displayed equipment/service subtotals.
- The **six-week base planning time** and **$500 / one-week engineering change** are illustrative scenario inputs. They are not PAC-confirmed prices, rates, feasibility or lead times. All customer-visible outputs must label them consistently, or replace them with PAC-confirmed values before demonstration.
- Keep actual PAC photo exploration in the main path. A reference-only 3D capability insert is optional; it is not R3200 CAD and cannot substantiate the custom guide.
- Confirm exact machine/option imagery and the operation-video segment before producing those scenes. A generic machine video does not demonstrate a particular installed option. No custom guide drawing is currently approved.

Signature and payment remain design-only. CRM, SSO, approval email, remote multi-user access and catalog administration do not become completed features merely because a script mentions them. Their requirements, target proofs and gaps remain visible in the coverage file.

## Relationship to the pitch

Enter from pitch slide 7, **Let’s walk through the sales experience** (`07-demo-routes`), after the AI-search and Website framing. Clearly distinguish the actual search example from the illustrative Harbor Components sales case. Skip duplicate static screenshots while running the artifacts. A split run can pause at the first A/B comparison and then introduce the customer question before Act B.

Return after Act B to slide 16, **Understand where the sales process slows down** (`11-baseline`), then the separate 24-second native MPI capability example on slide 17 (`11-mpi-explorer`), customer proof on slide 18 (`02-proof`), the trial offer and sign-off. Customer outcomes remain attributed to Patrick and are not PAC forecasts. The free trial is a bounded two-week exercise on agreed machines and cases; review the outputs and gaps together. Paid service starts only after mutual agreement on continuation, scope and terms. The deck sign-off concerns the Annora trial, not acceptance of a machine quote.

## Production sequence and future edit loop

1. Lock the scenario, exact media, price basis, approval examples and visual rules. List the already working domain behaviors and the missing ones; use the current approved application direction, not withdrawn pages.
2. Build the Website scenes and independent inquiry capture; complete Workspace and Customer Proposal scenes against the specified before/after states. Finish visible validation, saved, loading and fallback states as part of each page.
3. Add the deterministic Next runner over the actual domain commands. Use isolated demo storage, stable action IDs, verified checkpoints and independent act starts. Leave the currently reviewed Workspace data untouched.
4. Rehearse the full run and each act, including replay, refresh, duplicate Next, expected blockers and media failure. Verify every amount, revision, document, comment context and customer-facing visibility boundary.
5. Embed the accepted routes in the pitch and hand Patrick the presenter view, fixed entry points and recovery instructions. Test the chosen sharing environment before describing a link as remotely usable.

## Files and maintenance

- `script.json`: canonical scene data, fixed inputs, playback contract and production acceptance.
- `requirements.json`: all 41 requirements, sources, planned coverage and current gaps.
- `feedback.json`: Patrick and user-decision source register and mappings.
- `build.py`: generates the review reader and the three Markdown documents from those JSON sources.
- `PRODUCTION-SCRIPT.md`: complete production screenplay.
- `REQUIREMENTS-COVERAGE.md`: requirement-by-requirement acceptance and gaps.
- `FEEDBACK-ALIGNMENT.md`: feedback implementation, source references and limits.

Edit the JSON sources, then run `python3 docs/product/demo-production-2026-11-09/build.py` from the repository root. Do not maintain divergent edits in the generated HTML or Markdown. The local source documents referenced in the register are not bundled or uploaded by this package.
