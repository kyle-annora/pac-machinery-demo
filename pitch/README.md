# Annora for PAC Machinery — local web proposal

8 November 2026

This folder contains the English, seven-chapter Annora-to-PAC proposal: guided presentation, continuous reading view, captured product evidence and downloadable PDFs. It is separate from PAC's Website and Sales Workspace. Product remediation is active; the pitch's existing captures are labeled checkpoint evidence until refreshed from the verified artifacts.

The package is prepared for local review. It has not been published as a public customer follow-up link. Localhost addresses work only on the computer running the server. Hosting, sharing audience and commercial approval must be settled before external use; `noindex` is not access control.

## Open locally

From the repository root:

```sh
python3 -m http.server 4362 --bind 127.0.0.1 --directory pitch
```

Keep the process running while reviewing. If port 4362 is occupied, check the existing process before starting another server; do not stop an unrelated service.

- [Presentation view](http://127.0.0.1:4362/?view=present#opportunity)
- [Reading view](http://127.0.0.1:4362/?view=read#opportunity)
- [Seven-page proposal PDF](http://127.0.0.1:4362/downloads/annora-for-pac.pdf)
- [One-page trial brief](http://127.0.0.1:4362/downloads/pac-trial-brief.pdf)

The pitch server does not start or modify the products on port 4361. Presenter-only product links appear when the pitch runs on localhost and open separate tabs. The local Workspace needs its own running service and authenticated staff session. Captured evidence and PDFs remain usable without that service.

## Present and read

Use **Chapters** to jump to a section, or the previous/next controls to advance. In presentation view, Left/Right or Page Up/Page Down change chapters; Home/End move to the first/last chapter. Proof tabs also support arrow keys and Home/End when focused. **Reading view** shows all chapters continuously; the mode and chapter are reflected in the URL.

Click a captured image to inspect it. Close the image viewer to resume. The fullscreen control uses the browser's supported fullscreen behavior. On narrow screens, the default is reading view and presenter-only product links are hidden.

**Agree the trial brief** reveals the discussion agenda. It does not submit data, activate a trial, sign an agreement or authorize payment. The agenda can be copied, and the trial brief downloaded.

## Content and files

| File or directory | Purpose |
| --- | --- |
| `content.json` | Canonical English chapter copy, proof descriptions/captions, proposed scope, evaluation and commercial content. |
| `pitch.js` | Renders both views from the same JSON; chapter/proof navigation, image viewer and shared interface labels. |
| `pitch.css` | Responsive layout, design tokens, reading/presentation states and browser-print styles. |
| `assets/` | Local logos, Archivo web font, equipment image and captured Website/Workspace proof. |
| `downloads/annora-for-pac.pdf` | Generated seven-page proposal fallback. |
| `downloads/pac-trial-brief.pdf` | Generated one-page trial scope/scorecard. |

The runtime performs one same-origin fetch for `content.json`. Fonts, images, scripts, styles and PDFs are served from this folder. It has no remote API, analytics or external media fetch. The local product links are explicit navigation actions, not a Website-to-Workspace integration.

The core narrative is editable in `content.json`. Small shared interface labels also exist in `pitch.js`; preserve their consistency when changing the narrative. PDF layout copy can include condensed wording, so inspect both generated outputs after commercial/content changes.

Presenter notes and the fuller trial brief live **outside this served folder**:

- [Presenter runbook and scope/acceptance brief](../docs/product/PAC-PITCH-PRESENTER-RUNBOOK.md)
- [Narrative and offer plan](../docs/product/PAC-PITCH-DECK-PLAN.md)
- [Format decision](../docs/product/PAC-PITCH-FORMAT-DECISION.md)

Serve `pitch/`, not the repository root, for this proposal review. The runbook and internal product records are not part of the pitch download package.

## Rebuild the PDFs

The generator is [scripts/generate-pitch-pdf.py](../scripts/generate-pitch-pdf.py). From the repository root, with the required Python libraries available:

```sh
python3 scripts/generate-pitch-pdf.py
```

It reads `pitch/content.json` and writes the two PDFs under `pitch/downloads/`, with a content hash and extraction checks under `output/pitch-2026-11-08/pdf/`. It expects ReportLab, Pillow, svglib and pdfplumber. The required Archivo TTF files are bundled in `pitch/assets/fonts/`; regeneration does not depend on the original brand-study folder.

Regeneration is not visual acceptance. Render and inspect every page for fit, readable captures, the price/source qualifications and unchanged commercial wording. The downloadable PDFs are deliberately composed outputs, not a claim of fully editable PowerPoint export. Browser printing is a separate fallback and should be inspected if used.

## Requirements-aligned revision

Chapters 1, 2 and 7 now center the two current artifacts. Chapter 1 uses an accurately labeled crop of the current published proposal alternatives and a selectable current Website buyer view. It does not present the old `review.html` interface as a new customer portal. Chapter 2 prioritizes the Sales Workspace trial. Chapter 7 pairs standard/engineering/customer-decision cases with acceptance criteria and ongoing-use value. Chapters 5 and 6 and the downloads carry the same revised scope.

The free working trial is the latest Annora proposal, not PAC acceptance of a changed agreement. Before Day 1, approved prices/rules/lead times, users, access, review roles and a suitable customer-review path must be ready. See [the requirements alignment](../docs/product/PAC-REQUIREMENTS-ALIGNMENT.md) for product gaps and release gates.

`refinement.css` contains the bounded visual changes. `assets/current-website.png`, `current-workspace.png`, and `current-proposal-content.png` were captured at the earlier product checkpoint. The proposal image is a content crop from the seller presentation; independent customer access uses a recipient-scoped link. The current recipient implementation is separate from this captured image, and no token-bearing review URL is included in the pitch.

## Recorded starting proof

An earlier read-only live preflight on 8 November recorded the authenticated seller presentation at `http://127.0.0.1:4361/#present/deal-pac-demo`. Recheck it before the meeting; this is not a fresh post-remediation browser result:

- Current latest and only published proposal: **V1**.
- Alternative A: **Rev 0, $33,060**.
- Alternative B: **Rev 0, $40,810**.
- **Back to deal** opens the same deal with two issued alternatives; **Create revision** is available.
- No mutation was performed. This does not verify a new revision/publication or independent recipient access.

The saved-revision and V2 images are labeled **captured rehearsal**. Their **$40,810 → $41,940** change, including a **$1,130 Spare Parts Kit**, is recorded sample evidence, not today's current published state or an Annora subscription price. Recheck the actual fixture/catalog before a live mutation walkthrough.

`assets/website-explorer.png` was refreshed from the current homepage. Its selected-part text is neutral gray (`#B9BDBB`), verified on the actual page. The reference mechanism remains visibly qualified as **not PAC CAD**.

## Visual system in this implementation

| Role | Current token or treatment |
| --- | --- |
| Typeface | Self-hosted Archivo, weight range 400–900; strong neutral headings, quieter explanatory text. |
| Paper / ink | `#FFFFFF` / `#202321`. |
| Secondary text | `#626864`; body copy stays neutral. |
| Dividers / pale surface | `#DCE0DC` / `#F3F5F3`. |
| Dark emphasis surface | `#1B1E1C`, with light text. |
| PAC emphasis | `#F6AC12` for a meaningful focus, selection or action. |
| Keyboard focus | `#245C9B`. |
| Page measure / spacing | Chapter max-width 1600px; horizontal spacing `clamp(24px, 4.2vw, 72px)`; simple aligned columns with restrained dividers. |
| Responsive behavior | Stacked reading/proof layouts below 700px; compact laptop-height rules; reduced-motion support. |

The seven chapters are opportunity, priorities, buyer experience, sales workspace, trial scope, evaluation and continuation. Product screenshots preserve their own UI typography and factual captions. No lifecycle area represents a promise that six Annora application modules are delivered.

## Commercial and sharing checks before customer use

The confirmed frame is **two weeks free**, followed by paid use only after mutual written confirmation of scope, price and support; **no automatic charges**. The trial begins after the agreed environment, access, source cases and participants are ready.

Patrick still needs to confirm the proposed price/pricing basis, billing interval, included users and catalog coverage, support/maintenance allowance, separately scoped implementation, and trial-data export/retention/access terms. The proposal explicitly keeps those decisions open. Do not insert historical indicative prices or infer unlimited development.

The Website is a separate review preview unless included expressly. Current proof does not establish deployed PAC CRM, SSO, email delivery, signatures, payments or an approved PAC CAD model. A local presentation or a successful scorecard is not authorization to start billing.

## R11 content alignment

Chapters 1, 2 and 7 retain their visual composition. The opening now explicitly identifies the two independent local demos. The comparison explanation focuses on shared scope, extra options and their price difference. Trial work includes a saved quote/PDF, engineering and special-order conditions, returned work being resubmitted, authorized review, feedback and fixed earlier versions. Customer next decisions and internal sales follow-up are distinct.

The continuation wording in the page, copied agenda and downloadable PDFs uses the same content source: **two weeks free; paid use begins only after both parties confirm scope, price and support in writing; no automatic charges**. Downloads were regenerated and all eight PDF pages rendered and inspected. This verifies the pitch documents only. Current web-page acceptance remains separate; no artifact PDF, browser journey or PAC integration is accepted by the pitch PDF result.

See [R11 evidence and remaining checks](../docs/product/PAC-PITCH-REMEDIATION-ALIGNMENT.md) for the 112-row checklist split and the remaining product/browser/PDF work.

Before sharing beyond the local review, confirm the audience, evidence suitability, readable PDF output and real hosted access. Do not publish internal credentials, staff-session links, confidential customer information or unapproved pricing. Do not call a localhost URL a customer follow-up link.
