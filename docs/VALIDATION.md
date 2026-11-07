# Mr Winter alignment rehearsal — November 7, 2026

This record covers the Mr Winter workspace alignment. Earlier sales-workspace evidence is preserved separately and is not presented as verification of the revised interface.

## Automated verification

`npm test` passed 89 checks: 29 catalog, 12 photo/requirements, 10 deal-Explorer, 6 parent-navigation, 22 sales-domain, 6 sales-controller and 4 static-export checks. The static build includes 566 runtime files; its deployment-path audit reported zero errors.

The new controller tests run the actual UI handlers and domain against rendered form fields. They cover unsaved edits blocking review/issue, removal of edited requirements, hidden-price retention, prevention of duplicate new requirements, selected alternative persistence, and customer comments remaining bound to their original issued revision.

## Actual Chrome rehearsal

- Inspected the Mr Winter reference shell and its current Workbench source. PAC uses the same sidebar/topbar proportions, compact operational typography, category tabs and document-with-feedback structure, with PAC branding.
- Opened the proposal, switched A/B/Compare, inspected source pricing, then opened the same deal. Sales hub supports both Deals and Quotes tables.
- Created B Rev 1 from the issued $40,810 Rev 0. Entered an engineering request, switched tabs and reloaded: unapplied text remained. Review/issue stayed blocked until saving.
- Entered four labor hours and $300 materials at the illustrative $150/hour rate. Hiding prices and switching tabs retained the values; saving produced a $900 add-on and $41,710 total.
- Opened Explorer from B, captured Slider carriage, added a discussion note and attached its actual view to the same quote/deal. Collapsing the shell preserved the live component selection.
- Completed application and engineering reviews, switched to Sales, and issued B Rev 1 at $41,710. The customer proposal showed the new issued total and captured evidence. B Rev 0 remained $40,810; A remained $33,060. This QA scenario is separate from the presenter guide's $34,495 example.
- Revisited the deal and reloaded: Configure retained Alternative B. Search found the deal by customer name and navigated to it.
- Inspected proposal and configuration at 390px wide: no horizontal page overflow. The navigation drawer moved focus to its close control and closed after selecting Configure. Wide tables scroll within their own containers.
- The inspected local browser console reported no errors after the final reload. Same-route updates preserve the internal scroll container; actual route navigation resets it.

## Materials and print boundary

The English presenter guide was updated to the exact A/B/Compare, Your feedback, Sales hub and quote-tab labels. All four rendered guide pages were visually checked. The two-page decision sheet remains unchanged from its previously verified version.

The complete issued proposal remains in a separate print projection, with the new application shell and feedback rail excluded by print CSS. Native print verification for this alignment was interrupted by concurrent browser interaction; no newly validated native proposal PDF is claimed. Earlier native PDF samples are historical evidence only.

## Scope of acceptance

This is a browser-local demonstration, not production or PAC business acceptance. Tests do not establish physical-device performance, all-browser coverage, authenticated permissions, CRM integration, cross-device collaboration or PAC engineering approval. The 3D reference assembly is not PAC CAD. All named sample customers and engineering estimates are illustrative.

Current local screenshots, previous release records and presenter-material QA are retained in `outputs/evidence/winter-alignment/` and `work/winter-guide/`, outside the public runtime.
