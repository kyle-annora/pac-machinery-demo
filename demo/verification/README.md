# Guided demo verification — November 9, 2026

## Accepted scope

The approved two-act script is implemented at `/demo/` on the repository-root HTTP server, port 4363. Website inquiries and the prepared sales Deal remain independent. The runner stores control state only. Existing reviewed `application/` data is not read or overwritten by the rehearsal.

## Executed checks

- **40/40 main steps** traversed through the visible Next button from a clean named run. Every step reached its correlated completed URL. See [browser-main-flow.json](browser-main-flow.json).
- **H01–H04** application-led inquiry traversed through Next, followed by the explicit A06 perspective change. No model was silently assigned.
- Act B started independently with its prepared V1 and customer question.
- Refresh at B10 restored the review checkpoint; B11/B12 subsequently approved and published V2.
- Separate English presenter window followed the current step; its Next command advanced the audience window.
- A duplicate host tab for the same run was blocked with an independent-run option.
- Actual manual controls were exercised: removing fingers disabled approval/publication; saving a $700 customer add-on produced $41,510, independently of the $500 internal estimate. Next restored the agreed $500/$41,310 fixture.
- Actual review checklist now reflects missing option or planning inputs instead of showing unconditional green checks.
- V1 retained B Rev 0 / $40,810 / six illustrative weeks after V2 used B Rev 1 / $41,310 / seven weeks. The reply is a separate action after publication.
- A23 displayed actual generated PDF bytes through PDF.js. A/B PDF tabs and extracted accessible text worked. V2 PDF text showed its $500 allowance, $41,310 subtotal and seven-week planning time without internal labor/rate/material inputs.
- Both generated PDFs were rendered with Poppler and all four pages visually inspected. No clipping or overlapping content found.
- Official PAC operation video playback was observed at A22. Photo fallback and source link remain available; external playback depends on the network.
- Closing scene states two weeks free and mutual agreement before paid continuation. Its Previous button returns to B16. Return-to-pitch targets the baseline section before proof/trial.
- Final browser console check returned no application errors.

## Automated domain verification

Command:

```sh
node --test application/domain.test.mjs application/deal-domain.test.mjs demo/scenario.test.mjs demo/website-domain.test.mjs
```

**43 tests passed, 0 failed.** Coverage includes actual required-information and option gates; saved/review fingerprints; immutable publications; explicit engineering unknowns; independent estimate and selling price; contextual comments/findings; deterministic replay; Website inquiry validation and idempotent receipts.

## Visual inspection

Primary presentation size: **1280 × 720**, with a 644 px artifact area above the host controls. Quote configuration, estimate inputs, totals, timing and customer A/B comparison are visible in that working area. Final B16 displays quote versions, latest contact, current Proposal and owned next action. A04 displays the actual customer question alongside the missing bag dimensions.

Narrow **390 × 844** PDF/customer layout was also observed. This was a focused narrow-screen check, not a complete mobile-device acceptance run.

Selected screenshots:

- [Website](A01.png)
- [Inquiry review](A04.png)
- [Quote builder](A13.png)
- [Published offer](A20.png)
- [Actual PDF](A23.png)
- [Explorer finding](B04.png)
- [Engineering estimate](B08.png)
- [Customer Proposal V2](B14.png)
- [Sales follow-up](B16.png)

## Demonstration limits

Local browser persistence only. No live inquiry delivery, CRM sync, SSO, cross-device publication, signature, payment or manufacturing-order integration was exercised or claimed. All customer identities, engineering inputs and planning times are illustrative. The price basis is dated January 29, 2025. The main Explorer uses PAC photographs; no approved PAC CAD or custom-guide drawing is represented. Guided Next reconstructs a preset checkpoint; manual exploration does not change the approved script.

No remote deployment was performed in this implementation pass. The reviewed application and pitch remain separate from the new demo runner.
