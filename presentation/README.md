# Annora × PAC Machinery — formal pitch

This directory is the **one canonical source** for the formal PAC pitch: 16 audience scenes, a separate English speaker script, source evidence, planned demo entry points and editable workflow diagrams. Preview directories and exported HTML are not parallel authoring sources.

Website and Sales Workspace are independent product artifacts. This pitch describes and links their planned demonstration views; maintaining the pitch does not authorize changing either product.

## Open

- `index.html`: audience presentation. Arrows or Space advance reveals. Contents jumps to a scene. Present hides controls; Escape restores them. Full screen is available in presentation mode.
- `notes.html`: Concise English narration and transitions, separate from audience copy; expandable presenter context preserves evidence detail without adding it to the spoken script. Follow slides synchronizes with the deck on the same origin.
- `demo.html`: explicit plans for Website, Sales Workspace and its customer Proposal view. These are reserved demo destinations, not claims that rebuilt artifacts are complete.
- `evidence.html`: Patrick’s shared AI-search example, preserved complementary searches, proposed AI / SEO work and official PAC configuration sources.
- `journey.html`: customer journey, publication boundary, alternatives/revisions and the trial decision, with editable SVG links.

The audience stage is a fixed **1920 × 1080** composition scaled uniformly to fit the display. It retains its 16:9 geometry on phones. Supporting reading pages reflow independently.

## Forward narrative

Keep the opening concise, then follow the process forward. The complete customer Proposal appears **after configuration, review and publication**, rather than before the work that produces it.

1. **Every order starts with a quote.** Establish the commercial problem.
2. **We have delivered this before.** Present attributed outcomes from MPI, Kannegiesser and Mr Winter.
3. **From the first question to the next decision.** Preview the complete journey.
4. **Buyers ask AI who to call.** Show the discovery behavior.
5. **Help the right buyers discover PAC.** Connect observed evidence to scoped AI / SEO work.
6. **Make the application easier to explain.** Show Website education and product exploration.
7. **Turn product interest into a useful inquiry.** Capture application context.
8. **Confirm the need. Configure the offer.** Enter Sales Workspace, clarify requirements and configure options or reviewed custom work.
9. **Review before the offer goes out.** Separate a working draft from a published customer version.
10. **Same machine. A different loading experience.** Show the customer Proposal and concrete A/B alternatives.
11. **Revise without losing the history.** Connect customer feedback with a new revision and preserved published versions.
12. **Understand where the sales process slows down.** Establish the baseline for evaluating the work.
13. **Two weeks. Defined work you can evaluate.** State the proposed free-trial deliverables.
14. **Your team runs the cases.** Make acceptance observable through agreed cases.
15. **Keep the workflow useful.** Explain ongoing maintenance, improvement and the decision to continue.
16. **Schedule the kickoff and review.** Agree the trial scope, owners and review date.

Scene IDs remain stable for deep links; their numeric prefixes do not determine the sequence. The order in `content.json` does.

## Authoring sources

Read [the reusable design rules](../system/PITCH-DESIGN-RULES.md) before editing. Shared visual contracts live in [layout.css](../system/layout.css): canvas geometry, typography roles, spacing, neutral masthead and equal-height media/text compositions. Use shared patterns instead of accumulating independent per-element offsets.

| Source | Responsibility |
| --- | --- |
| `content.json` | Scene order, titles/subtitles, visible HTML body copy in `visual`, customer `results`, inquiry `fields`, spoken `narration`, optional `presenterContext`, transitions and navigation labels |
| `pitch.js` | Scene markup consuming structured content, reveal behavior, navigation and browser-only copy-edit controls |
| `pitch.css` | Deck-specific presentation and supporting-page styles |
| `../system/layout.css` | Reusable type, alignment, spacing and composition rules |
| `viewport-base.css` | Fixed-stage viewport behavior |
| `diagram-source/*.svg` | Canonical diagram copy, geometry and styling |
| `make-diagrams.py` | Validates source SVGs and compiles `diagrams.js`; does not regenerate their design from another template |
| `artifacts.json` | Planned demo destinations, required views and verification states |
| `evidence/search-records.json` | Search observations, sources and limits |
| `build.mjs` | Produces the complete audience and supporting-page package |

Edit SVGs in `diagram-source/`, not the generated `diagrams.js` or exported `diagrams/` copies. The compiler checks SVG roots, view boxes, accessible titles/descriptions and unique inline IDs.

## Build and verification

From this directory:

```sh
python3 make-diagrams.py
node build.mjs
```

For a separate publication directory, use `node build.mjs --out OUTPUT_DIRECTORY`. The build produces `index.html`, `notes.html`, `demo.html`, `evidence.html`, `journey.html`, exported SVG diagrams and search records. HTML embeds the fonts, imagery, styles and scripts needed by each page. Keep linked supporting pages and exported diagrams together, and include the `licenses/` folder in distributions.

Verify all 16 scenes and every reveal, not only the most recently edited scene. Check image/text top and bottom alignment—including the final condition or action—font consistency, overflow, readable contrast and stable geometry. Inspect screenshots at 1280 × 720 and a phone viewport, then check the supporting pages, deep links and demo destinations. Save screenshots and check results in `verification/`.

Publish the verified package to the existing GitHub Pages destination. Open the public URL after deployment and verify the released scenes, assets and links. Record the commit or deployment receipt with the verification results; a local preview is not the shareable release.

## Demo placeholders and product boundaries

The three entry points are **Website**, **Sales Workspace** and **customer Proposal**. Proposal is the customer-facing view of the sales workflow, not a third independent product. Website and Sales Workspace remain separate artifacts connected by the pitch’s story and a defined inquiry handoff.

An endpoint becomes a live-demo link only when its HTTPS URL and behavior have been verified and `artifacts.json` marks it `verified-demo`. Other states open a clearly labeled plan or placeholder. Reserve room for actual screens, recordings and journey diagrams; never substitute a stale demo or portray equipment photography as a screenshot of a finished application.

## Brand and readability

- Use **Manrope only** for presentation text, labels, numbers, buttons and diagram text. Font licensing is in `licenses/`.
- Keep a charcoal canvas, high-contrast white/gray text and restrained PAC orange-yellow actions. Blue may identify selected workflow states; it is not a body-text color or page wash.
- The masthead is warm neutral light `#f4f3ef`, with **no blue tint or blue bottom rule**. Its logo divider is `#c8c7c2`.
- At the 1920px canvas size, use Annora at **220px** wide and PAC Machinery at **320px** wide, at their original aspect ratios. Preserve original files, colors and embedded tagline. Improve the tagline’s legibility through size and the light neutral backing; never recolor or retype it.
- Official assets: [Annora wordmark](https://annora.ai/assets/images/brand/annora-wordmark-ink.png) and [PAC color logo](https://www.pacmachinery.com/wp-content/uploads/2021/05/color-logo.png). The former hexagon Annora mark is obsolete.
- Equipment photography remains an unchanged reference from [PAC’s R3200 product page](https://www.pacmachinery.com/products/rollbag-r3200-and-r3200xl/). [PAC’s loading video](https://www.youtube.com/watch?v=nYCpXU1llI4) demonstrates operation, not an application-specific performance guarantee.

## Evidence and commercial boundaries

- Patrick’s shared medical-packaging search is one observed answer. Complementary searches do include PAC; this is not proof that PAC is absent from AI search generally or that the proposed work has already improved acquisition.
- AI / SEO trial work is a proposed buyer-question baseline, source-linked observations, prioritized changes, one application-page draft and a measurement plan. Publishing and continued implementation require agreed scope.
- MPI, Kannegiesser and Mr Winter results are outcomes reported by Patrick. Keep attribution and source context available; do not imply independent verification or guaranteed PAC results.
- Harbor Components and the A/B comparison are illustrative. Product photographs are model/option references, not an issued configuration. Official PAC material supports the Easy Load Bag Opener / Seal Flattener Fingers dependency and minimum 10-inch bag width; PAC must confirm application fit, current price and lead time.
- The proposal is **two weeks free**, with scope and review cases agreed before starting. Continued paid work begins only after both parties agree on scope, fees and support. There is no automatic billing.
- Reuse the design system and workflow patterns for other demos, not PAC’s narrative, customer claims, metrics, observations or commercial terms. Supply each client’s own evidence and agreement.
