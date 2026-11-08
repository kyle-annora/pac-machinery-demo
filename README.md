# PAC Website and Sales Workspace

Two independently usable English-language products in one repository:

- **Website**: equipment discovery, 13 Rollbag product pages, solutions, photo/qualified 3D Explorer, resources and an independent inquiry receipt.
- **Sales Workspace**: authenticated deals, quote alternatives, engineering and commercial review, immutable issued revisions, explicit proposal composition and recipient-scoped customer collaboration.

The outer Annora pitch explains the business value of each product. The Website does not create a Workspace deal or require its session. Customer proposals are outputs of the Workspace.

## GitHub Pages

- [Website](https://kyle-annora.github.io/pac-machinery-demo/website/#/)
- [Sales Workspace](https://kyle-annora.github.io/pac-machinery-demo/#workspace)
- [Pitch](https://kyle-annora.github.io/pac-machinery-demo/pitch/?view=present#opportunity)

These public entries are static demonstrations. Website browsing, Explorer and sample quotes work in the browser; workspace changes stay in that browser. Shared customer links, account permissions, catalog administration and inquiry submission require the Node service below. No local database, session, recipient link or inquiry is included in this public repository or the Pages build.

Workspace design follows the approved Mercury composition and Linear interaction details, with neutral text, PAC yellow and the PAC logo. Website uses a separate equipment-led layout and public content projection. WinQuote's visual language is not a design dependency.

## Run locally

Requires Node.js **22.13 or newer** with `node:sqlite` (verified on Node 26). No dependency installation is needed.

```sh
npm start
```

- Website: `http://127.0.0.1:4361/website/`
- Workspace: `http://127.0.0.1:4361/#workspace`
- Customer review: a recipient-specific `/review.html#…` link created from a published proposal.
- Pitch: run `python3 -m http.server 4362 --bind 127.0.0.1 --directory pitch`, then open `http://127.0.0.1:4362/?view=present#opportunity`.

Local test accounts are `sales@pac.demo`, `engineering@pac.demo`, and `manager@pac.demo`, with default password `pac-demo-2026`. They have real server-enforced permissions but are development identities, not PAC SSO. `PAC_DEMO_PASSWORD` customizes passwords when a database is first created. The server binds to loopback only.

The SQLite database is `work/runtime/pac.sqlite`. `PAC_DB_PATH` selects another database; `PORT` changes the port. Existing browser-local workspace records are preserved in browser storage, but are not silently imported as trusted server records.

## Daily workflow

1. Open a deal with a CRM reference; enter application scope, contacts and follow-up.
2. Create or revise an alternative; configure options, required companions, engineering and special orders; explicitly save edits.
3. Review the saved revision with the permitted account. Required review and pricing gaps block issue.
4. Issue a frozen revision. Choose the exact alternatives/revisions in **Prepare customer proposal**, then publish.
5. Create a recipient link for a fixed proposal version. Customer feedback and preference are saved to that version; preference is not acceptance.
6. Start a revision from a change request. Earlier proposals retain their prices, scope and evidence.
7. Inspect/capture a reference in the deal's Explorer. Attachments do not change pricing; review and issue them in a new proposal version.

Catalog administration has a separate Manager draft/review/publish workflow. Publication changes prices for new quotes. Existing drafts require a reviewed repricing preview; issued revisions remain unchanged.

## Persistence and access

The service accepts typed commands with optimistic concurrency and retry identities. A save is acknowledged only after its transaction commits. Failed/conflicting edits remain recoverable. Customer endpoints expose only a public fixed-version projection, with recipient attribution, expiry and revocation. Internal engineering costs and approvals are excluded. Website inquiries have separate storage and do not create deals.

See [service contracts](server/COMMANDS.md), [recovery](server/RECOVERY.md), and the [delivery plan](docs/product/PAC-DELIVERY-PLAN.md).

## Verify and package

```sh
npm test
npm run build
```

The static build includes Website, Workspace and Pitch under `/pac-machinery-demo/`, with explicit static-preview messaging. Source is maintained on `main`; the verified `dist/` output is published through the `gh-pages` branch. GitHub Pages cannot run the SQLite service, authenticate accounts, submit inquiries or host shared recipient review. Run the Node service to demonstrate those capabilities.

Server code, runtime databases, source documents and development evidence are excluded from the static package. Runtime source catalog and licensed media remain included.

## Scope and remaining inputs

The crank-slider is a licensed reference assembly, not PAC/R3200 CAD. Sample customers, CRM references and engineering policy/rates are illustrative. Catalog prices come from supplied PAC source records; they are not a binding offer.

PAC CRM/number authority, SSO, email/approval notifications, the Website receiving channel, signature and payment providers are not connected. Inquiry confirmation states that it is stored locally and has not been emailed. General document uploads, legacy browser-record migration, full user administration and more advanced review routing remain separate delivery packages. See the [implementation receipt](docs/product/PAC-IMPLEMENTATION-RECEIPT.md) for verified paths and remaining work; the complete plan is not being represented as fully delivered.

## Attribution

See [NOTICE.txt](NOTICE.txt) and [Explorer licenses](assets/explorer/LICENSES.txt). PAC product content and branding are not relicensed under the Explorer software license. Upstream Explorer integration is retained in `vendor/annora-explorer/`.
