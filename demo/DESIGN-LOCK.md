# PAC guided demo — design and production lock

This demo extends the application direction explicitly accepted by the user. Its visual authority is [application/DESIGN.md](../application/DESIGN.md), the shared [PAC tokens](../brand/pac-tokens.css), and the approved [production script](../docs/product/demo-production-2026-11-09/script.json).

The historical `website/`, old `src/` UI and withdrawn `site/` experiment are not visual or implementation baselines. Shared branding does not authorize reconnecting the Website and Sales Workspace.

## Reference responsibilities

The approved direction draws its operational structure from Mercury’s financial editor: readable itemization, right-aligned amounts, clear editing versus output, and an explicit save. Linear contributes compact navigation, quiet metadata and a conversation attached to the work. The recorded references and the decisions rejecting Mercury’s marketing pill/dark-hero direction are in `application/DESIGN.md`.

The Website and Customer Proposal share a PAC customer-facing family: original logo, useful equipment photography, strong application headings, restrained navigation and clear next actions. Workspace keeps its operational shell and denser financial information. The demonstration controls are a separate host layer.

## Tokens and role rules

| Element | Commitment |
| --- | --- |
| UI typography | Inter, locally served, with system sans fallback. Weights 400/500/600/700. Financial figures use tabular numerals. |
| Working canvas | White; pale neutral regions distinguish navigation, equipment references and supporting context. |
| Body and supporting text | Charcoal `#20272d`; supporting `#626c75`. Maintain readable contrast and real hierarchy. |
| PAC blue | `#2360a4` for functional links, active navigation and internal primary actions; darker `#194e86` for interaction feedback. |
| PAC orange-yellow | `#f5ac0b` with dark text for customer actions, publication and the host Next control. It is not a default text color. |
| Rules and supporting surfaces | `#e6e9ec` separators; `#f4f6f7` neutral surface; `#eaf1f8` restrained functional selection. |
| Geometry | Straight structural regions. Inputs and buttons may use a radius up to 3 px. No rounded card outlines, inset selected rails or decorative hairlines. |
| Spacing | A 4/8 px rhythm, consistent working gutters and paired image/content alignment. |
| Brand artwork | Official colored PAC logo remains unchanged, at its natural aspect ratio, with enough contrast for the gray tagline. |

The Website uses the shared tokens and its own stylesheet. Workspace loads the existing application CSS foundation before its scoped additions. Do not import old Website styles to recreate the prior pages. The current PDF generator uses a separate print layout and PDF-compatible sans fonts; it must retain the same readable hierarchy, itemization, contrast and PAC brand treatment.

## Page and interaction principles

**One visible job per scene.** The preset action must create the result Patrick is describing. A configuration scene explains an option; review checks the saved scope; publication produces a fixed customer version. Do not compress save, approval and publish into an invisible all-purpose action.

**Keep the machine and explanation together.** Product-topic selection changes both the explanation and the photo focus. Preserve useful context into the Website inquiry and within a Deal’s Explorer. A captured finding is internal evidence, not a priced option or an issued customer drawing.

**Use financial structure for financial decisions.** Align equipment/service names, quantity and prices; keep totals and differences unambiguous. A/B are alternatives, Rev 0/1 are quote revisions, and V1/V2 are published Proposal versions. Do not use these labels interchangeably.

**Finish supporting states.** Required-information warnings, missing engineering inputs, saved state, approval state, publishing result, PDF loading/failure, image fallback and customer-question context are designed surfaces, not console-only behavior. Only show a receipt after persistence succeeds.

**Customer views remain customer views.** Use their application, equipment explanation, options, version-bound documents and conversation. Do not show private cost breakdowns, approval fingerprints, working drafts, internal findings or sales navigation in the Proposal.

**Make uncertainty useful.** The customer’s production target, unconfirmed bag dimensions, sample price date, illustrative planning time and sample-review condition belong beside the related decision. Keep engineering implementation notes and rehearsal instructions in presenter/documentation views rather than filling the audience page with warnings.

**Next is the presentation control.** It sits consistently outside the artifact and stays visible. Disable advancement while a scene is preparing; surface an actionable error if it fails. Actual page controls remain usable, but the next preset intentionally restores the agreed storyline.

## Images, video and Explorer

Use the official logo and the original PAC photographs from `application/assets`, with provenance in [application/ASSET-SOURCES.json](../application/ASSET-SOURCES.json). Give media stable dimensions, descriptive alt text and a clear model/option label. Do not stretch an image to fill a mismatched column, recolor the logo or fabricate an exact configured assembly.

The R3200 operation video is a base-machine manual-loading reference. It does not establish the exact installed options or custom-guide geometry. A visible photograph/source fallback must remain usable if playback fails. Keep external media out of the control path for pricing, saving or publication.

The main Explorer is photo-based and stays in the Deal. A separate 3D capability insert requires an explicit reference label until approved PAC CAD exists. Browsing or choosing a part never adds an option, changes a price or approves fit.

## Independence and reuse

The Website has its own inquiry data and receipt. Workspace has its own prepared Deal, quotes, comments and findings. The host stores scene IDs and control state only. A06 names the narrative change of role; it does not transfer the Website record.

Reuse tokens, original assets, UI patterns and domain modules. For a different customer demo, create a separate scenario, data namespace, price/source ledger, media map and script. Do not copy an old final screenshot or a previous customer’s configuration as the new product truth.

When the script changes, review the affected state transition, narration, amounts, version history, media and subsequent steps together. A visual improvement must not weaken the underlying guardrails or change the independence boundary.

## Visual acceptance checklist

Before delivery, inspect the actual rendered screens at presentation size and a narrow viewport. This is a checklist, not a record that the checks have passed.

- Headers, images, forms, quote rows and paired columns have deliberate shared alignment and spacing.
- Main action, saved/blocked state and next visible result are easy to identify.
- Body and supporting text remain legible; brand accents do not replace hierarchy or reduce contrast.
- Long company names, questions, prices and scope notes wrap without overlap or clipped controls.
- No rounded outline cards, decorative status rails, unnecessary blue prose or yellow body copy have appeared.
- Official logos retain their original colors, proportions and readable tagline.
- Images and videos are correct for the described model or option; unverified scope is not disguised as exact geometry.
- Keyboard focus is visible, forms have labels and touch controls are usable. Reduced-motion preferences are respected.
- Next remains available without competing with artifact content; notes are separate from the audience view.
- A/B, revision, publication version, sample price basis and the visible PDF agree at every relevant step.
