# Sales workspace rehearsal — November 7, 2026

This record covers the connected sales-workspace implementation. Earlier discovery-demo evidence is historical and is not counted as verification of this build.

## Automated verification

`npm test` passed 83 checks: 29 catalog, 12 photo/requirements, 10 deal-Explorer, 6 parent-navigation, 22 sales-domain and 4 static-export checks. The static build includes 557 runtime files; its deployment-path audit reported zero errors.

## Actual Chrome rehearsal

- Started on the customer proposal, compared the two issued alternatives and recorded feedback against an issued quote revision.
- Opened the same deal, revised Alternative A, added Easy Load Bag Opener with its required Seal Flattener Fingers, and verified the required companion could not be removed independently.
- Created an unpriced engineering request as Sales. Missing pricing blocked issue. Engineering entered four hours and $250 of materials at the illustrative $150/hour rate, producing an $850 add-on. Clearing hours restored the pending-price blocker.
- Changing the labor rate cleared prior reviews. An engineering-role attempt to approve the manager review was rejected. A special-order item and discount required manager review.
- Captured Connecting rod in the real reference Explorer, attached it to the same quote, left the route, reopened the evidence and restored the saved view. A later check verified that Play one cycle preserves the selected component for capture.
- Completed reviews and issued Alternative A Rev 1 at $41,860: $40,810 catalog configuration + $850 engineering + $300 special order − $100 discount. The original Rev 0 remained $33,060. This expanded QA scenario is separate from the simpler $34,495 presenter-guide example.
- The revised proposal showed the issued total, discount and captured 3D preview. Customer comments remained bound to the earlier revision; an earlier preference cleared when that alternative was reissued.
- Created a second illustrative deal, saved its next action, created its first quote, then imported a catalog configuration as another unapproved alternative under that same deal.
- Exported and parsed a JSON workspace backup containing deals, quotes, revision history and evidence. Export uses the browser's native Save dialog when enabled.
- Native Chrome Save as PDF completed and returned to the application. Print pagination received a separate visual review.
- Inspected proposal, workspace, deal, quote and Explorer at desktop and 390-pixel mobile viewport sizes. Proposal, quote and Explorer had no horizontal page overflow; wide working tables retain internal scrolling.

## Scope of acceptance

This is a browser-local demonstration, not production or PAC business acceptance. Tests do not establish physical-device performance, all-browser coverage, authenticated permissions, CRM integration, cross-device collaboration or PAC engineering approval. The 3D reference assembly is not PAC CAD. All named sample customers and engineering estimates are illustrative.

Local screenshots, native PDF samples, the JSON backup and presenter-material QA records are retained in `outputs/evidence/sales-workspace/` and `work/sales-workspace-materials/`, outside the public runtime.
