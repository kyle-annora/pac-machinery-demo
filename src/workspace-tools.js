import * as S from './sales-domain.js';
import { engineeringTriggers } from './workspace-review-context.js';
import { requestJSON } from './workspace-service.js';

const esc = input => String(input ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const money = input => Number.isFinite(input) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(input) : 'Price pending';
const date = input => input ? new Date(input).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded';
const name = machine => machine.title?.text || machine.machine_id;
const rowKey = row => row.item_id || `${row.machine_id}|${row.option_id || row.line_id || row.name}`;
const kindName = kind => ({ application: 'Application', engineering: 'Engineering', manager: 'Manager' })[kind] || kind;
const actorCanReview = (role, kind) => ['sales', 'engineering', 'manager'].includes(role) && (role === 'manager' || kind === 'application' || kind === 'engineering' && role === 'engineering');
const reviewMessage = kind => ({ application: 'Application review is required', engineering: 'Engineering approval is required', manager: 'Manager approval is required' })[kind];
const machineOptions = (catalog, selected) => catalog.machines.map(machine => `<option value="${esc(machine.machine_id)}" ${machine.machine_id === selected ? 'selected' : ''}>${esc(name(machine))}${catalog.machines.filter(other=>name(other)===name(machine)).length>1?` · ${esc(machine.machine_id.replaceAll('_',' '))}`:''}</option>`).join('');
const field = (label, input) => `<label class="wt-field"><span>${label}</span>${input}</label>`;
const button = (label, action, attrs = '', primary = false) => `<button type="button" class="${primary ? 'primary' : 'secondary'}" data-tools-action="${action}" ${attrs}>${label}</button>`;
const selectors = state => ({ machine: state.machine || 'r3200', query: state.query || '', tab: state.tab || 'prices', filter: state.filter || 'all', selected: state.selected || null });

export function reviewQueue(catalog, state, user = {}) {
  const result = [];
  for (const deal of state?.deals || []) for (const quote of deal.quotes || []) {
    if (quote.working.status !== 'draft') continue;
    const required = S.requiredReviews(catalog, quote), blockers = S.blockers(catalog, deal, quote);
    const pending = Object.keys(required).filter(kind => required[kind] && S.reviewStatus(deal,quote,kind).status!=='approved');
    const returned = pending.some(kind=>['changes_requested','needs_resubmission'].includes(S.reviewStatus(deal,quote,kind).status));
    const contentBlockers = blockers.filter(reason => !Object.keys(required).some(kind => reason.startsWith(reviewMessage(kind))));
    result.push({ deal, quote, required, pending, returned, blockers: contentBlockers, canReview: pending.filter(kind => actorCanReview(user.role, kind)), total: S.totals(quote) });
  }
  return result.sort((a, b) => a.blockers.length - b.blockers.length || String(b.quote.working.updated_at).localeCompare(String(a.quote.working.updated_at)));
}

export function renderRevisionDiff({ deal, quote, fromRevision, toRevision = 'working' }) {
  let diff;
  try { diff = S.compareRevisions(deal, quote, fromRevision, toRevision); }
  catch (error) { return `<p class="wt-error" role="alert">${esc(error.message)}</p>`; }
  if (!diff.has_changes) return '<p class="wt-empty">No scope or price changes between these revisions.</p>';
  const format = input => input == null ? '—' : Object.entries(input).map(([key, value]) => {
    if (value == null || value === '' || Array.isArray(value) && !value.length) return '';
    const display = typeof value === 'object' ? Array.isArray(value) ? value.map(item => typeof item === 'object' ? item.evidence || item.text || JSON.stringify(item) : item).join('; ') : JSON.stringify(value) : String(value);
    return `<div><span>${esc(key.replaceAll('_', ' '))}</span> ${esc(display)}</div>`;
  }).join('') || '—';
  return `<section class="wt-revision-diff"><div class="wt-section-heading"><h3>Revision ${diff.from_revision} to ${diff.to_revision}</h3><span class="wt-delta">${diff.totals.delta == null ? 'Price change pending' : `${diff.totals.delta >= 0 ? '+' : '−'}${money(Math.abs(diff.totals.delta))}`}</span></div><div class="wt-table-wrap"><table class="wt-table"><thead><tr><th>Change</th><th>Previously</th><th>Now</th></tr></thead><tbody>${diff.changes.map(item => `<tr><td><strong>${esc(item.label)}</strong><small>${esc(item.section.replaceAll('_', ' '))} · ${esc(item.kind)}</small></td><td class="wt-diff-value">${format(item.before)}</td><td class="wt-diff-value">${format(item.after)}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderReviews({ catalog, state, user, toolsState }) {
  const local = selectors(toolsState), all = reviewQueue(catalog, state, user);
  const items = all.filter(item => local.filter === 'mine' ? item.canReview.length : local.filter === 'blocked' ? item.blockers.length||item.returned : true);
  const selected = all.find(item => item.quote.id === local.selected);
  return `<header class="wt-header"><div><h1>Reviews</h1><p>Check application fit, configuration and pricing before a quote is issued.</p></div><span class="wt-summary">${all.length} draft ${all.length === 1 ? 'quote' : 'quotes'}</span></header>
  <div class="wt-toolbar"><div class="wt-segments" aria-label="Filter reviews">${[['all', 'All drafts'], ['mine', 'My role’s reviews'], ['blocked', 'Needs information']].map(([id, label]) => `<button type="button" data-tools-action="review-filter" data-tools-filter="${id}" aria-pressed="${local.filter === id}">${label}</button>`).join('')}</div><span class="wt-muted">Signed in as ${esc(user.name || user.role || 'Sales')}</span></div>
  <div class="wt-layout ${selected ? 'has-inspector' : ''}"><section class="wt-main"><div class="wt-table-wrap"><table class="wt-table"><caption class="sr-only">Quote review queue</caption><thead><tr><th>Quote / customer</th><th>Review needed</th><th class="wt-number">Amount</th><th>Status</th><th></th></tr></thead><tbody>${items.map(item => `<tr ${item.quote.id === local.selected ? 'class="is-selected"' : ''}><td><strong>${esc(item.quote.label)}</strong><small>${esc(item.deal.customer)} · Rev ${item.quote.working.revision}</small></td><td>${item.pending.map(kindName).join(', ') || 'Reviews complete'}</td><td class="wt-number">${money(item.total.total)}${item.total.pending ? '<small>Preliminary</small>' : ''}</td><td><span class="wt-status">${item.returned?'Returned to owner':item.blockers.length ? 'Needs information' : item.pending.length ? 'Ready for review' : 'Ready to issue'}</span></td><td>${button('Review', 'open-review', `data-quote="${esc(item.quote.id)}" aria-label="Review ${esc(item.quote.label)}"`)}</td></tr>`).join('') || `<tr><td colspan="5"><div class="wt-empty"><strong>${all.length ? 'No quotes match this filter.' : 'No draft quotes need review.'}</strong><p>${all.length ? 'Try All drafts to see the full queue.' : 'New and revised quotes will appear here.'}</p><a href="#workspace">Open deals</a></div></td></tr>`}</tbody></table></div></section>
  ${selected ? renderReviewInspector(catalog,selected,user) : ''}</div>`;
}

function renderReviewInspector(catalog,item,user) {
  const {deal,quote}=item,w=quote.working,baseline=quote.revisions.filter(r=>r.revision<w.revision).at(-1);
  const diff=baseline?S.compareRevisions(deal,quote,baseline.revision,'working'):null;
  const triggers=engineeringTriggers(catalog,quote);
  return `<aside class="wt-inspector" aria-label="Review details" tabindex="-1"><div class="wt-section-heading"><h2>${esc(quote.label)}</h2>${button('Close', 'close-inspector')}</div><p class="wt-muted">${esc(deal.customer)} · Rev ${w.revision}</p><h3>Application</h3><p>${esc(deal.scope.application||'Application not recorded.')}</p><dl class="wt-facts"><div><dt>Bag size</dt><dd>${esc(deal.scope.bag_dimensions||'Missing')}</dd></div><div><dt>Target rate</dt><dd>${esc(deal.scope.throughput||'Missing')}</dd></div><div><dt>Quote owner</dt><dd>${esc(deal.owner)}</dd></div></dl><section class="wt-review-basis"><h3>Configuration to review</h3><ul>${w.draft.lines.map(line=>`<li>${esc(line.name)} <span>× ${line.quantity}</span>${line.requires?.length?`<small>Requires ${esc(line.requires.map(ref=>ref.target).join(', '))}</small>`:''}</li>`).join('')}</ul>${triggers.length?`<h3>Engineering conditions</h3><ul>${triggers.map(trigger=>`<li><strong>${esc(trigger.name)}</strong><small>${esc(trigger.reason)}</small></li>`).join('')}</ul>`:''}${w.engineering.length?`<h3>Custom engineering</h3><ul>${w.engineering.map(request=>`<li>${esc(request.description)}<small>${esc(request.reason)}</small></li>`).join('')}</ul>`:''}${diff?`<h3>Changes from Rev ${baseline.revision}</h3><p>${diff.has_changes?`${diff.changes.length} changes · ${Number.isFinite(diff.totals.delta)?`${diff.totals.delta>=0?'+':''}${money(diff.totals.delta)}`:'Price pending'}`:'No scope or price changes.'}</p><ul>${diff.changes.slice(0,8).map(change=>`<li>${esc(change.label)} <small>${esc(change.kind)}</small></li>`).join('')}</ul>`:'<p class="wt-muted">Initial configuration; no issued baseline.</p>'}</section>${item.blockers.length?`<div class="wt-blockers"><h3>Complete before approval</h3><ul>${item.blockers.map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul></div>`:''}<a class="wt-quote-link" href="#quote/${esc(deal.id)}/${esc(quote.id)}/working">Open complete quote and evidence →</a><div class="wt-review-actions">${item.pending.map(kind=>{
    const review=S.reviewStatus(deal,quote,kind),returned=['changes_requested','needs_resubmission'].includes(review.status),canReview=actorCanReview(user.role,kind);
    return `<section><strong>${kindName(kind)} review</strong><p>${returned?'Waiting for the quote owner to resubmit.':review.status==='pending'?'Submitted to the review team.':'Ready for the review team.'}</p><p class="wt-muted">${kind==='application'?'Sales, Engineering or Manager':kind==='engineering'?'Engineering or Manager':'Manager'} role · Not individually assigned</p>${review.reason?`<p class="wt-return-reason"><strong>Requested change</strong><br>${esc(review.reason)}</p>`:''}${review.note?`<p>${esc(review.note)}</p>`:''}<div class="sales-actions">${!['pending','approved'].includes(review.status)&&user.role!=='engineering'?button(returned?'Resubmit review':'Submit review','submit-review',`data-kind="${kind}" data-deal="${esc(deal.id)}" data-quote="${esc(quote.id)}"`):''}${button(`Confirm ${kindName(kind).toLowerCase()}`,'confirm-review',`data-kind="${kind}" data-deal="${esc(deal.id)}" data-quote="${esc(quote.id)}" ${item.blockers.length||!canReview||returned?'disabled':''}`,canReview&&!item.blockers.length&&!returned)}</div>${canReview&&!returned?`<details><summary>Request changes</summary><form data-tools-form="return-review" data-kind="${kind}" data-deal="${esc(deal.id)}" data-quote="${esc(quote.id)}"><label class="wt-field"><span>What must be changed?</span><textarea name="reason" rows="3" required maxlength="2000"></textarea></label><button class="secondary" type="submit">Return to quote owner</button></form></details>`:''}</section>`;
  }).join('')||'<p>All required reviews are complete. Open the quote to issue this revision.</p>'}</div></aside>`;
}

function catalogDifference(base, current) {
  const changes = [];
  for (const row of current.priceLines) {
    const before = base.priceLines.find(item => rowKey(item) === rowKey(row));
    const describe = item => item ? { price_usd: item.price_usd, line_class: item.line_class, requires: (item.requires_option_ids || []).map(ref => ref.target).join(', ') } : null;
    if (JSON.stringify(describe(before)) !== JSON.stringify(describe(row))) changes.push({ machine_id: row.machine_id, label: row.name, before: describe(before), after: describe(row) });
  }
  for (const terms of current.terms) {
    const before = base.terms.find(item => item.machine_id === terms.machine_id)?.lead_time;
    const after = terms.lead_time;
    if (before?.text !== after?.text || before?.min_weeks !== after?.min_weeks || before?.max_weeks !== after?.max_weeks) changes.push({ machine_id: terms.machine_id, label: 'Lead time', before: before || {}, after: after || {} });
  }
  return changes;
}

function renderCatalog({ catalog, user, toolsState }) {
  const local = selectors(toolsState), envelope = toolsState.catalogEnvelope;
  if (toolsState.loading) return '<header class="wt-header"><div><h1>Catalog administration</h1><p role="status">Loading the published catalog and working revision…</p></div></header>';
  if (!envelope) return `<header class="wt-header"><div><h1>Catalog administration</h1><p>The published catalog remains unchanged.</p></div></header><div class="wt-empty"><p>${esc(toolsState.loadError || 'Connect to the workspace service to manage catalog revisions.')}</p>${button('Retry', 'reload-catalog')}</div>`;
  const published = envelope.catalog || catalog, draft = envelope.draft, working = draft?.catalog || published;
  const manager = user.role === 'manager', editable = manager && Boolean(draft);
  const changes = draft ? catalogDifference(published, working) : [];
  const rows = working.priceLines.filter(row => row.machine_id === local.machine && (!local.query || `${row.name} ${row.option_id || ''}`.toLowerCase().includes(local.query.toLowerCase())));
  const selected = rows.find(row => rowKey(row) === local.selected);
  const term = working.terms.find(item => item.machine_id === local.machine)?.lead_time;
  const selectedMachine = working.machines.find(item => item.machine_id === local.machine);
  const versionLabel = published.manifest.origin === 'workspace_admin' ? `Published ${date(published.manifest.published_at)}` : 'Source catalog';
  let main;
  if (local.tab === 'lead-times') main = `<section class="wt-terms"><h2>${esc(name(selectedMachine || { machine_id: local.machine }))}</h2><p>Lead-time terms are copied into new quotes. Existing issued quotes keep their original terms.</p><form data-tools-form="catalog-terms">${field('Lead-time terms', `<textarea name="text" rows="6" maxlength="4000" required ${editable ? '' : 'readonly'}>${esc(term?.text || '')}</textarea>`)}<div class="wt-field-pair">${field('Minimum weeks', `<input name="min_weeks" type="number" min="0" max="520" step="0.5" value="${esc(term?.min_weeks ?? '')}" ${editable ? '' : 'readonly'}>`)}${field('Maximum weeks', `<input name="max_weeks" type="number" min="0" max="520" step="0.5" value="${esc(term?.max_weeks ?? '')}" ${editable ? '' : 'readonly'}>`)}</div>${editable ? '<button class="primary" type="submit">Save lead-time draft</button>' : '<p class="wt-muted">Create a catalog revision with a Manager account to edit.</p>'}</form></section>`;
  else if (local.tab === 'changes') main = `<section><div class="wt-section-heading"><h2>Changes to publish</h2><span class="wt-muted">${changes.length} ${changes.length === 1 ? 'change' : 'changes'}</span></div><div class="wt-table-wrap"><table class="wt-table"><thead><tr><th>Item</th><th>Published</th><th>Draft</th></tr></thead><tbody>${changes.map(change => `<tr><td><strong>${esc(change.label)}</strong><small>${esc(change.machine_id)}</small></td><td>${change.before && 'price_usd' in change.before ? `${money(change.before.price_usd)}<small>${esc(change.before.line_class.replaceAll('_', ' '))}${change.before.requires ? ` · Requires ${esc(change.before.requires)}` : ''}</small>` : esc(change.before?.text || 'Not set')}</td><td>${'price_usd' in change.after ? `${money(change.after.price_usd)}<small>${esc(change.after.line_class.replaceAll('_', ' '))}${change.after.requires ? ` · Requires ${esc(change.after.requires)}` : ''}</small>` : esc(change.after.text || 'Not set')}</td></tr>`).join('') || '<tr><td colspan="3"><p class="wt-empty">No saved catalog changes.</p></td></tr>'}</tbody></table></div>${draft && manager ? `<div class="wt-publication-actions"><p>${draft.review ? `Reviewed by ${esc(draft.review.actor.name)}. Publishing changes the basis for new quotes; historical issued quotes remain unchanged.` : 'Check each change before confirming the catalog review.'}</p>${button(draft.review ? 'Publish catalog revision' : 'Confirm catalog review', draft.review ? 'publish-catalog' : 'review-catalog', changes.length ? '' : 'disabled', true)}</div>` : ''}</section>`;
  else main = `<div class="wt-table-wrap"><table class="wt-table"><caption class="sr-only">Catalog prices and included options</caption><thead><tr><th>Item</th><th>Type</th><th class="wt-number">Unit price</th><th>Required options</th><th></th></tr></thead><tbody>${rows.map(row => `<tr ${rowKey(row) === local.selected ? 'class="is-selected"' : ''}><td><strong>${esc(row.name)}</strong><small>${esc(row.price_unit?.replaceAll('_', ' ') || 'Unit to confirm')}</small></td><td>${esc(row.line_class.replace('catalog_', '').replaceAll('_', ' '))}</td><td class="wt-number">${row.line_class === 'catalog_included' ? 'Included' : money(row.price_usd)}</td><td>${esc((row.requires_option_ids || []).map(ref => ref.target).join(', ') || '—')}</td><td>${button(editable ? 'Edit' : 'Details', 'edit-line', `data-item="${esc(rowKey(row))}" aria-label="${editable ? 'Edit' : 'Inspect'} ${esc(row.name)}"`)}</td></tr>`).join('') || '<tr><td colspan="5"><p class="wt-empty">No items match this search.</p></td></tr>'}</tbody></table></div>`;
  const options = working.priceLines.filter(row => row.machine_id === local.machine && row.option_id && ['catalog_option', 'catalog_included'].includes(row.line_class) && row.option_id !== selected?.option_id);
  return `<header class="wt-header"><div><h1>Catalog administration</h1><p>Maintain prices, option requirements and lead times in a reviewed catalog revision.</p></div>${draft ? `<span class="wt-status">${draft.review ? 'Reviewed draft' : 'Working draft'}</span>` : manager ? button('Create catalog revision', 'start-catalog', '', true) : '<span class="wt-status">Read-only access</span>'}</header>
  <div class="wt-catalog-meta"><span>${esc(versionLabel)}</span>${draft ? `<span>${esc(draft.label)} · ${changes.length} saved ${changes.length === 1 ? 'change' : 'changes'}</span>${manager ? button('Discard catalog draft', 'discard-catalog') : ''}` : '<span>Issued quotes retain their saved prices.</span>'}</div>
  <div class="wt-toolbar"><div class="wt-segments" aria-label="Catalog section">${[['prices', 'Prices & options'], ['lead-times', 'Lead times'], ['changes', 'Change review']].map(([id, label]) => `<button type="button" data-tools-action="catalog-tab" data-tab="${id}" aria-pressed="${local.tab === id}">${label}</button>`).join('')}</div>${local.tab !== 'changes' ? `<label class="wt-inline-field"><span>Machine</span><select data-tools-change="machine">${machineOptions(working, local.machine)}</select></label>` : ''}</div>
  ${local.tab === 'prices' ? `<form class="wt-search" data-tools-form="catalog-search"><label class="sr-only" for="wt-catalog-search">Search catalog items</label><input id="wt-catalog-search" name="query" type="search" value="${esc(local.query)}" placeholder="Search items and options"><button class="secondary" type="submit">Search</button></form>${editable ? `<details class="wt-batch"><summary>Adjust all prices for this machine</summary><form data-tools-form="catalog-adjustment"><p>Apply a percentage to paid items in this draft. Included features and unknown prices are unchanged.</p>${field('Price adjustment (%)', '<input name="percent" type="number" step="0.1" min="-99.9" max="1000" required placeholder="e.g. 3">')}<button class="secondary" type="submit">Apply to draft</button></form></details>` : ''}` : ''}
  <div class="wt-layout ${selected && local.tab === 'prices' ? 'has-inspector' : ''}"><div class="wt-main">${main}</div>${selected && local.tab === 'prices' ? `<aside class="wt-inspector" aria-label="Catalog item"><div class="wt-section-heading"><h2>${esc(selected.name)}</h2>${button('Close', 'close-inspector')}</div><p class="wt-muted">${esc(name(selectedMachine || { machine_id: local.machine }))}</p><form data-tools-form="catalog-line"><input name="item_id" type="hidden" value="${esc(rowKey(selected))}">${field('Unit price (USD)', `<input name="price_usd" type="number" min="0" max="1000000000" step="0.01" required value="${esc(selected.price_usd ?? '')}" ${editable ? '' : 'readonly'}>`)}${selected.option_id && ['catalog_option', 'catalog_included'].includes(selected.line_class) ? `<label class="wt-check"><input name="included" type="checkbox" ${selected.line_class === 'catalog_included' ? 'checked' : ''} ${editable ? '' : 'disabled'}>Included in the base configuration</label>` : ''}${selected.option_id ? editable?`<fieldset class="wt-companions" data-tools-companions><legend>Required companion options</legend><label class="sr-only" for="wt-companion-search">Find companion options</label><input id="wt-companion-search" type="search" data-tools-companion-search placeholder="Find an option"><div class="wt-companion-options">${options.map(row=>`<label class="wt-companion-option"><input name="requires_option_ids" type="checkbox" value="${esc(row.option_id)}" ${(selected.requires_option_ids||[]).some(ref=>ref.option_id===row.option_id)?'checked':''}><span>${esc(row.name)}</span></label>`).join('')}</div><p class="wt-muted">Selected companions are added with this option when configuring a quote.</p></fieldset>`:`<div class="wt-readonly-companions"><h3>Required companion options</h3><p>${esc((selected.requires_option_ids||[]).map(ref=>ref.target||options.find(row=>row.option_id===ref.option_id)?.name||ref.option_id).join(', ')||'None')}</p></div>` : ''}<p class="wt-muted">${editable?'Changes apply after this catalog revision is reviewed and published.':manager?'Create a catalog revision to edit this item. Published prices remain unchanged.':'A Manager maintains catalog prices and required options.'}</p>${editable ? '<button class="primary" type="submit">Save item draft</button>' : manager?button('Create catalog revision','start-catalog','',true):''}</form></aside>` : ''}</div>
  ${envelope.history?.length ? `<section class="wt-history"><h2>Published revisions</h2>${envelope.history.slice(0,6).map(entry => `<div><strong>${esc(entry.label)}</strong><span>${date(entry.published_at)} · ${esc(entry.published_by.name)} · ${entry.changes.length} changes</span></div>`).join('')}</section>` : ''}`;
}

export function renderTools({ view, catalog, state, user = {}, toolsState = {} }) {
  return `<main id="main" class="wt-page" data-tools-view="${esc(view)}"><div class="wt-notice" role="status" aria-live="polite" hidden></div>${view === 'reviews' ? renderReviews({ catalog, state, user, toolsState }) : renderCatalog({ catalog, user, toolsState })}</main>`;
}

export function mountTools({ root, view, catalog, state, user, api, onRefresh = () => {}, notify = () => {} }) {
  let disposed = false, busy = false, pending = null, dirty = false;
  const local = { machine: catalog.machines.some(machine => machine.machine_id === 'r3200') ? 'r3200' : catalog.machines[0]?.machine_id, tab: 'prices', filter: 'all', query: '', selected: null, catalogEnvelope: null, loading: view === 'catalog-admin' };
  const request = api?.request || requestJSON;
  const paint = () => { if (!disposed) { dirty = false; root.innerHTML = renderTools({ view, catalog, state, user, toolsState: local }); } };
  const message = (text, error = false) => { const target = root.querySelector('.wt-notice'); if (target) { target.hidden = false; target.textContent = text; target.classList.toggle('is-error', error); target.setAttribute('role', error ? 'alert' : 'status'); } };
  const load = async () => { local.loading = true; paint(); try { local.catalogEnvelope = await request('/api/catalog'); local.loadError = ''; } catch (error) { local.loadError = error.message; } finally { local.loading = false; paint(); } };
  const catalogCommand = async (command, args = {}) => {
    const signature = JSON.stringify({ command, args });
    const payload = pending?.signature === signature ? pending.payload : { command, args, expectedVersion: local.catalogEnvelope.version, requestId: crypto.randomUUID() };
    pending = { signature, payload };
    try { const response = await request('/api/catalog/commands', { method: 'POST', body: payload }); pending = null; local.catalogEnvelope = response; if (command === 'publishDraft') { catalog = response.catalog; await onRefresh(response, 'catalog'); } return response; }
    catch (error) { if (error.status) pending = null; throw error; }
  };
  const run = async (task, success) => {
    if (busy || disposed) return;
    busy = true; root.setAttribute('aria-busy', 'true');
    const enabled = [...root.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')]; enabled.forEach(button => { button.disabled = true; });
    message('Saving…');
    try { await task(); paint(); message(success); notify(success); }
    catch (error) { message(error.message, true); if (error.status === 409) root.querySelector('.wt-notice')?.insertAdjacentHTML('beforeend', ' <button type="button" class="secondary" data-tools-action="reload-catalog">Reload latest catalog</button>'); }
    finally { busy = false; root.removeAttribute('aria-busy'); enabled.forEach(button => { if (button.isConnected) button.disabled = false; }); }
  };
  const click = event => {
    const target = event.target.closest('[data-tools-action]'); if (!target || !root.contains(target)) return;
    event.preventDefault(); if (busy) return;
    const action = target.dataset.toolsAction;
    if (dirty && ['catalog-tab', 'edit-line', 'close-inspector', 'reload-catalog'].includes(action) && !globalThis.confirm?.('Discard the changes in this form? Saved catalog drafts will be kept.')) return;
    if (action === 'review-filter') { local.filter = target.dataset.toolsFilter; local.selected = null; paint(); }
    else if (action === 'catalog-tab') { local.tab = target.dataset.tab; local.selected = null; paint(); }
    else if (action === 'open-review') { local.selected = target.dataset.quote; paint(); if(globalThis.matchMedia?.('(max-width: 1000px)').matches){const panel=root.querySelector('.wt-inspector');panel?.scrollIntoView({block:'start'});panel?.focus({preventScroll:true});} }
    else if (action === 'edit-line') { local.selected = target.dataset.item; paint(); }
    else if (action === 'close-inspector') { local.selected = null; paint(); }
    else if (action === 'reload-catalog') load();
    else if (action === 'submit-review') run(async()=>{if(!api?.command)throw new Error('Connect to the workspace service before submitting.');const result=await api.command('submitQuoteReview',{dealId:target.dataset.deal,quoteId:target.dataset.quote,kind:target.dataset.kind});state=result.state;await onRefresh(result,'workspace');},'Revision submitted to the review team.');
    else if (action === 'confirm-review') run(async () => { if (!api?.command) throw new Error('Connect to the workspace service before reviewing.'); const result = await api.command('reviewQuote', { dealId: target.dataset.deal, quoteId: target.dataset.quote, kind: target.dataset.kind }); state = result.state; await onRefresh(result, 'workspace'); }, 'Review confirmed for this revision.');
    else if (action === 'start-catalog') run(() => catalogCommand('startDraft'), 'Catalog revision created.');
    else if (action === 'review-catalog') run(() => catalogCommand('reviewDraft'), 'Catalog changes reviewed. Publish when ready.');
    else if (action === 'publish-catalog') run(() => catalogCommand('publishDraft'), 'Catalog published. New quotes use this version; issued quotes are unchanged.');
    else if (action === 'discard-catalog') { if (globalThis.confirm?.('Discard this unpublished catalog revision? Published prices will stay unchanged.')) run(() => catalogCommand('discardDraft'), 'Unpublished catalog changes discarded.'); }
  };
  const submit = event => {
    const form = event.target.closest('form[data-tools-form]'); if (!form || !root.contains(form)) return;
    event.preventDefault(); if (busy) return;
    const data = new FormData(form), kind = form.dataset.toolsForm;
    if (kind === 'catalog-search') { local.query = String(data.get('query') || ''); local.selected = null; paint(); return; }
    if (!form.reportValidity()) return;
    if (kind === 'return-review') {run(async()=>{if(!api?.command)throw new Error('Connect to the workspace service before reviewing.');const result=await api.command('requestQuoteChanges',{dealId:form.dataset.deal,quoteId:form.dataset.quote,kind:form.dataset.kind,reason:String(data.get('reason')||'')});state=result.state;await onRefresh(result,'workspace');},'Review returned to the quote owner with your reason.');return;}
    if (kind === 'catalog-line') {
      const line = { item_id: String(data.get('item_id')), price_usd: data.get('price_usd') };
      if (form.querySelector('[data-tools-companions]')) line.requires_option_ids = data.getAll('requires_option_ids');
      if (form.querySelector('[name="included"]')) line.included = data.has('included');
      run(() => catalogCommand('saveDraft', { line }), 'Catalog item saved to this revision.');
    } else if (kind === 'catalog-terms') run(() => catalogCommand('saveDraft', { terms: { machine_id: local.machine, text: data.get('text'), min_weeks: data.get('min_weeks'), max_weeks: data.get('max_weeks') } }), 'Lead-time changes saved to this revision.');
    else if (kind === 'catalog-adjustment') run(() => catalogCommand('saveDraft', { adjustment: { machine_id: local.machine, percent: data.get('percent') } }), 'Price adjustment saved to this revision. Review before publishing.');
  };
  const change = event => { if (event.target.dataset.toolsChange === 'machine') { if (dirty && !globalThis.confirm?.('Discard the changes in this form? Saved catalog drafts will be kept.')) { event.target.value = local.machine; return; } local.machine = event.target.value; local.selected = null; local.query = ''; paint(); } };
  const input = event => { if(event.target.hasAttribute('data-tools-companion-search')){const query=event.target.value.toLowerCase();for(const option of root.querySelectorAll('.wt-companion-option'))option.hidden=!option.textContent.toLowerCase().includes(query);return;}if (event.target.closest('form[data-tools-form]:not([data-tools-form="catalog-search"])')) dirty = true; };
  const leave = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
  const navigate = event => { const link = event.target.closest('a[href]'); if (dirty && link) { if (!globalThis.confirm?.('Discard the changes in this form? Saved catalog drafts will be kept.')) { event.preventDefault(); event.stopImmediatePropagation(); } else dirty = false; } };
  globalThis.addEventListener?.('beforeunload', leave); root.ownerDocument?.addEventListener('click', navigate, true); root.addEventListener('input', input);
  root.addEventListener('click', click); root.addEventListener('submit', submit); root.addEventListener('change', change);
  paint(); if (view === 'catalog-admin') load();
  const cleanup = () => { disposed = true; globalThis.removeEventListener?.('beforeunload', leave); root.ownerDocument?.removeEventListener('click', navigate, true); root.removeEventListener('input', input); root.removeEventListener('click', click); root.removeEventListener('submit', submit); root.removeEventListener('change', change); };
  cleanup.isDirty = () => dirty;
  cleanup.beforeLeave = () => !dirty || Boolean(globalThis.confirm?.('Discard the changes in this form? Saved catalog drafts will be kept.'));
  return cleanup;
}
