# Pitch design and authoring rules

This is the reusable presentation standard established during the PAC pitch review on November 8, 2026. Apply it to revisions of this deck and to new demos built from the same presentation system. The user requested consistent typography, spacing and alignment across the entire pitch, including equal-height image and text regions.

The current production deck source is `presentation/2026-11-08/`. Its shared composition implementation is `presentation/system/layout.css`; these rules explain the contracts that implementation must preserve. The authoring system may be reused; its client-specific claims may not.

## Visual foundation

Use the approved charcoal presentation with white and gray text, real product imagery and restrained brand accents. The audience should see one main idea and one clear visual structure per scene.

The foundation draws on Linear's disciplined sans-serif hierarchy and low-prominence navigation, with Cron's restrained action accent and regular spacing. These are bounded references, not instructions to copy their brands or add new visual treatments. The user's annotated PAC slides are the controlling reference for reducing clutter and matching image/text boundaries.

- Keep a single type family: **Manrope** for headings, body, labels, numbers, buttons and diagrams.
- Do not reintroduce Barlow, condensed display type, monospace labels or tracked all-capital chapter names.
- Use sentence case. Establish hierarchy with a small number of sizes and weights.
- Preserve the original Annora and PAC logo files, colors, shapes, clear space and aspect ratios. No redrawing, cropping, filters, recoloring or obsolete logo substitutions.
- Use a quiet, continuous warm neutral masthead: `#f4f3ef`, with no blue tint and no blue bottom rule. Keep chapter labels, repeated source lines and decorative metadata out of the audience area.
- At the 1920px authored canvas size, render the Annora logo at 220px wide and the PAC logo at 320px wide, preserving each original aspect ratio. Use a neutral `#c8c7c2` divider between them. On supporting pages, scale the pair proportionately when necessary.
- The PAC tagline is embedded in its original logo and has limited contrast. Improve its legibility through the neutral light backing and larger logo size. Never recolor the logo, trace it, or overlay a retyped tagline.
- Preserve equipment and evidence imagery. Equipment images use `object-fit: contain` when the whole machine is relevant; any intentional detail crop must preserve the meaning of the source.

## Shared geometry

Author every scene on a **1920 × 1080** canvas. Scale the whole stage uniformly to fit the viewport. Keep the 16:9 composition on phones and in presentation mode; do not reflow slide content into a mobile web layout. Supporting reading pages may reflow.

| Role | Default geometry |
| --- | --- |
| Outer content edges | x = 104 and x = 1816; usable width 1712 |
| Brand band | y = 0–116 |
| Main title | x = 104, y = 195 |
| Supporting context | x = 104, y = 296 |
| Standard content area | x = 104, y = 384, width 1712, height 584 |
| Content bottom | y = 968 |
| Page number | Right aligned at x = 1816; bottom inset 36 |
| Spacing steps | 8, 16, 24, 32, 40, 48, 64 |
| Standard internal column gap | 40 |
| Large media/text gutter | 64 |

These values are authored canvas units, not live viewport pixels. An opening or diagram can use a named composition variant, but its content must still respect the common outer edges and footer clearance. Document a reusable variant rather than creating a chain of page-specific overrides.

## Type roles

| Role | Size | Weight | Line height |
| --- | --- | --- | --- |
| Main title | 72 | 600 | 1.12 |
| Section or option title | 40 | 600 | 1.20 |
| Body or supporting context | 32 | 400 | 1.40 |
| Label, note or page number | 24 | 500; 400 for a note | 1.40 |
| Result or large metric | 96 | 600 | 1.05–1.10 |
| Featured source question | 64 | 500 | 1.30 |

Use these roles through shared tokens. Do not shrink one heading or paragraph to make an overfull scene fit. First shorten the audience copy, move detail to the notes, or split the scene. A heading may wrap deliberately to two balanced lines when its composition reserves the space. Never let a longer title collide with its subtitle or content region.

Use no more than three routine text weights: 400, 500 and 600. SVG node titles use the 32px body size at weight 600; node explanations use the 24px label size. Supporting documents use a separate reading scale within the same font family.

## Color roles

| Token | PAC value | Role |
| --- | --- | --- |
| Stage surround | `#0b0e11` | Letterbox and outer presentation space |
| Slide canvas | `#14181c` | Primary background |
| Main text | `#f4f6f8` | Headings and primary statements |
| Supporting text | `#d1d7dc` | Body copy and explanations |
| Quiet text | `#bdc7cf` | Small supporting labels, used sparingly |
| Surface | `#222a31` | Neutral content and diagram surfaces |
| Divider | `#53616b` | Quiet structural separation |
| Action/difference | `#f7aa00` | One primary action or specific comparison emphasis |
| Brand blue | `#2464a6` | Selected workflow state; never a masthead wash or bottom rule |
| Photo surface | `#e4e7e9` | Neutral product-image field |
| Brand masthead | `#f4f3ef` | Warm neutral backing for original-color logo legibility |
| Masthead divider | `#c8c7c2` | Quiet separation between original logos |

Brand color is a functional signal, not a body-text style or an all-page wash. Do not use pale blue text throughout the deck, tint source photography, or make every card blue. Preserve strong text/background contrast after every theme change.

## Composition patterns

Choose a pattern before adding content. Reuse its structure across related scenes.

| Pattern | Structure and alignment contract |
| --- | --- |
| Media + explanation | One shared two-column container. Media and the complete explanation region share top and bottom boundaries. |
| Media + A/B alternatives | Media column, then two equal option columns. Option labels, headings and body start on common baselines. Shared conditions and the one action occupy a bottom-anchored group. |
| Result comparison | Equal-width columns with aligned customer labels, metrics and explanations. One headline result per customer. |
| Workflow diagram | Common outer edges, consistent node text roles, orderly node sizing and connectors. Distinguish states with restrained accents. |
| Requirements or service rows | Shared label, title and explanation columns. Consistent row padding, baseline alignment and divider treatment. |
| Trial summary | One scope/time block and one deliverables block on a shared content grid. Scope qualifications and the mutual payment decision remain visible where they are the main idea. |

### Equal-height media and text

The alignment target is the **full content region**, including its condition, note or primary action—not only the first paragraph.

1. Position one parent layout on the slide. Use Grid or Flexbox inside it.
2. Set the shared content height once. Let the media surface and text column stretch to that height.
3. Put the text column in normal flow. Anchor its final condition/action group to the bottom with a flex spacer or `margin-top: auto`.
4. Apply the anchoring to the direct flex child, including a reveal wrapper when present. Prevent the bottom group from shrinking.
5. Reset obsolete `position`, `top`, `left`, `right` and fixed sizes on children. Do not leave independent absolute offsets competing with the shared layout.
6. Keep `min-width: 0` and `min-height: 0` on grid/flex children. Use `minmax(0, 1fr)` where appropriate.
7. Match the image surface's top to the text region's top; match its bottom to the final visible text/action boundary. Do not stretch the bitmap itself.

The approved A/B composition uses a 1712 × 584 parent at (104, 384), a 536px media column and a 64px gutter. The remaining 1112px holds two 536px option columns with a 40px gap. This is a reusable pattern, not a license to position each child at its own slide coordinate.

## Audience, notes and evidence

- Keep one main idea per scene and at most one primary action in the audience area.
- Keep the page number quiet. Remove repeated chapter names, image footnotes, verbose status lines, source URLs and multiple competing links from the slide perimeter.
- Place narration, source URLs, measurement definitions and detailed qualification in the linked notes/evidence pages.
- Retain the shortest necessary context on the slide: for example, “Illustrative comparison,” “Demo in preparation,” or “Customer outcomes reported by Patrick.” Removing clutter must not turn a proposed experience into an apparent live product or a reported result into an independently verified claim.
- Link a live demo only when its URL and behavior have been verified. Otherwise use an explicitly labeled plan or placeholder. Never silently substitute an obsolete artifact.
- Keep promised scope, acceptance and payment conditions precise. A free trial does not imply automatic billing, guaranteed business results or an unagreed production launch.
- Do not copy PAC claims, customer names, trial terms, customer metrics or AI-search observations into another client's deck as template content. Reuse the structure and provide client-specific evidence.

## Reveals and interaction

- Reveals change visibility, not geometry. Hidden content retains its layout space so images, columns and buttons do not jump as a point is revealed.
- Hidden reveal content must also be inaccessible to focus and assistive interaction until shown.
- Check the initial state, every intermediate reveal and the final state. A final screenshot alone does not establish a stable layout.
- Preserve keyboard navigation, scene links, return links, reduced-motion support and the separate presenter controls.

## Revision and release checks

1. **Edit source.** Update content, renderer, shared styles or diagram source; rebuild generated outputs. Do not fix generated HTML alone. Keep one canonical formal version rather than accumulating style forks.
2. **Run structural checks.** Confirm the stage remains 1920 × 1080; active slide fonts resolve to Manrope; no text exceeds its container or stage; related columns share the intended widths and boundaries; links and asset references resolve.
3. **Measure alignment.** For paired media/text, compare DOM rectangles at initial and final reveals. Target top and bottom deltas of 0 authored pixels; allow at most 1 rendered pixel for fractional scaling. Include the final action in the bottom comparison.
4. **Inspect screenshots.** Render every scene at 1280 × 720 plus one phone viewport. Inspect overlap, title wrapping, equal heights, whitespace, visual balance and image treatment. Numerical overflow checks do not replace visual inspection.
5. **Check supporting pages.** Verify script, evidence, diagrams and demo plans remain readable and reachable. Confirm necessary source detail survived audience simplification.
6. **Check branding and scope.** Verify original logo assets and unchanged proportions; preserve evidence images and licenses. Confirm separate Website/Sales Workspace artifacts were not modified unintentionally.
7. **Publish the verified build.** Ship the complete linked presentation package to the requested existing destination. Open the public URL and verify the new version, images, navigation and supporting links. Do not report a local preview as a public release.
8. **Record the result.** Save screenshots, alignment/overflow results and the release revision or receipt under the deck's `verification/` folder. Update the deck README to describe the current system and authoring entry points.

If a change cannot fit these rules, revise the content or introduce a documented, reusable composition. Do not solve it with smaller ad hoc type, extra footnotes or another layer of per-page CSS overrides.
