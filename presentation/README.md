# Annora × PAC Machinery — formal pitch

This directory is the **one canonical source** for the formal PAC pitch: 22 audience scenes, a separate English speaker script, source evidence, a guided live-demo launch, retained prototype screens and editable workflow diagrams. Preview directories and exported HTML are not parallel authoring sources.

Website and Sales Workspace are independent product artifacts. Page 7 launches their prepared demonstration, with independent Website and Workspace records. Maintaining the pitch does not authorize changing either product.

## Open

- `index.html`: audience presentation. Arrows or Space advance reveals. Contents jumps to a scene. Present hides controls; Escape restores them. Full screen is available in presentation mode.
- `notes.html`: Concise English narration and transitions, separate from audience copy; expandable presenter context preserves evidence detail without adding it to the spoken script. Follow slides synchronizes with the deck on the same origin.
- `demo.html`: the retained screen gallery and earlier presenter paths, available as backup evidence. These recorded views and their readiness descriptions are historical; page 7’s guided demo is the primary walkthrough.
- `evidence.html`: Patrick’s new AI-search and product-selection conversation, the earlier complementary searches, proposed AEO / inquiry work and official PAC configuration sources.
- `journey.html`: customer journey, publication boundary, alternatives/revisions and the trial decision, with editable SVG links.

The audience stage is a fixed **1920 × 1080** composition scaled uniformly to fit the display. It retains its 16:9 geometry on phones. Supporting reading pages reflow independently.

## Forward narrative

Keep the opening concise, then follow the process forward. The complete customer Proposal appears **after configuration, review and publication**, rather than before the work that produces it.

1. **Every order starts with a quote.**
2. **From the first question to the next decision.**
3. **Buyers start with a question.**
4. **Getting found is only the first step.**
5. **Two clear ways to start a conversation.**
6. **Start with the context the buyer already has.**
7. **Let’s walk through the sales experience.**
8. **One place to keep the opportunity moving.**
9. **Confirm the application before the offer.**
10. **Configure the difference. Keep the scope clear.**
11. **Review before the offer goes out.**
12. **Help the customer make the loading choice.**
13. **Keep the discovery with the Deal.**
14. **Answer the question. Make the change explicit.**
15. **A new offer. The earlier promise preserved.**
16. **Understand where the sales process slows down**
17. **Make the machine easier to understand.**
18. **We have delivered this before.**
19. **Two weeks. Defined work you can evaluate.**
20. **Your team runs the cases**
21. **Keep the workflow useful.**
22. **Let’s put this to work for PAC.**

In the live pitch, page 7 launches the guided demonstration: Act A (Website inquiry → prepared sales opportunity → published Proposal), followed by Act B (customer question → inspection → revised offer → follow-up). Its primary link opens both acts; quiet secondary links open either act separately. The Website and Workspace remain independent. Normal Next navigation jumps from page 7 to page 16 after the demonstration, and Previous from page 16 returns to page 7. Pages 8–15 remain selectable through Contents and existing deep links as **backup** screen explanations.

The authored demo URL is `https://kyle-annora.github.io/pac-machinery-demo/demo/?mode=full&entry=product#A01`. On a loopback server, `guided-links.js` resolves the same links to that server’s `/demo/`, supporting both the canonical dated deck and the flattened `/presentation/` alias. The demo returns to `11-baseline` (page 16). Root release verification must confirm the public destination before sharing.

Page 17 launches a **24-second native Annora Explorer demo** using the MPI 35 Series study: whole machine → isolate the tooling area → authored opening motion → controls → whole machine. The existing Explorer owns the camera, highlighting, animation, timeline and Pause/Resume/Replay/Explore controls. There is no standalone playback wrapper. This is illustrative geometry, not PAC equipment, manufacturer CAD, an engineering approval or evidence of a deployed MPI 3D product.

The MPI entry preserves the approved equal-height product-screen composition and a real screenshot from the native viewer at `../mpi-demo/assets/mpi-preview.jpg`. Keep the original Annora and PAC deck logos. Do not substitute a generic mechanism or a fabricated screenshot.

The published native runtime lives at `/presentation/mpi-demo/?model=mpi-35-study&presentation=1&guide=timeline`. It starts automatically after model preparation. `guided-links.js` resolves local rehearsals to the same server and adds only native route options. The **Return to pitch** anchor in the integrated Demo panel goes to public customer proof (`02-proof`), as does the native brand link. In Explore, the same anchor returns to the utility area. Editable native source and model authoring inputs live at `../mpi-native-source/`; keep its source and license notices. The default product illustration reuses the original MPI project’s fixed face colors, transparent guards and original logo/display imagery against a approved desaturated MPI ink-navy gradient with the native perspective grid. A demo-local appearance adapter applies the original media while the geometry importer remains texture-free. Chapter, caption, transport and return navigation share one panel; the native clock and authored motion remain unchanged.

The final scene asks PAC to approve the two-week free trial, with scope, a PAC lead and dates confirmed. It appears in full on arrival. Its speaker script ends with a direct question and a pause; paid work still requires separate mutual agreement. The detailed trial-process diagram remains in the supporting diagram library.

Scene IDs remain stable for deep links; their numeric prefixes do not determine the sequence. The order and exact audience titles in `content.json` are authoritative. The baseline (`11-baseline`, page 16) leads to the MPI35 guided example (`11-mpi-explorer`, page 17). Customer proof (`02-proof`, page 18) follows that example and remains immediately before the Annora trial offer (`12-trial`, page 19).

## Authoring sources

Read [the reusable design rules](../system/PITCH-DESIGN-RULES.md) before editing. Shared visual contracts live in [layout.css](../system/layout.css): canvas geometry, typography roles, spacing, neutral masthead and equal-height media/text compositions. Use shared patterns instead of accumulating independent per-element offsets.

| Source | Responsibility |
| --- | --- |
| `content.json` | Scene order, titles/subtitles, visible HTML body copy in `visual`, customer `results`, inquiry `fields`, spoken `narration`, optional `presenterContext` and `sourceLinks`, transitions and navigation labels |
| `pitch.js` | Scene markup consuming structured content, reveal behavior, explicit mainline navigation and browser-only copy-edit controls |
| `guided-links.js` | Preserve public demo links; resolve loopback rehearsals and native MPI model/presentation options |
| `pitch.css` | Deck-specific presentation and supporting-page styles |
| `../system/layout.css` | Reusable type, alignment, spacing and composition rules |
| `viewport-base.css` | Fixed-stage viewport behavior |
| `diagram-source/*.svg` | Canonical diagram copy, geometry and styling |
| `make-diagrams.py` | Validates source SVGs and compiles `diagrams.js`; does not regenerate their design from another template |
| `artifacts.json` | Artifact readiness: planned Website; prototype Workspace / Proposal; verified public URLs only |
| `screens.json` | Complete screen inventory, captured routes, capabilities, limits and two linear presenter paths |
| `demo-gallery.js` / `.css` | Screen gallery and forward/backward rehearsal viewer; local launch is distinct from public evidence |
| `DEMO-RUNBOOK.md` / `CAPABILITY-MAP.md` | English presenter actions, expected results, commercial close and full coverage |
| `evidence/search-records.json` | Search observations, sources and limits |
| `build.mjs` | Produces the complete audience and supporting-page package |

Edit SVGs in `diagram-source/`, not the generated `diagrams.js` or exported `diagrams/` copies. The compiler checks SVG roots, view boxes, accessible titles/descriptions and unique inline IDs.

## Build and verification

From this directory:

```sh
python3 make-diagrams.py
node build.mjs
```

For a separate publication directory, use `node build.mjs --out OUTPUT_DIRECTORY`. The build produces `index.html`, `notes.html`, `demo.html`, `evidence.html`, `journey.html`, exported SVG diagrams and search records. HTML embeds the fonts, imagery, styles and scripts needed by each page. A separate output build also copies the sibling MPI runtime to `OUTPUT_DIRECTORY/mpi-demo/`, excluding verification captures and test modules. Keep linked supporting pages, the MPI runtime and exported diagrams together, and include their licenses in distributions.

Verify all 22 scenes and every reveal, not only the most recently edited scene. Check image/text top and bottom alignment—including the final condition or action—font consistency, overflow, readable contrast and stable geometry. Inspect screenshots at 1280 × 720 and a phone viewport, then check the supporting pages, deep links and demo destinations. Save screenshots and check results in `verification/`.

When publication is requested, publish the verified package to the existing GitHub Pages destination. Open the public URL after deployment and verify the released scenes, assets and links. Record the commit or deployment receipt with the verification results; a local preview is not the shareable release.

## Current artifacts and product boundaries

The two artifacts are **Website** and **Sales Workspace**. **Customer Proposal** is the customer-facing output of Workspace. Website is planned; Workspace, Customer Proposal and Deal-local Explorer are current local prototypes. The withdrawn Website-to-Deal experiment is excluded. No Inbox, imported inquiry or CRM bridge is active.

All 18 retained views are recorded in `screens.json` and the gallery. The audience deck uses selected screens; the gallery preserves the full set. Original browser captures and optimized JPEG copies live in `assets/current-app/`, with provenance in `sources.json`. Detail crops are declared. Screenshots are not live iframes and must not be described as a hosted product.

Two rehearsal paths are proposed from current capabilities: **prepare a clear offer**, then **turn an equipment finding into a controlled revision**. Patrick requested the forward sales sequence and feedback loop; the exact pair is our demonstration arrangement. See `DEMO-RUNBOOK.md` for actions, expected states, spoken lines and preparation.

The local launcher appears only on a loopback origin and checks that the relative `application/` entry is available. A pitch-only package contains screen evidence, not the application or the presenter's records. Opening the latest customer view requires a publication in the same browser. Public artifact URLs remain empty until independently verified as public HTTPS demos. Browser-only data, local approvals and reference 3D must retain their stated limits.

## Brand and readability

- Use **Manrope only** for presentation text, labels, numbers, buttons and diagram text. Font licensing is in `licenses/`.
- Keep a charcoal canvas, high-contrast white/gray text and restrained PAC orange-yellow actions. Blue may identify selected workflow states; it is not a body-text color or page wash.
- The masthead is warm neutral light `#f4f3ef`, with **no blue tint or blue bottom rule**. Its logo divider is `#c8c7c2`.
- At the 1920px canvas size, use Annora at **220px** wide and PAC Machinery at **320px** wide, at their original aspect ratios. Preserve original files, colors and embedded tagline. Improve the tagline’s legibility through size and the light neutral backing; never recolor or retype it.
- Official assets: [Annora wordmark](https://annora.ai/assets/images/brand/annora-wordmark-ink.png) and [PAC color logo](https://www.pacmachinery.com/wp-content/uploads/2021/05/color-logo.png). The former hexagon Annora mark is obsolete.
- Equipment photography remains an unchanged reference from [PAC’s R3200 product page](https://www.pacmachinery.com/products/rollbag-r3200-and-r3200xl/). [PAC’s loading video](https://www.youtube.com/watch?v=nYCpXU1llI4) demonstrates operation, not an application-specific performance guarantee.

## Evidence and commercial boundaries

- [Patrick’s new shared conversation](https://chatgpt.com/share/6af17b57-16e4-83eb-b11a-091a431935c6) shows PAC Machinery / Clamco in a specific-machine shortlist, including Dempack H30 and 4C Combo. The submitted criteria are shrink, medical and manual. The shared form’s displayed defaults differ from that later prompt; do not claim to have reproduced its submission. This is an observed answer, not verified suitability or a conversion result.
- The new Website plan has two paths: **Request this product** for a known model, and **Help me choose** for an application-led inquiry. Both lead to a buyer-reviewable summary with known facts and open questions. It is a proposed experience, not a working intake or an automatic Workspace handoff.
- PAC already has a general Request a Quote page and a Dempack H30 Instant Quote form. The opportunity is more explicit product context and guided application details; do not claim PAC lacks forms or that its backend loses context.
- Keep the new medical / shrink example separate from the illustrative Harbor / R3200 sales demonstration. The earlier shared answer and complementary searches remain evidence of variation, not a general absence of PAC from AI answers.
- AI / SEO trial work is a proposed buyer-question baseline, source-linked observations, prioritized changes, one application-page draft with the two proposed inquiry paths and review summary, and a measurement plan. Review the draft for preserved product context, accurate requirements and visible unknowns. Production form delivery, publishing, backend integration and continued implementation require agreed scope.
- MPI, Kannegiesser and Mr Winter results are outcomes reported by Patrick. Keep attribution and source context available; do not imply independent verification or guaranteed PAC results.
- Harbor Components and the A/B comparison are illustrative. Product photographs are model/option references, not an issued configuration. Official PAC material supports the Easy Load Bag Opener / Seal Flattener Fingers dependency and minimum 10-inch bag width; PAC must confirm application fit, current price and lead time.
- The proposal is **two weeks free**, with scope and review cases agreed before starting. Continued paid work begins only after both parties agree on scope, fees and support. There is no automatic billing.
- Reuse the design system and workflow patterns for other demos, not PAC’s narrative, customer claims, metrics, observations or commercial terms. Supply each client’s own evidence and agreement.
