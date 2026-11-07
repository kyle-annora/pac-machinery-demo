/* PAC demo domain. All mutations go through this module; issued snapshots are
   independent of editable revisions. Roles here simulate the proposed workflow,
   not authentication or server-side authorization. No network requests are made. */
import * as D from './catalog.js';
import { validateReference } from './explorer.js';

export const DEAL_STATUSES = Object.freeze(['discovery', 'configuring', 'review', 'presented', 'won', 'lost']);
export const DEMO_LABOR_RATE = 150;
export const ROLES = Object.freeze(['sales', 'engineering', 'manager']);
const clone = value => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const id = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const text = value => String(value ?? '').trim();
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const number = (value, label) => {
  if (value === '' || value == null || typeof value === 'boolean' || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 1e9) throw new Error(`${label} must be a finite, nonnegative number.`);
  return round(Number(value));
};
const required = (value, label) => { const v = text(value); if (!v) throw new Error(`${label} is required.`); return v; };
const actor = role => { if (!ROLES.includes(role)) throw new Error('Choose a valid demo role.'); return role; };
const activity = (deal, message, extra = {}) => { const item = { id: id('activity'), at: now(), message, ...extra }; deal.activity.unshift(item); deal.updated_at = item.at; return item; };

export function findDeal(state, dealId) { return state?.deals?.find(deal => deal.id === dealId); }
export function findQuote(deal, quoteId) { return deal?.quotes?.find(quote => quote.id === quoteId); }
function owned(deal, quote) {
  if (!deal || !quote || !deal.quotes?.includes(quote)) throw new Error('This quote does not belong to the selected deal.');
  return quote.working;
}
function editable(deal, quote) {
  const working = owned(deal, quote);
  if (working.status !== 'draft') throw new Error('This revision has been issued. Create a new revision before editing.');
  return working;
}
function change(deal, quote, message) {
  const w = editable(deal, quote);
  w.approvals = {};
  w.updated_at = now();
  activity(deal, message, { quote_id: quote.id, revision: w.revision });
  return quote;
}
function fingerprint(deal, quote) {
  const w = quote.working;
  // Plain canonical JSON is sufficient for change detection in this local demo.
  // It is not a cryptographic signature or a substitute for server enforcement.
  return JSON.stringify({ customer: deal.customer, title: deal.title, crm_id: deal.crm_id, scope: deal.scope, revision: w.revision, draft: w.draft, engineering: w.engineering, special: w.special, labor_rate: w.labor_rate, discount: w.discount, evidence: relevantEvidence(deal, quote) });
}
function relevantEvidence(deal, quote) { return deal.evidence.filter(item => !item.quote_id || item.quote_id === quote.id); }
function approved(deal, quote, kind) { return quote.working.approvals[kind]?.fingerprint === fingerprint(deal, quote); }
function sourceRow(catalog, machineId, line) {
  return D.getPriceLines(catalog, machineId).find(row => row.line_class === line.line_class && (line.option_id ? row.option_id === line.option_id : !row.option_id && row.name === line.name));
}
function sourceFlags(catalog, machineId, line) {
  const flags = [...(line.flags || []), ...(sourceRow(catalog, machineId, line)?.flags || [])];
  return flags.filter((flag, index) => flags.findIndex(other => other.kind === flag.kind && other.evidence === flag.evidence) === index);
}
/** Restrictions are validated against explicit source model identity. A generic
    sales/application approval must never override an unresolved compatibility rule. */
export function catalogRestrictions(catalog, machineId, line) {
  const machine = D.getMachine(catalog, machineId), problems = [];
  for (const flag of sourceFlags(catalog, machineId, line)) {
    if (flag.kind === 'models_only') {
      // This is the only model restriction currently established by the supplied
      // catalog. Do not infer other compatibility rules from model IDs or prices.
      const hybridOnly = /^hybrid\s+models\s+only\.?$/i.test(text(flag.evidence));
      const confirmedHybrid = /\bHybrid\b/i.test(machine?.title?.text || '');
      if (!hybridOnly || !confirmedHybrid) problems.push(`${line.name}: ${text(flag.evidence) || 'Model restriction'}. Compatibility with ${machine?.title?.text || machineId} is not confirmed; PAC confirmation is required before quoting.`);
    } else if (!['engineering_review', 'requires', 'lead_time', 'quantity'].includes(flag.kind)) {
      problems.push(`${line.name}: PAC confirmation is required for the catalog condition “${text(flag.evidence) || text(flag.kind)}” before quoting.`);
    }
  }
  return [...new Set(problems)];
}
function engineeringRequired(catalog, quote) {
  const w = quote.working;
  return w.engineering.length > 0 || w.draft.machine_snapshot.engineering_approval_required || D.getMachine(catalog, quote.machine_id)?.engineering_approval_required || w.draft.lines.some(line => sourceFlags(catalog, quote.machine_id, line).some(flag => flag.kind === 'engineering_review'));
}
function managerRequired(quote) { return quote.working.discount.amount > 0 || quote.working.special.length > 0; }

/** Create an opportunity. A missing CRM reference prevents quote-number creation. */
export function createDeal(state, input) {
  if (!state || state.version !== 1 || !Array.isArray(state.deals)) throw new Error('The workspace cannot be read.');
  const at = now();
  const deal = {
    id: id('deal'), number: `PAC-D-${String(state.deals.length + 1).padStart(3, '0')}`,
    title: required(input.title, 'Deal title'), customer: required(input.customer, 'Customer'),
    owner: required(input.owner || 'PAC sales', 'Owner'), status: 'discovery', crm_id: text(input.crm_id),
    scope: { application: '', bag_dimensions: '', throughput: '', ...clone(input.scope || {}) },
    next_action: text(input.next_action), next_action_date: text(input.next_action_date), last_contact: text(input.last_contact),
    selected_quote_id: null, selected_quote_revision: null, quotes: [], comments: [], evidence: [], activity: [], created_at: at, updated_at: at,
    illustrative: true,
  };
  state.deals.push(deal);
  activity(deal, 'Deal created. CRM reference is a demo field; no CRM connection is active.');
  return deal;
}

export function updateDeal(deal, patch) {
  const allowed = ['title', 'customer', 'owner', 'status', 'crm_id', 'next_action', 'next_action_date', 'last_contact'];
  if (patch.status != null && !DEAL_STATUSES.includes(patch.status)) throw new Error('Choose a valid deal stage.');
  for (const key of ['title', 'customer', 'owner']) if (key in patch) required(patch[key], key === 'title' ? 'Deal title' : key);
  if ('crm_id' in patch && !text(patch.crm_id) && deal.quotes.length) throw new Error('Keep a CRM deal reference while quotes exist.');
  const identityChanged = ['title', 'customer', 'crm_id'].some(key => key in patch && text(patch[key]) !== deal[key]);
  for (const key of allowed) if (key in patch) deal[key] = text(patch[key]);
  if (identityChanged) for (const quote of deal.quotes) if (quote.working.status === 'draft') quote.working.approvals = {};
  activity(deal, 'Deal details updated.');
  return deal;
}

export function updateScope(deal, scope) {
  const updated = { ...deal.scope };
  for (const key of ['application', 'bag_dimensions', 'throughput', 'notes']) if (key in scope) updated[key] = text(scope[key]);
  if (JSON.stringify(updated) === JSON.stringify(deal.scope)) return deal;
  deal.scope = updated;
  for (const quote of deal.quotes) if (quote.working.status === 'draft') quote.working.approvals = {};
  activity(deal, 'Application scope updated. Draft reviews must be renewed; issued revisions retain their original scope.');
  return deal;
}

export function addQuote(catalog, deal, input) {
  if (!deal?.id || !Array.isArray(deal.quotes) || !text(deal.crm_id)) throw new Error('Add the CRM deal reference before creating a quote number.');
  const draft = D.newDraft(catalog, input.machine_id);
  const quote = {
    id: id('quote'), number: `${deal.number}-Q${String(deal.quotes.length + 1).padStart(2, '0')}`,
    label: required(input.label || `Alternative ${deal.quotes.length + 1}`, 'Alternative name'), machine_id: input.machine_id,
    working: { revision: 0, status: 'draft', draft, engineering: [], special: [], labor_rate: DEMO_LABOR_RATE, labor_rate_assumption: 'Illustrative demo rate; PAC must confirm.', discount: { amount: 0, reason: '' }, approvals: {}, created_at: now(), updated_at: now(), revision_note: 'Initial quotation' },
    revisions: [],
  };
  deal.quotes.push(quote);
  activity(deal, `${quote.label} created as Rev 0.`, { quote_id: quote.id, revision: 0 });
  return quote;
}

/** Move a saved catalog configuration into an existing deal without importing
    its earlier request confirmation as a commercial approval. The rep must
    review the deal's application scope before issuing the new alternative. */
export function importDraft(catalog, deal, savedDraft, label = 'Imported configuration') {
  const imported = D.deserializeDraft(savedDraft);
  if (D.refreshStatus(catalog, imported).mismatch) throw new Error('Reconcile this saved draft with the current catalog before importing it.');
  if (imported.pending_requests?.length) throw new Error('Resolve the pending catalog requests before importing this configuration.');
  if (imported.lines.filter(line => ['catalog_base', 'catalog_base_variant'].includes(line.line_class)).length !== 1) throw new Error('The saved draft must contain exactly one base configuration.');
  for (const line of imported.lines) {
    const row = D.getPriceLines(catalog, imported.machine_id).find(item => item.line_class === line.line_class && (line.option_id ? item.option_id === line.option_id : !item.option_id && item.name === line.name));
    if (!row || row.price_usd !== line.price_usd || row.price_unit !== line.price_unit || line.machine_id !== imported.machine_id) throw new Error('A saved price line does not match the current catalog. Reconcile it before importing.');
    D.snapshotLine(catalog, row, { quantity: line.quantity });
    const restrictions = catalogRestrictions(catalog, imported.machine_id, line);
    if (restrictions.length) throw new Error(restrictions.join(' '));
  }
  if (imported.reference) {
    const valid = validateReference(catalog, imported.reference, imported.machine_id);
    if (!valid.valid) throw new Error(`The attached photo reference cannot be imported: ${valid.reason}`);
  }
  const quote = addQuote(catalog, deal, { machine_id: imported.machine_id, label });
  quote.working.draft = imported;
  quote.working.imported_from_draft_id = imported.draft_id;
  quote.working.imported_requirements = clone(imported.requirements || {});
  if (imported.reference) addEvidence(deal, { type: 'photo', quote_id: quote.id, title: imported.reference.title, reference: imported.reference, source_label: imported.reference.source_label, captured_at: imported.reference.captured_at, note: 'Imported catalog reference. Review against this deal’s application scope.' });
  activity(deal, `${quote.label} imported from a saved catalog draft. Deal scope and all commercial reviews must be confirmed.`, { quote_id: quote.id, revision: 0 });
  return quote;
}

export function selectOption(catalog, deal, quote, row, options = {}) {
  const w = editable(deal, quote);
  const plan = D.planSelection(catalog, w.draft, row, options);
  if (plan.blocked) throw new Error(plan.reviewReasons.join(' '));
  const restrictions = [row, ...plan.additions].flatMap(line => catalogRestrictions(catalog, quote.machine_id, line));
  if (restrictions.length) throw new Error([...new Set(restrictions)].join(' '));
  if (plan.alreadySelected) return quote;
  w.draft = D.applySelection(w.draft, plan);
  return change(deal, quote, `${row.name} selected${plan.additions.length > 1 ? ' with required companion options' : ''}.`);
}
export function removeOption(catalog, deal, quote, lineId) {
  const w = editable(deal, quote);
  const line = w.draft.lines.find(item => item.quote_line_id === lineId);
  if (line?.option_id && w.engineering.some(item => item.option_id === line.option_id)) throw new Error('Remove the engineering requirement attached to this option before removing the option.');
  w.draft = D.removeLine(catalog, w.draft, lineId);
  return change(deal, quote, `${line.name} removed.`);
}
export function setQuoteQuantity(catalog, deal, quote, lineId, quantity) {
  const w = editable(deal, quote);
  w.draft = D.setQuantity(catalog, w.draft, lineId, quantity);
  return change(deal, quote, 'Line quantity updated.');
}

export function saveEngineering(deal, quote, input, role = 'sales') {
  actor(role);
  const w = editable(deal, quote);
  const previous = input.id ? w.engineering.find(item => item.id === input.id) : null;
  if (input.id && !previous) throw new Error('The engineering requirement no longer exists.');
  if (role === 'sales' && ['hours', 'materials'].some(key => key in input && input[key] !== '' && input[key] != null)) throw new Error('Switch to the Engineering or Manager demo role to enter engineering pricing.');
  if (input.option_id && !w.draft.lines.some(line => line.option_id === input.option_id)) throw new Error('The customized option must be selected in this quote.');
  const item = {
    id: previous?.id || id('engineering'), description: required(input.description, 'Engineering description'),
    reason: required(input.reason, 'Why the change is needed'), option_id: input.option_id || previous?.option_id || null,
    hours: previous?.hours ?? null, materials: previous?.materials ?? null,
  };
  if (role !== 'sales') for (const key of ['hours', 'materials']) if (key in input) item[key] = input[key] === '' || input[key] == null ? null : number(input[key], key === 'hours' ? 'Labor hours' : 'Material cost');
  if (previous) w.engineering[w.engineering.indexOf(previous)] = item; else w.engineering.push(item);
  change(deal, quote, `${previous ? 'Updated' : 'Added'} engineering requirement: ${item.description}.`);
  return item;
}
export function removeEngineering(deal, quote, itemId) {
  const w = editable(deal, quote), index = w.engineering.findIndex(item => item.id === itemId);
  if (index < 0) throw new Error('The engineering requirement no longer exists.');
  w.engineering.splice(index, 1);
  return change(deal, quote, 'Engineering requirement removed.');
}
export function setLaborRate(deal, quote, rate, role) {
  actor(role);
  if (!['engineering', 'manager'].includes(role)) throw new Error('Only the Engineering or Manager demo role can change the labor rate.');
  const w = editable(deal, quote);
  w.labor_rate = number(rate, 'Labor rate');
  return change(deal, quote, `Illustrative engineering labor rate updated to $${w.labor_rate}/hour.`);
}
export function saveSpecial(deal, quote, input) {
  const w = editable(deal, quote), previous = input.id ? w.special.find(item => item.id === input.id) : null;
  if (input.id && !previous) throw new Error('The special order no longer exists.');
  const item = { id: previous?.id || id('special'), description: required(input.description, 'Special-order description'), price: number(input.price, 'Special-order price'), lead_time: required(input.lead_time, 'Special-order lead time') };
  if (previous) w.special[w.special.indexOf(previous)] = item; else w.special.push(item);
  change(deal, quote, `${previous ? 'Updated' : 'Added'} special order: ${item.description}.`);
  return item;
}
export function removeSpecial(deal, quote, itemId) {
  const w = editable(deal, quote), index = w.special.findIndex(item => item.id === itemId);
  if (index < 0) throw new Error('The special order no longer exists.');
  w.special.splice(index, 1);
  return change(deal, quote, 'Special order removed.');
}
export function updateDiscount(deal, quote, input) {
  const w = editable(deal, quote), amount = number(input.amount, 'Discount');
  const reason = amount > 0 ? required(input.reason, 'Discount reason') : text(input.reason);
  if (amount > totals(w).subtotal) throw new Error('The discount cannot exceed the known subtotal.');
  w.discount = { amount, reason };
  return change(deal, quote, amount > 0 ? 'Discount requested; Manager review is required.' : 'Discount removed.');
}

/** Known amounts remain visible, but pending pricing always blocks issuance. */
export function totals(quoteOrWorking) {
  const w = quoteOrWorking.working || quoteOrWorking;
  const pendingItems = [];
  const catalog = round(w.draft.lines.reduce((sum, line) => {
    if (!Number.isFinite(line.price_usd) || !Number.isFinite(line.quantity) || line.quantity <= 0) { pendingItems.push(line.name); return sum; }
    return sum + line.price_usd * line.quantity;
  }, 0));
  const engineering = round(w.engineering.reduce((sum, item) => {
    if (!Number.isFinite(item.hours) || !Number.isFinite(item.materials) || !Number.isFinite(w.labor_rate)) { pendingItems.push(item.description); return sum; }
    return sum + item.hours * w.labor_rate + item.materials;
  }, 0));
  const special = round(w.special.reduce((sum, item) => { if (!Number.isFinite(item.price)) { pendingItems.push(item.description); return sum; } return sum + item.price; }, 0));
  const subtotal = round(catalog + engineering + special), discount = w.discount.amount;
  return { catalog, engineering, special, subtotal, discount, total: round(subtotal - discount), pending: pendingItems.length, pending_items: pendingItems };
}

function contentBlockers(catalog, deal, quote) {
  const w = owned(deal, quote), problems = [];
  if (!text(deal.crm_id)) problems.push('A CRM deal reference is required before issuing a quote.');
  for (const [key, label] of [['application', 'Application description'], ['bag_dimensions', 'Requested bag dimensions'], ['throughput', 'Target throughput']]) if (!text(deal.scope[key])) problems.push(`${label} is required.`);
  if (D.refreshStatus(catalog, w.draft).mismatch) problems.push('Catalog changed. Reconcile saved prices with PAC before issuing.');
  if (totals(w).pending) problems.push('Engineering or catalog pricing is incomplete.');
  if (w.draft.lines.filter(line => ['catalog_base', 'catalog_base_variant'].includes(line.line_class)).length !== 1) problems.push('Keep exactly one base machine configuration.');
  if (!Number.isFinite(w.discount.amount) || w.discount.amount < 0 || w.discount.amount > totals(w).subtotal || (w.discount.amount > 0 && !text(w.discount.reason))) problems.push('The discount needs a valid amount and reason.');
  for (const line of w.draft.lines) {
    problems.push(...catalogRestrictions(catalog, quote.machine_id, line));
    if (!Number.isFinite(line.price_usd) || line.price_usd < 0 || !Number.isFinite(line.quantity) || line.quantity <= 0 || (line.price_unit === 'each' && !Number.isInteger(line.quantity)) || (line.price_unit === 'lump_sum' && line.quantity !== 1)) problems.push(`Check the price and quantity for ${line.name}.`);
    for (const requirement of line.requires || []) if (requirement.ambiguous || !w.draft.lines.some(other => other.option_id === requirement.option_id) && !w.draft.included_snapshot.some(other => other.option_id === requirement.option_id)) problems.push(`${line.name} has an unresolved required option.`);
  }
  for (const item of w.engineering) {
    if (!text(item.description) || !text(item.reason) || (item.hours != null && (!Number.isFinite(item.hours) || item.hours < 0)) || (item.materials != null && (!Number.isFinite(item.materials) || item.materials < 0))) problems.push('Each engineering requirement needs a description, reason and valid pricing.');
    if (item.option_id && !w.draft.lines.some(line => line.option_id === item.option_id)) problems.push('An engineering requirement refers to an option that is no longer selected.');
  }
  if (!Number.isFinite(w.labor_rate) || w.labor_rate < 0) problems.push('The engineering labor rate is invalid.');
  for (const item of w.special) if (!text(item.description) || !text(item.lead_time) || !Number.isFinite(item.price) || item.price < 0) problems.push('Each special order needs a price and lead-time condition.');
  return [...new Set(problems)];
}

export function blockers(catalog, deal, quote) {
  const problems = contentBlockers(catalog, deal, quote);
  if (!approved(deal, quote, 'application')) problems.push('Application review is required for this revision.');
  if (engineeringRequired(catalog, quote) && !approved(deal, quote, 'engineering')) problems.push('Engineering approval is required for this revision.');
  if (managerRequired(quote) && !approved(deal, quote, 'manager')) problems.push('Manager approval is required for the discount or special-order terms.');
  return problems;
}
export function reviewQuote(catalog, deal, quote, kind, role) {
  actor(role); editable(deal, quote);
  if (!['application', 'engineering', 'manager'].includes(kind)) throw new Error('Choose a valid review.');
  if (kind === 'engineering' && !['engineering', 'manager'].includes(role)) throw new Error('Engineering review requires the Engineering or Manager demo role.');
  if (kind === 'manager' && role !== 'manager') throw new Error('Manager review requires the Manager demo role.');
  const problems = contentBlockers(catalog, deal, quote);
  if (problems.length) throw new Error(problems.join(' '));
  quote.working.approvals[kind] = { kind, role, at: now(), revision: quote.working.revision, fingerprint: fingerprint(deal, quote), simulated: true };
  activity(deal, `${kind[0].toUpperCase() + kind.slice(1)} review completed by the ${role} demo role.`, { quote_id: quote.id, revision: quote.working.revision });
  return quote;
}
export function issueQuote(catalog, deal, quote, role = 'sales') {
  actor(role); const w = editable(deal, quote);
  if (!['sales', 'manager'].includes(role)) throw new Error('Switch to the Sales or Manager demo role to issue the quote.');
  const problems = blockers(catalog, deal, quote);
  if (problems.length) throw new Error(problems.join(' '));
  const snapshot = clone({ ...w, status: 'issued', quote_id: quote.id, quote_number: quote.number, label: quote.label, issued_at: now(), issued_by: role, scope_snapshot: deal.scope, customer_snapshot: deal.customer, title_snapshot: deal.title, totals: totals(w), evidence: relevantEvidence(deal, quote) });
  quote.revisions.push(freeze(snapshot));
  if (deal.selected_quote_id === quote.id && deal.selected_quote_revision !== w.revision) {
    const previousRevision = deal.selected_quote_revision;
    deal.selected_quote_id = null;
    deal.selected_quote_revision = null;
    activity(deal, `Customer preference for ${quote.label}${Number.isInteger(previousRevision) ? ` Rev ${previousRevision}` : ''} cleared. Review the newly issued Rev ${w.revision} before choosing again.`, { quote_id: quote.id, revision: w.revision });
  }
  w.status = 'issued';
  deal.status = 'presented';
  activity(deal, `${quote.label} Rev ${w.revision} issued in the local demo. Nothing was sent.`, { quote_id: quote.id, revision: w.revision });
  return quote;
}
export function reviseQuote(deal, quote, note = 'Customer requested a change') {
  owned(deal, quote);
  if (quote.working.status !== 'issued' || !quote.revisions.length) throw new Error('Finish the current draft before creating another revision.');
  const latest = quote.revisions.at(-1);
  const reason = required(note, 'Revision note');
  quote.working = {
    revision: latest.revision + 1, status: 'draft', draft: clone(latest.draft), engineering: clone(latest.engineering), special: clone(latest.special),
    labor_rate: latest.labor_rate, labor_rate_assumption: latest.labor_rate_assumption, discount: clone(latest.discount), approvals: {}, created_at: now(), updated_at: now(), revision_note: reason,
  };
  deal.status = 'configuring';
  activity(deal, `${quote.label} Rev ${quote.working.revision} started: ${reason}`, { quote_id: quote.id, revision: quote.working.revision });
  return quote;
}

export function addEvidence(deal, input) {
  if (input.deal_id && input.deal_id !== deal.id) throw new Error('This evidence belongs to another deal.');
  if (input.quote_id && !findQuote(deal, input.quote_id)) throw new Error('This evidence belongs to another quote.');
  if (input.id && deal.evidence.some(item => item.id === input.id)) throw new Error('This evidence is already attached.');
  const evidence = clone({ ...input, id: input.id || id('evidence'), deal_id: deal.id, quote_id: input.quote_id || null, title: required(input.title, 'Evidence title'), captured_at: input.captured_at || now() });
  if (evidence.type === 'explorer') {
    if (!evidence.reference || typeof evidence.reference !== 'object' || !text(evidence.model_id) || !text(evidence.model_revision)) throw new Error('Capture a model view before attaching Explorer evidence.');
    evidence.source_label = 'Reference assembly — not PAC CAD';
  }
  deal.evidence.push(freeze(evidence));
  for (const quote of deal.quotes) if (quote.working.status === 'draft' && (!evidence.quote_id || evidence.quote_id === quote.id)) quote.working.approvals = {};
  activity(deal, `Evidence attached: ${evidence.title}.`, { quote_id: evidence.quote_id, evidence_id: evidence.id });
  return evidence;
}

export function addComment(deal, input) {
  const quote = input.quote_id ? findQuote(deal, input.quote_id) : null;
  if (input.quote_id && !quote) throw new Error('Choose an alternative in this deal.');
  const revision = input.revision === '' || input.revision == null ? null : Number(input.revision);
  if (quote && !quote.revisions.some(item => item.revision === revision)) throw new Error('Comments must refer to an issued revision.');
  if (!quote && revision != null) throw new Error('Choose a quote for a revision-specific comment.');
  const visibility = input.visibility || 'customer';
  if (!['customer', 'internal'].includes(visibility)) throw new Error('Choose customer or internal visibility.');
  const body = required(input.body, 'Comment');
  if (body.length > 10000) throw new Error('Keep the comment under 10,000 characters.');
  const comment = { id: id('comment'), body, author: required(input.author || 'Demo customer', 'Comment author'), quote_id: quote?.id || null, revision, visibility, at: now(), proposal_revisions: quote ? [{ quote_id: quote.id, revision }] : deal.quotes.flatMap(q => q.revisions.length ? [{ quote_id: q.id, revision: q.revisions.at(-1).revision }] : []) };
  deal.comments.push(comment);
  deal.last_contact = comment.at;
  activity(deal, `${visibility === 'internal' ? 'Internal note' : 'Customer comment'} added by ${comment.author}.`, { quote_id: comment.quote_id, revision });
  return comment;
}
export function chooseAlternative(deal, quoteId) {
  const quote = findQuote(deal, quoteId);
  if (!quote || !quote.revisions.length) throw new Error('Choose an issued alternative.');
  deal.selected_quote_id = quote.id;
  deal.selected_quote_revision = quote.revisions.at(-1).revision;
  activity(deal, `${quote.label} selected for discussion. This is not a signed order.`, { quote_id: quote.id, revision: quote.revisions.at(-1).revision });
  return deal;
}

const publicLine = line => ({
  quote_line_id: line.quote_line_id, name: line.name, line_class: line.line_class, option_id: line.option_id,
  quantity: line.quantity, price_unit: line.price_unit, price_usd: line.price_usd,
  total: Number.isFinite(line.price_usd) ? round(line.price_usd * line.quantity) : null,
  description: line.description, notes: clone(line.notes || []), source_line: line.source_line,
  flags: (line.flags || []).map(flag => ({ kind: flag.kind, target: flag.target ?? null, evidence: flag.evidence })),
  review_reasons: clone(line.review_reasons || []),
  lead_time_notes: (line.flags || []).filter(flag => flag.kind === 'lead_time').map(flag => flag.evidence),
  conditions: [...new Set((line.flags || []).filter(flag => ['models_only', 'lead_time', 'quantity', 'requires'].includes(flag.kind)).map(flag => flag.evidence))],
});
const publicEvidence = evidence => ({ id: evidence.id, type: evidence.type, deal_id: evidence.deal_id, quote_id: evidence.quote_id, title: evidence.title, model_id: evidence.model_id, model_revision: evidence.model_revision, part_id: evidence.part_id, part_label: evidence.part_label, captured_at: evidence.captured_at, reference: clone(evidence.reference || null), note: evidence.note || '', source_label: evidence.source_label || '' });
/** Explicit customer projection. Never return the full workspace as a proposal. */
export function publicProposal(deal) {
  const alternatives = deal.quotes.filter(quote => quote.revisions.length).map(quote => {
    const s = quote.revisions.at(-1);
    return {
      quote_id: quote.id, number: quote.number, label: s.label, revision: s.revision, machine_id: quote.machine_id, machine_title: s.draft.machine_title,
      photo: clone(s.draft.machine_snapshot.photo), scope: clone(s.scope_snapshot), customer: s.customer_snapshot, lines: s.draft.lines.map(publicLine), included: s.draft.included_snapshot.map(publicLine),
      engineering: s.engineering.map(item => ({ description: item.description, price: round(item.hours * s.labor_rate + item.materials) })),
      special: s.special.map(item => ({ description: item.description, price: item.price, lead_time: item.lead_time })),
      totals: { subtotal: s.totals.subtotal, discount: s.totals.discount, total: s.totals.total },
      terms: clone(s.draft.terms_snapshot), lead_time: s.draft.terms_snapshot.delivery?.text || s.draft.terms_snapshot.lead_time?.text || 'Confirm with PAC for this application.',
      lead_time_notes: [...new Set(s.draft.lines.flatMap(line => (line.flags || []).filter(flag => flag.kind === 'lead_time').map(flag => `${line.name}: ${flag.evidence}`)))],
      evidence: s.evidence.map(publicEvidence), issued_at: s.issued_at,
    };
  });
  // The latest issued alternative supplies the shared opening scope. Each card also
  // carries its own scope snapshot when alternatives were issued at different times.
  const latest = [...alternatives].sort((a, b) => b.issued_at.localeCompare(a.issued_at))[0];
  const selected = alternatives.find(item => item.quote_id === deal.selected_quote_id && item.revision === deal.selected_quote_revision);
  return {
    id: deal.id, number: deal.number, title: latest ? deal.quotes.find(q => q.id === latest.quote_id).revisions.at(-1).title_snapshot : deal.title,
    customer: latest?.customer || deal.customer, scope: clone(latest?.scope || {}), alternatives,
    comments: clone(deal.comments.filter(item => item.visibility === 'customer')),
    evidence: alternatives.flatMap(item => item.evidence).filter((item, index, all) => all.findIndex(other => other.id === item.id) === index),
    selected_quote_id: selected?.quote_id || null, selected_quote_revision: selected?.revision ?? null, illustrative: true,
  };
}

export function seedWorkspace(catalog) {
  const state = { version: 1, deals: [] };
  const deal = createDeal(state, { title: 'Small parts packaging', customer: 'Northstar Components · Illustrative customer', owner: 'PAC sales team', crm_id: 'DEMO-CRM-1042', scope: { application: 'Package mixed hardware kits with manual loading. Reduce handling at the bag opening while keeping the seal area flat.', bag_dimensions: '12 × 16 in', throughput: '25 bags/min', notes: 'PAC must validate bag material, product samples and operator workflow.' }, next_action: 'Review alternatives with the customer and confirm the application.', next_action_date: '2026-11-09', last_contact: '2026-11-07' });
  deal.id = 'deal-pac-demo';
  const training = D.getPriceLines(catalog, 'r3200').find(line => line.line_class === 'service');
  const stableId = (quote, value) => { const old = quote.id; quote.id = value; deal.activity.forEach(item => { if (item.quote_id === old) item.quote_id = value; }); };
  const a = addQuote(catalog, deal, { machine_id: 'r3200', label: 'A · Standard loading' }); stableId(a, 'quote-pac-a');
  if (training) selectOption(catalog, deal, a, training);
  reviewQuote(catalog, deal, a, 'application', 'sales'); issueQuote(catalog, deal, a);
  const b = addQuote(catalog, deal, { machine_id: 'r3200', label: 'B · Assisted loading' }); stableId(b, 'quote-pac-b');
  selectOption(catalog, deal, b, D.getOption(catalog, 'r3200', 'easy_load_bag_opener'));
  if (training) selectOption(catalog, deal, b, training);
  reviewQuote(catalog, deal, b, 'application', 'sales'); issueQuote(catalog, deal, b);
  addComment(deal, { body: 'Can we review how assisted loading would change the operator workflow?', author: 'Demo customer', quote_id: b.id, revision: 0 });
  activity(deal, 'Staged demo: catalog-backed prices; customer, CRM reference and approvals are illustrative.');
  return state;
}
