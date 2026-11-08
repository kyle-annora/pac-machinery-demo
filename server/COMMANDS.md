# Local PAC service contract

The development server binds to loopback only. Its seeded accounts use password `pac-demo-2026` unless `PAC_DEMO_PASSWORD` is set when a database is first created. Accounts: `sales@pac.demo`, `engineering@pac.demo`, `manager@pac.demo`. These are test identities, not PAC SSO.

`GET /api/session` returns `{user, mode, accounts}`. `POST /api/login {email,password}` establishes an HttpOnly session. `POST /api/logout {}` ends it.

`GET /api/workspace` returns `{state,version,user}`. All mutations use `POST /api/workspace/commands {command,args,expectedVersion,requestId}` and return `{state,version,result,user}`. A stale version returns 409 with code `VERSION_CONFLICT`; reload before reconciling retained edits. A repeated requestId with the same payload replays its result against the current state. A requestId cannot be reused for a different command.

Common args are `dealId` and `quoteId` where relevant.

| command | Additional args |
| --- | --- |
| createDeal | input |
| createDemoScenario | none |
| updateDeal | input (or patch) |
| updateScope | input (or scope) |
| addQuote | input |
| importDraft | savedDraft, label |
| selectOption | rowIndex, options? |
| removeOption | lineId |
| setQuoteQuantity | lineId, quantity |
| setLinePriceOverride | lineId, input: {price_usd, reason} |
| clearLinePriceOverride | lineId, input: {reason} |
| saveQuoteEdit | entry (version/dealId/quoteId/base/working). Only configuration lines and editor_note may change; source rows are rebuilt on the server. |
| saveEngineering | input |
| removeEngineering | itemId |
| setLaborRate | rate |
| saveSpecial | input |
| removeSpecial | itemId |
| updateDiscount | input |
| reviewQuote | kind |
| issueQuote | none |
| reviseQuote | note |
| addEvidence | input |
| addComment | input (author attributed to signed-in actor) |
| recoverLegacyComment | input (author attributed to signed-in actor) |
| chooseAlternative | proposalId |
| publishProposal | manifest? (array of {quote_id,revision}) |
| recordCustomerResponse | input (seller preview attribution, not arbitrary author identity) |
| reviseFromResponse | responseId, quoteId? |

Additional domain operations: renameQuote `{label}`, duplicateQuote `{label}`, markProposalPresented `{proposalId}`, replyToResponse `{responseId,input}`, setResponseStatus `{responseId,status,reason}`, updateContacts `{contacts}`.

Selling-price permissions are an explicit **demo assumption pending PAC confirmation**: Sales or Manager may set a standard catalog base/option unit price at or above the catalog basis; only Manager may set it below that basis. Engineering has no permission for this operation. Included features, service lines, unresolved prices and engineering-review lines are excluded. Both set and reset require a reason and an editable revision on the current catalog basis. Below-catalog prices also require a Manager review before issue. Changes invalidate all draft reviews; issued revisions and the authoritative catalog remain unchanged.

The internal line retains `price_usd` as its catalog basis. `selling_price_override` contains the actual selling unit price, basis/unit, reason, role, timestamp and authenticated actor; `selling_price_history` preserves set/reset events. Configuration saves cannot change these fields and preserve server-owned values. Published customer lines contain only the final selling price, never this internal metadata or the original source-price text for an overridden line. Catalog reconciliation previews an `override_reset` change and restores the new catalog price; it never carries an old negotiated amount silently onto a new basis.

`POST /api/shares {dealId,proposalId,recipientName,recipientEmail?,expiresInDays?,requestId}` returns a fixed-proposal scoped link `{id,token,url,expiresAt,...}`. The URL is `/review.html#TOKEN`. `GET /api/shares?dealId=ID` lists metadata without bearer tokens. `DELETE /api/shares/ID` revokes it.

`GET /api/customer/TOKEN` returns `{proposal,recipient,share}` only. `POST /api/customer/TOKEN/responses {kind,body,quote_id?,requestId}` adds version-bound feedback. `POST /api/customer/TOKEN/preference {quoteId,requestId}` records preference, not acceptance. Customer author identity is taken from the issued recipient link. Links are bearer access and should be issued separately for separate reviewers.

`POST /api/inquiries {requestId,productId?,name,company,email,phone?,application,bagDimensions?,targetThroughput?,loadingMethod?,message?,reference?}` stores an independent website inquiry and returns `{id,reference,status:'received',delivered:false,receivedAt,message}`. It does not create a deal or email PAC. Retry the same requestId/payload safely.

An optional inquiry `reference` accepts only `{productId,title,note,source,preview?,photo?,inspection?}`. Photo URLs must match source catalog media; captured previews are PNG/JPEG/WebP data URLs up to 120,000 characters. Inspection metadata is validated with the same bounded schema as the embedded Explorer. The entire reference is capped at 300,000 characters and inquiry request bodies at 512 KiB. These are reference assemblies or source photographs, not approved PAC CAD or commercial attachments.

See [RECOVERY.md](RECOVERY.md) for consistent local SQLite backup, validation and non-overwriting recovery.

The SQLite file defaults to `work/runtime/pac.sqlite`; `PAC_DB_PATH` overrides it. `GET /api/health` identifies the service and development mode. Static serving excludes runtime, source documents, tests, server code and hidden files.

## Catalog administration

`GET /api/catalog` (staff) returns `{catalog,version,draft,history,changes}`. Workspace clients use this published catalog; Website continues to use its independent source catalog. `POST /api/catalog/commands {command,args,expectedVersion,requestId}` requires Manager role. Commands: `startDraft {label?}`, `saveDraft` with exactly one of `{line:{item_id,price_usd?,included?,requires_option_ids?}}`, `{terms:{machine_id,text,min_weeks?,max_weeks?}}`, `{adjustment:{machine_id,percent}}`; `reviewDraft {}`, `publishDraft {}`, `discardDraft {}`. Edits invalidate catalog review. Publication updates the active Workspace catalog, not issued quotes.

`GET /api/quotes/DEAL/QUOTE/reprice` returns `{dealId,quoteId,revision,catalogVersion,catalogHash,previousCatalogHash,changes,totalBefore,totalAfter,approvalsWillReset}` for a draft. Applying requires workspace command `repriceQuote {dealId,quoteId,acceptedCatalogVersion}` with the current workspace expectedVersion. New required options and terms are included in the preview; issued quotes require a new draft revision first.
