/* PAC sales domain. Issued snapshots are independent of editable revisions.
   Callers must authenticate actors and authorize record access before dispatch.
   Role checks here enforce business policy, not session authentication. */
import * as D from './catalog.js';
import { validateReference } from './explorer.js';
import { proposalResources } from './proposal-resources.js';

export const DEAL_STATUSES = Object.freeze(['discovery', 'configuring', 'review', 'quoted', 'presented', 'won', 'lost']);
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
const salesActor = role => { actor(role); if (!['sales', 'manager'].includes(role)) throw new Error('Only Sales or Manager can perform this action.'); return role; };
const actorIdentity = (identity, role) => {
  if (identity == null) return null;
  return { id: required(identity.id, 'Actor identity'), name: required(identity.name, 'Actor name'), role };
};
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
function managerRequired(quote) { return quote.working.discount.amount > 0 || quote.working.special.length > 0 || quote.working.draft.lines.some(line => line.selling_price_override && lineUnitPrice(line) < line.price_usd); }
export function requiredReviews(catalog, quote) { return {application:true,engineering:Boolean(engineeringRequired(catalog,quote)),manager:Boolean(managerRequired(quote))}; }

const reviewRole = (kind, role) => {
  actor(role);
  if (!['application', 'engineering', 'manager'].includes(kind)) throw new Error('Choose a valid review.');
  if (kind === 'engineering' && !['engineering', 'manager'].includes(role)) throw new Error('Engineering or Manager access is required for engineering review.');
  if (kind === 'manager' && role !== 'manager') throw new Error('Manager access is required for commercial review.');
};
export function reviewStatus(deal, quote, kind) {
  owned(deal, quote);
  const request = quote.working.review_requests?.[kind];
  if (approved(deal, quote, kind)) return { ...clone(quote.working.approvals[kind]), status: 'approved' };
  if (!request) return { kind, status: 'not_requested' };
  if (request.status === 'changes_requested') return clone(request);
  if (request.status === 'approved') return { ...clone(request), status: request.explicit_submission ? 'needs_resubmission' : 'not_requested' };
  return { ...clone(request), status: request.fingerprint === fingerprint(deal, quote) ? 'pending' : 'needs_resubmission' };
}
function reviewEvent(deal, quote, kind, status, details) {
  const event = { id: id('review'), kind, status, revision: quote.working.revision, at: now(), fingerprint: fingerprint(deal, quote), ...details };
  quote.working.review_requests ||= {};
  quote.working.review_requests[kind] = event;
  quote.review_history ||= [];
  quote.review_history.push(freeze(clone(event)));
  return event;
}
/** Explicit handoff is retained across edits. A returned review cannot be approved
    until Sales resubmits; edits after submission require a fresh submission. */
export function submitQuoteReview(catalog, deal, quote, kind, role = 'sales', identity = null, note = '') {
  salesActor(role); editable(deal, quote);
  if (!Object.hasOwn(requiredReviews(catalog, quote), kind)) throw new Error('Choose a valid review.');
  if (!requiredReviews(catalog, quote)[kind]) throw new Error('This review is not required by the current configuration.');
  if (text(note).length > 2000) throw new Error('Keep the review note under 2,000 characters.');
  delete quote.working.approvals[kind];
  const event = reviewEvent(deal, quote, kind, 'pending', { explicit_submission: true, note: text(note), requested_by: actorIdentity(identity, role), assigned_role: kind === 'application' ? 'sales' : kind });
  deal.status = 'review';
  activity(deal, `${quote.label} Rev ${quote.working.revision} submitted for ${kind} review.`, { quote_id: quote.id, revision: quote.working.revision, review_id: event.id });
  return quote;
}
export function requestQuoteChanges(catalog, deal, quote, kind, reason, role, identity = null) {
  reviewRole(kind, role); editable(deal, quote);
  if (!requiredReviews(catalog, quote)[kind]) throw new Error('This review is not required by the current configuration.');
  const explanation = required(reason, 'Reason for returning this review');
  if (explanation.length > 2000) throw new Error('Keep the review reason under 2,000 characters.');
  delete quote.working.approvals[kind];
  const event = reviewEvent(deal, quote, kind, 'changes_requested', { reason: explanation, reviewer: actorIdentity(identity, role), assigned_role: 'sales' });
  activity(deal, `${quote.label} Rev ${quote.working.revision} returned for changes: ${explanation}`, { quote_id: quote.id, revision: quote.working.revision, review_id: event.id });
  return quote;
}

function validateCustomerDecision(input) {
  if ('customer_next_decision' in input && text(input.customer_next_decision).length > 2000) throw new Error('Keep the customer next decision under 2,000 characters.');
  const date = text(input.customer_decision_date);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date)) throw new Error('Choose a valid customer decision date.');
}

/** Create an opportunity. A missing CRM reference prevents quote-number creation. */
export function createDeal(state, input) {
  validateCustomerDecision(input);
  if (!state || state.version !== 1 || !Array.isArray(state.deals)) throw new Error('The workspace cannot be read.');
  const at = now();
  const deal = {
    id: id('deal'), number: `PAC-D-${String(state.deals.length + 1).padStart(3, '0')}`,
    title: required(input.title, 'Deal title'), customer: required(input.customer, 'Customer'),
    owner: required(input.owner || 'PAC sales', 'Owner'), status: 'discovery', crm_id: text(input.crm_id),
    scope: { application: '', bag_dimensions: '', throughput: '', ...clone(input.scope || {}) },
    next_action: text(input.next_action), next_action_date: text(input.next_action_date), last_contact: text(input.last_contact),
    customer_next_decision: text(input.customer_next_decision), customer_decision_date: text(input.customer_decision_date),
    selected_quote_id: null, selected_quote_revision: null, quotes: [], comments: [], evidence: [], activity: [], proposals: [], customer_responses: [], proposal_selections: [], created_at: at, updated_at: at,
    illustrative: true,
  };
  state.deals.push(deal);
  activity(deal, 'Deal created. CRM reference is a demo field; no CRM connection is active.');
  return deal;
}

export function updateDeal(deal, patch) {
  const allowed = ['title', 'customer', 'owner', 'status', 'crm_id', 'next_action', 'next_action_date', 'last_contact', 'customer_next_decision', 'customer_decision_date'];
  validateCustomerDecision(patch);
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

/** Contact details are deal context, separate from customer-visible issued scope. */
export function updateContacts(deal, contacts, role = 'sales') {
  salesActor(role);
  if (!deal?.id || !Array.isArray(contacts) || contacts.length > 30) throw new Error('Provide up to 30 contacts for this deal.');
  const existing = new Set((deal.contacts || []).map(item => item.id));
  const seen = new Set();
  const updated = contacts.map(input => {
    const name = required(input.name, 'Contact name');
    const email = text(input.email).toLowerCase();
    if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) throw new Error('Enter a valid contact email address.');
    if (email && seen.has(email)) throw new Error('This email address is already included in the deal contacts.');
    if (email) seen.add(email);
    if (input.id && !existing.has(input.id)) throw new Error('This contact does not belong to the selected deal.');
    return { id: input.id || id('contact'), name, email, phone: text(input.phone), title: text(input.title) };
  });
  if (new Set(updated.map(item => item.id)).size !== updated.length) throw new Error('Each contact can only appear once.');
  deal.contacts = updated;
  activity(deal, 'Deal contacts updated.');
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

export function renameQuote(deal, quote, label, role = 'sales') {
  salesActor(role); owned(deal, quote);
  const next = required(label, 'Alternative name');
  if (next.length > 160) throw new Error('Keep the alternative name under 160 characters.');
  if (next === quote.label) return quote;
  const previous = quote.label;
  quote.label = next;
  if (quote.working.status === 'draft') quote.working.approvals = {};
  activity(deal, `Alternative renamed from ${previous} to ${next}. Issued revisions retain their original name.`, { quote_id: quote.id });
  return quote;
}

/** Copy the saved configuration, not its approvals, revisions or customer history. */
export function duplicateQuote(catalog, deal, quote, { label } = {}, role = 'sales') {
  salesActor(role); owned(deal, quote);
  const source = clone(quote.working);
  const nextLabel = required(label || `${quote.label} copy`, 'Alternative name');
  if (nextLabel.length > 160) throw new Error('Keep the alternative name under 160 characters.');
  const duplicate = addQuote(catalog, deal, { machine_id: quote.machine_id, label: nextLabel });
  const copiedDraft = clone(source.draft);
  copiedDraft.draft_id = id('draft');
  copiedDraft.created_at = now();
  copiedDraft.updated_at = copiedDraft.created_at;
  for (const line of [...copiedDraft.lines, ...copiedDraft.included_snapshot]) line.quote_line_id = id('line');
  duplicate.working = {
    ...duplicate.working,
    draft: copiedDraft,
    engineering: source.engineering.map(item => ({ ...item, id: id('engineering') })),
    special: source.special.map(item => ({ ...item, id: id('special') })),
    labor_rate: source.labor_rate, labor_rate_assumption: source.labor_rate_assumption,
    discount: clone(source.discount), revision_note: `Copied from ${quote.label} Rev ${source.revision}`,
  };
  deal.status = 'configuring';
  activity(deal, `${duplicate.label} copied from the saved ${quote.label} configuration. Reviews are required again.`, { quote_id: duplicate.id, source_quote_id: quote.id, revision: 0 });
  return duplicate;
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
    if (line.selling_price_override !== undefined || line.selling_price_history !== undefined) throw new Error('Import catalog choices first, then use the authorized selling-price operation.');
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

/** Demo permission policy; PAC must confirm its actual pricing authority matrix.
 * Sales/Manager may increase a standard catalog unit price. Only Manager may
 * price below its catalog basis. Catalog prices are never overwritten. */
export function canOverrideLinePrice(line) {
  return Boolean(line && ['catalog_base', 'catalog_base_variant', 'catalog_option'].includes(line.line_class)
    && Number.isFinite(line.price_usd) && line.price_usd >= 0
    && ['each', 'lump_sum'].includes(line.price_unit)
    && !(line.flags || []).some(flag => flag.kind === 'engineering_review'));
}
export function lineUnitPrice(line) {
  return line?.selling_price_override === undefined ? line?.price_usd : line.selling_price_override?.price_usd;
}
function overrideLine(catalog, deal, quote, lineId, role) {
  actor(role);
  if (!['sales', 'manager'].includes(role)) throw Object.assign(new Error('Only Sales or Manager can change a catalog selling price.'), { status: 403, code: 'FORBIDDEN' });
  const w = editable(deal, quote);
  if (D.refreshStatus(catalog, w.draft).mismatch) throw new Error('Reconcile the saved catalog basis before changing a selling price.');
  const line = w.draft.lines.find(item => item.quote_line_id === lineId), source = line && sourceRow(catalog, quote.machine_id, line);
  if (!canOverrideLinePrice(line) || !canOverrideLinePrice(source)) throw new Error('Only standard catalog base and option lines support a selling-price override. Included, service and engineering prices use their own rules.');
  if (source.price_usd !== line.price_usd || source.price_unit !== line.price_unit) throw new Error('The catalog price basis does not match. Reconcile pricing before changing a selling price.');
  return line;
}
function overrideReason(input) {
  if (typeof input?.reason !== 'string' || !input.reason.trim() || input.reason.trim().length > 2000) throw new Error('A selling-price reason of up to 2,000 characters is required.');
  return input.reason.trim();
}
export function setLinePriceOverride(catalog, deal, quote, lineId, input, role = 'sales', identity = null) {
  const line = overrideLine(catalog, deal, quote, lineId, role), amount = number(input?.price_usd, 'Selling unit price'), reason = overrideReason(input);
  if (amount < line.price_usd && role !== 'manager') throw Object.assign(new Error('Manager access is required to price below the catalog basis. This is the demo permission policy.'), { status: 403, code: 'FORBIDDEN' });
  const reviewer = actorIdentity(identity, role), previous = lineUnitPrice(line);
  const override = { price_usd: amount, catalog_price_usd: line.price_usd, catalog_price_unit: line.price_unit, reason, role, at: now(), ...(reviewer ? { actor: reviewer } : {}) };
  line.selling_price_override = override;
  line.selling_price_history = [...(line.selling_price_history || []), { ...clone(override), action: 'set', previous_price_usd: previous }];
  change(deal, quote, `${line.name}: selling unit price changed from $${previous.toFixed(2)} to $${amount.toFixed(2)}. Reason: ${reason}`);
  return quote;
}
export function clearLinePriceOverride(catalog, deal, quote, lineId, input, role = 'sales', identity = null) {
  const line = overrideLine(catalog, deal, quote, lineId, role), reason = overrideReason(input), reviewer = actorIdentity(identity, role);
  if (!line.selling_price_override) throw new Error('This line already uses the catalog price.');
  const previous = lineUnitPrice(line);
  line.selling_price_history = [...(line.selling_price_history || []), { action: 'reset', price_usd: line.price_usd, catalog_price_usd: line.price_usd, catalog_price_unit: line.price_unit, previous_price_usd: previous, reason, role, at: now(), ...(reviewer ? { actor: reviewer } : {}) }];
  delete line.selling_price_override;
  change(deal, quote, `${line.name}: selling unit price restored to the catalog price of $${line.price_usd.toFixed(2)}. Reason: ${reason}`);
  return quote;
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
    const price = lineUnitPrice(line);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(line.quantity) || line.quantity <= 0) { pendingItems.push(line.name); return sum; }
    return sum + price * line.quantity;
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
    if (line.selling_price_override !== undefined) {
      const override = line.selling_price_override;
      if (!canOverrideLinePrice(line) || !canOverrideLinePrice(sourceRow(catalog, quote.machine_id, line)) || !override || !Number.isFinite(override.price_usd) || override.price_usd < 0 || override.price_usd > 1e9 || override.catalog_price_usd !== line.price_usd || override.catalog_price_unit !== line.price_unit || !text(override.reason) || !['sales', 'manager'].includes(override.role) || (override.price_usd < line.price_usd && override.role !== 'manager')) problems.push(`Check the selling-price authorization and catalog basis for ${line.name}.`);
    }
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
  if (managerRequired(quote) && !approved(deal, quote, 'manager')) problems.push('Manager approval is required for the discount, below-catalog selling price or special-order terms.');
  return problems;
}
export function reviewQuote(catalog, deal, quote, kind, role, identity = null) {
  reviewRole(kind, role); editable(deal, quote);
  const reviewer = actorIdentity(identity, role);
  if (['changes_requested', 'needs_resubmission'].includes(reviewStatus(deal, quote, kind).status)) throw new Error('Sales must resubmit this revision before it can be approved.');
  const problems = contentBlockers(catalog, deal, quote);
  if (problems.length) throw new Error(problems.join(' '));
  quote.working.approvals[kind] = { kind, role, at: now(), revision: quote.working.revision, fingerprint: fingerprint(deal, quote), simulated: !reviewer, ...(reviewer ? { actor: reviewer } : {}) };
  reviewEvent(deal, quote, kind, 'approved', { explicit_submission: Boolean(quote.working.review_requests?.[kind]?.explicit_submission), reviewer, assigned_role: kind === 'application' ? 'sales' : kind });
  activity(deal, `${kind[0].toUpperCase() + kind.slice(1)} review completed by ${reviewer ? reviewer.name : `the ${role} demo role`}.`, { quote_id: quote.id, revision: quote.working.revision, ...(reviewer ? { actor_id: reviewer.id } : {}) });
  return quote;
}
export function issueQuote(catalog, deal, quote, role = 'sales', identity = null) {
  actor(role); const w = editable(deal, quote);
  const issuer = actorIdentity(identity, role);
  if (!['sales', 'manager'].includes(role)) throw new Error('Switch to the Sales or Manager demo role to issue the quote.');
  const problems = blockers(catalog, deal, quote);
  if (problems.length) throw new Error(problems.join(' '));
  const snapshot = clone({ ...w, status: 'issued', quote_id: quote.id, quote_number: quote.number, label: quote.label, issued_at: now(), issued_by: role, ...(issuer ? { issued_by_actor: issuer } : {}), scope_snapshot: deal.scope, customer_snapshot: deal.customer, title_snapshot: deal.title, totals: totals(w), evidence: relevantEvidence(deal, quote) });
  snapshot.media_snapshot = w.draft.lines.filter(line => line.option_id).flatMap(line => D.optionPhotos(catalog, quote.machine_id, line.option_id).slice(0, 1).map(picture => ({ option_id: line.option_id, title: line.name, file: picture.converted_file || picture.file, image_id: picture.image_id, matches: picture.matches, kind: picture.kind, scope: picture.matches === quote.machine_id ? 'model_option' : 'generic_option' })));
  snapshot.resource_snapshot = clone(proposalResources[quote.machine_id] || []);
  quote.revisions.push(freeze(snapshot));
  if (deal.selected_quote_id === quote.id && deal.selected_quote_revision !== w.revision) {
    const previousRevision = deal.selected_quote_revision;
    deal.selected_quote_id = null;
    deal.selected_quote_revision = null;
    activity(deal, `Customer preference for ${quote.label}${Number.isInteger(previousRevision) ? ` Rev ${previousRevision}` : ''} cleared. Review the newly issued Rev ${w.revision} before choosing again.`, { quote_id: quote.id, revision: w.revision });
  }
  w.status = 'issued';
  if (!['won', 'lost'].includes(deal.status)) deal.status = 'quoted';
  activity(deal, `${quote.label} Rev ${w.revision} issued. This does not publish, share or present a proposal.`, { quote_id: quote.id, revision: w.revision, ...(issuer ? { actor_id: issuer.id } : {}) });
  return quote;
}
export function reviseQuote(deal, quote, note = 'Customer requested a change') {
  owned(deal, quote);
  if (quote.working.status !== 'issued' || !quote.revisions.length) throw new Error('Finish the current draft before creating another revision.');
  const latest = quote.revisions.at(-1);
  const unpublishedResponseRevision = (deal.customer_responses || []).some(response => response.status === 'in_progress' && response.revision_links.some(link => link.quote_id === quote.id && link.revision === latest.revision));
  if (unpublishedResponseRevision) throw new Error('Publish the issued revision linked to this customer request before creating another revision.');
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
  const proposal = input.proposal_id ? proposalRecord(deal, input.proposal_id) : visibility === 'customer' ? [...(deal.proposals || [])].reverse().find(item => !quote || item.manifest.some(ref => ref.quote_id === quote.id && ref.revision === revision)) : null;
  if (visibility === 'customer' && !proposal) throw new Error('Publish this issued revision in a proposal before adding customer feedback.');
  if (proposal && quote && !proposal.manifest.some(ref => ref.quote_id === quote.id && ref.revision === revision)) throw new Error('The comment must refer to an alternative and revision in this proposal.');
  const comment = freeze({ id: id('comment'), body, author: required(input.author || 'Demo customer', 'Comment author'), quote_id: quote?.id || null, revision, visibility, at: now(), proposal_id: proposal?.id || null, proposal_revisions: proposal ? clone(proposal.manifest) : quote ? [{ quote_id: quote.id, revision }] : [] });
  deal.comments.push(comment);
  deal.last_contact = comment.at;
  activity(deal, `${visibility === 'internal' ? 'Internal note' : 'Customer comment'} added by ${comment.author}.`, { quote_id: comment.quote_id, revision });
  return comment;
}

/** Explicit recovery of a retained pre-ProposalVersion form. The issued quote
    reference is known, but its historical proposal identity is not. Keep the
    comment in seller history without inventing a customer-view attribution. */
export function recoverLegacyComment(deal, input) {
  const quote = findQuote(deal, required(input.quote_id, 'Original quote'));
  if (!quote) throw new Error('Choose the original alternative in this deal.');
  const revision = input.revision === '' || input.revision == null ? null : Number(input.revision);
  if (!Number.isInteger(revision) || revision < 0 || !quote.revisions.some(item => item.revision === revision && item.status === 'issued')) throw new Error('Recover the comment against its original issued quote revision.');
  const body = required(input.body, 'Comment');
  if (body.length > 10000) throw new Error('Keep the comment under 10,000 characters.');
  const comment = freeze({ id: id('comment'), body, author: required(input.author || 'Demo customer', 'Comment author'), quote_id: quote.id, revision, visibility: 'customer', at: now(), proposal_id: null, proposal_revisions: [{ quote_id: quote.id, revision }], origin: 'recovered_legacy_draft' });
  deal.comments.push(comment);
  deal.last_contact = comment.at;
  activity(deal, `Retained customer comment recovered for ${quote.label} Rev ${revision}. Its original proposal version is unknown.`, { quote_id: quote.id, revision, comment_id: comment.id });
  return comment;
}

export function chooseAlternative(deal, quoteId, proposalId) {
  const proposal = proposalRecord(deal, proposalId), reference = proposal.manifest.find(item => item.quote_id === quoteId);
  const quote = findQuote(deal, quoteId);
  if (!quote || !reference) throw new Error('Choose an issued alternative in this proposal.');
  deal.selected_quote_id = quote.id;
  deal.selected_quote_revision = reference.revision;
  deal.proposal_selections ||= [];
  deal.proposal_selections.push(freeze({ id: id('preference'), proposal_id: proposal.id, quote_id: quote.id, revision: reference.revision, at: now() }));
  activity(deal, `${quote.label} selected for discussion on Proposal V${proposal.version}. This is not a signed order.`, { quote_id: quote.id, revision: reference.revision, proposal_id: proposal.id });
  return deal;
}

const publicLine = line => ({
  quote_line_id: line.quote_line_id, name: line.name, line_class: line.line_class, option_id: line.option_id,
  quantity: line.quantity, price_unit: line.price_unit, price_usd: lineUnitPrice(line),
  total: Number.isFinite(lineUnitPrice(line)) ? round(lineUnitPrice(line) * line.quantity) : null,
  description: line.description, notes: clone(line.notes || []),
  // Source price text is catalog provenance, not the negotiated customer price.
  ...(line.selling_price_override ? {} : { source_line: line.source_line }),
  flags: (line.flags || []).map(flag => ({ kind: flag.kind, target: flag.target ?? null, evidence: flag.evidence })),
  review_reasons: clone(line.review_reasons || []),
  lead_time_notes: (line.flags || []).filter(flag => flag.kind === 'lead_time').map(flag => flag.evidence),
  conditions: [...new Set((line.flags || []).filter(flag => ['models_only', 'lead_time', 'quantity', 'requires'].includes(flag.kind)).map(flag => flag.evidence))],
});
const publicEvidence = evidence => ({ id: evidence.id, type: evidence.type, deal_id: evidence.deal_id, quote_id: evidence.quote_id, title: evidence.title, model_id: evidence.model_id, model_revision: evidence.model_revision, part_id: evidence.part_id, part_label: evidence.part_label, captured_at: evidence.captured_at, reference: clone(evidence.reference || null), note: evidence.note || '', source_label: evidence.source_label || '' });
/** Static customer content is projected once at publication, never from a live
    "latest quote" query while reopening an issued proposal. */
function proposalSnapshot(deal, manifest) {
  const alternatives = manifest.map(ref => {
    const quote = findQuote(deal, ref.quote_id), s = quote?.revisions.find(item => item.revision === ref.revision);
    if (!s || s.status !== 'issued') throw new Error('A proposal can only include issued quote revisions from this deal.');
    return {
      quote_id: quote.id, number: quote.number, label: s.label, revision: s.revision, machine_id: quote.machine_id, machine_title: s.draft.machine_title,
      photo: clone(s.draft.machine_snapshot.photo), scope: clone(s.scope_snapshot), customer: s.customer_snapshot, lines: s.draft.lines.map(publicLine), included: s.draft.included_snapshot.map(publicLine),
      media: clone(s.media_snapshot || []),
      resources: clone(s.resource_snapshot || []),
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
  return {
    id: deal.id, number: deal.number, title: latest ? findQuote(deal, latest.quote_id).revisions.find(item => item.revision === latest.revision).title_snapshot : deal.title,
    customer: latest?.customer || deal.customer, scope: clone(latest?.scope || {}), alternatives,
    owner: text(deal.owner), customer_next_decision: text(deal.customer_next_decision), customer_decision_date: text(deal.customer_decision_date),
    evidence: alternatives.flatMap(item => item.evidence).filter((item, index, all) => all.findIndex(other => other.id === item.id) === index),
    illustrative: true,
  };
}

function proposalRecord(deal, proposalId) {
  const proposal = proposalId == null ? deal.proposals?.at(-1) : deal.proposals?.find(item => item.id === proposalId);
  if (!proposal || proposal.deal_id !== deal.id) throw new Error('This proposal version does not belong to the selected deal.');
  return proposal;
}

/** Validate explicit publication choices before touching any record. */
export function proposalManifest(deal, selection) {
  const manifest = selection === undefined
    ? deal.quotes.filter(quote => quote.revisions.length).map(quote => ({ quote_id: quote.id, revision: quote.revisions.at(-1).revision }))
    : selection;
  if (!Array.isArray(manifest) || !manifest.length) throw new Error(selection === undefined ? 'Issue at least one quote before publishing a proposal.' : 'Select at least one issued alternative for this proposal.');
  const seen = new Set();
  return manifest.map(reference => {
    if (!reference || typeof reference !== 'object' || typeof reference.quote_id !== 'string' || !Number.isInteger(reference.revision) || reference.revision < 0) throw new Error('Each proposal selection needs an alternative and an issued revision number.');
    if (seen.has(reference.quote_id)) throw new Error('Include each alternative only once in a proposal.');
    const quote = findQuote(deal, reference.quote_id);
    if (!quote?.revisions.some(item => item.revision === reference.revision && item.status === 'issued')) throw new Error('A proposal can only include issued quote revisions from this deal.');
    seen.add(reference.quote_id);
    return { quote_id: reference.quote_id, revision: reference.revision };
  });
}

/** Publication is separate from quote issue. Repeating the same selected scope
    is idempotent; pending quote edits never enter the fixed manifest. */
export function publishProposal(deal, selection) {
  const manifest = proposalManifest(deal, selection);
  const previous = deal.proposals?.at(-1);
  const snapshot = proposalSnapshot(deal, manifest);
  if (previous && JSON.stringify(previous.manifest) === JSON.stringify(manifest) && JSON.stringify(previous.snapshot) === JSON.stringify(snapshot)) return previous;
  const proposal = freeze({ id: id('proposal'), version: (previous?.version || 0) + 1, deal_id: deal.id, published_at: now(), origin: 'published', manifest, snapshot });
  deal.proposals ||= [];
  deal.proposals.push(proposal);
  deal.customer_responses = (deal.customer_responses || []).map(response => {
    if (response.status !== 'in_progress' || !response.revision_links.length || !response.revision_links.every(link => manifest.some(ref => ref.quote_id === link.quote_id && ref.revision === link.revision))) return response;
    return freeze({ ...response, status: 'addressed', addressed_in_proposal_id: proposal.id, addressed_at: proposal.published_at });
  });
  deal.last_published_proposal_id = proposal.id;
  activity(deal, `Proposal V${proposal.version} published with ${manifest.length} alternative${manifest.length === 1 ? '' : 's'}. Existing versions remain unchanged; sharing is a separate action.`, { proposal_id: proposal.id });
  return proposal;
}

/** Presentation is an explicit salesperson-recorded event, not inferred from issue. */
export function markProposalPresented(deal, proposalId, { actor: author, role = 'sales' } = {}) {
  salesActor(role);
  const proposal = proposalRecord(deal, proposalId);
  const by = required(author, 'Presenter');
  if (['won', 'lost'].includes(deal.status)) throw new Error('Reopen the closed deal before recording a new presentation.');
  deal.proposal_presentations ||= [];
  const event = freeze({ id: id('presentation'), proposal_id: proposal.id, proposal_version: proposal.version, author: by, role, at: now() });
  deal.proposal_presentations.push(event);
  deal.status = 'presented';
  deal.last_contact = event.at;
  activity(deal, `${by} recorded a presentation of Proposal V${proposal.version}.`, { proposal_id: proposal.id, presentation_id: event.id });
  return event;
}

/** Compare commercial and application content, excluding volatile save/review metadata. */
export function compareRevisions(deal, quote, fromRevision, toRevision = 'working') {
  owned(deal, quote);
  const readRevision = value => {
    if (value === 'working') return quote.working.status === 'issued' ? quote.revisions.find(item => item.revision === quote.working.revision) || quote.working : quote.working;
    if (!Number.isInteger(value) || value < 0) throw new Error('Choose a valid revision to compare.');
    const revision = quote.revisions.find(item => item.revision === value);
    if (!revision) throw new Error('The comparison revision does not belong to this quote.');
    return revision;
  };
  const before = readRevision(fromRevision), after = readRevision(toRevision), changes = [];
  const changedFields = (a, b) => [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].filter(key => JSON.stringify(a?.[key] ?? null) !== JSON.stringify(b?.[key] ?? null));
  const append = (section, key, label, a, b) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    changes.push({ section, key, label, kind: a == null ? 'added' : b == null ? 'removed' : 'changed', before: a == null ? null : clone(a), after: b == null ? null : clone(b), fields: changedFields(a, b) });
  };
  const compareItems = (section, beforeItems, afterItems, keyFor, project) => {
    const left = new Map(beforeItems.map(item => [keyFor(item), item]));
    const right = new Map(afterItems.map(item => [keyFor(item), item]));
    for (const key of new Set([...left.keys(), ...right.keys()])) {
      const a = left.get(key), b = right.get(key), item = b || a;
      append(section, key, item.name || item.description || item.title, a ? project(a) : null, b ? project(b) : null);
    }
  };
  const lineContent = item => ({ name: item.name, quantity: item.quantity, price_usd: lineUnitPrice(item), price_unit: item.price_unit, selling_price_reason: item.selling_price_override?.reason || '', description: item.description || '', notes: item.notes || [], flags: item.flags || [] });
  compareItems('configuration', before.draft.lines, after.draft.lines, item => item.quote_line_id, lineContent);
  compareItems('engineering', before.engineering, after.engineering, item => item.id, item => ({ description: item.description, reason: item.reason, option_id: item.option_id, hours: item.hours, materials: item.materials }));
  compareItems('special_orders', before.special, after.special, item => item.id, item => ({ description: item.description, price: item.price, lead_time: item.lead_time }));
  append('application', 'scope', 'Application requirements', before.scope_snapshot || deal.scope, after.scope_snapshot || deal.scope);
  append('commercial', 'terms', 'Commercial terms', before.draft.terms_snapshot, after.draft.terms_snapshot);
  append('commercial', 'discount', 'Discount', before.discount, after.discount);
  append('commercial', 'labor_rate', 'Engineering labor rate', { rate: before.labor_rate }, { rate: after.labor_rate });
  append('catalog', 'catalog_basis', 'Catalog version', { run: before.draft.catalog_run, hash: before.draft.catalog_hash }, { run: after.draft.catalog_run, hash: after.draft.catalog_hash });
  const leftEvidence = before.evidence || relevantEvidence(deal, quote), rightEvidence = after.evidence || relevantEvidence(deal, quote);
  compareItems('evidence', leftEvidence, rightEvidence, item => item.id, item => ({ title: item.title, note: item.note || '', model_id: item.model_id || null, model_revision: item.model_revision || null, reference: item.reference || null }));
  const beforeTotals = totals(before), afterTotals = totals(after);
  return { quote_id: quote.id, from_revision: before.revision, to_revision: after.revision, from_status: before.status, to_status: after.status, changes, has_changes: changes.length > 0, totals: { before: beforeTotals, after: afterTotals, delta: beforeTotals.pending || afterTotals.pending ? null : round(afterTotals.total - beforeTotals.total) } };
}

/** Upgrade existing browser records without manufacturing historical proposal
    identities for their old comments. Their original quote references remain in
    seller history. JSON reload also restores issued-record immutability. */
export function migrateWorkspace(saved) {
  if (!saved || saved.version !== 1 || !Array.isArray(saved.deals)) throw new Error('The workspace cannot be read.');
  const migrated = clone(saved);
  for (const deal of migrated.deals) {
    const legacy = !Array.isArray(deal.proposals);
    if (legacy) {
      deal.proposals = [];
      const manifest = deal.quotes.filter(quote => quote.revisions.length).map(quote => ({ quote_id: quote.id, revision: quote.revisions.at(-1).revision }));
      if (manifest.length) deal.proposals.push({ id: `proposal-${deal.id}-legacy-v1`, version: 1, deal_id: deal.id, published_at: now(), origin: 'legacy_import', manifest, snapshot: proposalSnapshot(deal, manifest) });
    }
    deal.customer_responses ||= [];
    deal.contacts ||= [];
    deal.proposal_presentations ||= [];
    deal.proposal_selections ||= [];
    if (legacy && deal.proposals.length && deal.selected_quote_id && Number.isInteger(deal.selected_quote_revision) && deal.proposals[0].manifest.some(ref => ref.quote_id === deal.selected_quote_id && ref.revision === deal.selected_quote_revision)) {
      deal.proposal_selections.push({ id: `preference-${deal.id}-legacy`, proposal_id: deal.proposals[0].id, quote_id: deal.selected_quote_id, revision: deal.selected_quote_revision, at: deal.proposals[0].published_at, origin: 'legacy_import' });
    }
    for (const quote of deal.quotes) quote.revisions.forEach(freeze);
    for (const key of ['proposals', 'customer_responses', 'proposal_selections', 'proposal_presentations', 'evidence', 'comments']) (deal[key] || []).forEach(freeze);
  }
  migrated.proposal_schema_version = 1;
  return migrated;
}

export function recordCustomerResponse(deal, input) {
  const proposal = proposalRecord(deal, required(input.proposal_id, 'Proposal version'));
  if (!['question', 'changes_requested'].includes(input.kind)) throw new Error('Choose a question or a change request.');
  const body = required(input.body, 'Customer response');
  if (body.length > 10000) throw new Error('Keep the response under 10,000 characters.');
  const reference = input.quote_id ? proposal.manifest.find(ref => ref.quote_id === input.quote_id) : null;
  if (input.quote_id && !reference) throw new Error('Choose an alternative included in this proposal.');
  if (input.revision != null && (!reference || Number(input.revision) !== reference.revision)) throw new Error('The response must refer to the revision shown in this proposal.');
  const section = text(input.section) || 'general';
  if (!['general', 'application', 'recommendation', 'equipment', 'options', 'pricing', 'terms'].includes(section)) throw new Error('Choose a valid proposal section.');
  const lineId = text(input.line_id) || null;
  const alternative = reference ? proposal.snapshot.alternatives.find(item => item.quote_id === reference.quote_id) : null;
  if (lineId && ![...(alternative?.lines || []), ...(alternative?.included || [])].some(item => item.quote_line_id === lineId)) throw new Error('Choose a line included in this proposal alternative.');
  const response = freeze({ id: id('response'), proposal_id: proposal.id, proposal_version: proposal.version, quote_id: reference?.quote_id || null, revision: reference?.revision ?? null, proposal_revisions: clone(proposal.manifest), kind: input.kind, body, author: required(input.author || 'Demo customer', 'Customer name'), owner: text(input.owner || deal.owner), at: now(), status: 'open', section, line_id: lineId, replies: [], status_history: [], revision_links: [], addressed_in_proposal_id: null });
  deal.customer_responses ||= [];
  deal.customer_responses.push(response);
  deal.last_contact = response.at;
  activity(deal, `${input.kind === 'changes_requested' ? 'Customer changes requested' : 'Customer question received'} on Proposal V${proposal.version}.`, { proposal_id: proposal.id, response_id: response.id, quote_id: response.quote_id, revision: response.revision });
  return response;
}

function responseAt(deal, responseId) {
  const index = deal.customer_responses?.findIndex(item => item.id === responseId) ?? -1;
  if (index < 0) throw new Error('This customer response does not belong to the selected deal.');
  const response = deal.customer_responses[index];
  proposalRecord(deal, response.proposal_id);
  return { index, response };
}

/** Replies add a new event while preserving the customer's original words and basis. */
export function replyToResponse(deal, responseId, input) {
  actor(input.role);
  const { index, response } = responseAt(deal, responseId);
  const body = required(input.body, 'Reply');
  if (body.length > 10000) throw new Error('Keep the reply under 10,000 characters.');
  const reply = freeze({ id: id('reply'), body, author: required(input.author, 'Reply author'), role: input.role, at: now(), proposal_id: response.proposal_id, response_id: response.id });
  deal.customer_responses[index] = freeze({ ...response, replies: [...(response.replies || []), reply] });
  activity(deal, `${reply.author} replied to a customer ${response.kind === 'question' ? 'question' : 'request'} on Proposal V${response.proposal_version}.`, { response_id: response.id, proposal_id: response.proposal_id, quote_id: response.quote_id, revision: response.revision });
  return deal.customer_responses[index];
}

/** Resolve/decline/reopen discussion; only publication can mark a revision addressed. */
export function setResponseStatus(deal, responseId, input) {
  salesActor(input.role);
  const { index, response } = responseAt(deal, responseId);
  if (!['open', 'resolved', 'declined'].includes(input.status)) throw new Error('Choose Open, Resolved or Declined for the customer response.');
  if (input.status === response.status) return response;
  if (response.status === 'in_progress') throw new Error('Publish the revision linked to this request before changing its discussion status.');
  if (response.kind === 'changes_requested' && input.status === 'resolved' && !response.addressed_in_proposal_id) throw new Error('Publish a revised proposal to address this change request, or decline it with a reason.');
  const reason = required(input.reason, input.status === 'open' ? 'Reason for reopening' : 'Resolution reason');
  if (reason.length > 10000) throw new Error('Keep the resolution reason under 10,000 characters.');
  const by = required(input.author, 'Response owner');
  const at = now();
  const entry = freeze({ id: id('response-status'), from: response.status, to: input.status, reason, author: by, at });
  deal.customer_responses[index] = freeze({ ...response, status: input.status, status_history: [...(response.status_history || []), entry], resolution: { status: input.status, reason, author: by, at } });
  activity(deal, `${by} ${input.status === 'open' ? 'reopened' : input.status} a customer ${response.kind === 'question' ? 'question' : 'request'} on Proposal V${response.proposal_version}.`, { response_id: response.id, proposal_id: response.proposal_id });
  return deal.customer_responses[index];
}

/** A change request must be reconciled explicitly when its quote basis is old.
    Repeating this command for the same active linked draft is safe. */
export function reviseFromResponse(deal, responseId, quoteId) {
  const index = deal.customer_responses?.findIndex(item => item.id === responseId) ?? -1;
  if (index < 0) throw new Error('This customer response does not belong to the selected deal.');
  const response = deal.customer_responses[index];
  if (response.kind !== 'changes_requested') throw new Error('A question does not request a quote revision.');
  if (response.status === 'addressed') throw new Error('This request already has a revised proposal.');
  if (['resolved', 'declined'].includes(response.status)) throw new Error('Reopen this customer request before creating a revision.');
  if (response.quote_id && quoteId && quoteId !== response.quote_id) throw new Error('Revise the alternative named in this customer request.');
  const targetId = response.quote_id || quoteId;
  const reference = response.proposal_revisions.find(item => item.quote_id === targetId), quote = findQuote(deal, targetId);
  if (!quote || !reference) throw new Error('Choose an alternative included in the customer’s proposal.');
  const existingLink = response.revision_links.find(item => item.quote_id === quote.id);
  if (existingLink) {
    if (quote.working.status === 'draft' && quote.working.revision === existingLink.revision) return quote;
    throw new Error('This request already has a linked quote revision. Publish that revision in a proposal.');
  }
  if (quote.revisions.at(-1)?.revision !== reference.revision) throw new Error('This request refers to an earlier quote revision. Reconcile it with the latest issued quote before revising.');
  reviseQuote(deal, quote, `Customer request on Proposal V${response.proposal_version}: ${response.body}`);
  quote.working.customer_response_id = response.id;
  quote.working.source_proposal_id = response.proposal_id;
  const link = { quote_id: quote.id, revision: quote.working.revision, based_on_revision: reference.revision };
  deal.customer_responses[index] = freeze({ ...response, status: 'in_progress', revision_links: [...response.revision_links, link] });
  activity(deal, `Customer request linked to ${quote.label} Rev ${quote.working.revision}.`, { response_id: response.id, proposal_id: response.proposal_id, quote_id: quote.id, revision: quote.working.revision });
  return quote;
}

const publicResponse = response => ({ id: response.id, proposal_id: response.proposal_id, proposal_version: response.proposal_version, quote_id: response.quote_id, revision: response.revision, kind: response.kind, body: response.body, author: response.author, at: response.at, status: response.status, section: response.section || 'general', line_id: response.line_id || null, replies: (response.replies || []).map(reply => ({ id: reply.id, body: reply.body, author: reply.author, at: reply.at, proposal_id: reply.proposal_id, response_id: reply.response_id })), resolution: response.resolution ? clone(response.resolution) : null, revision_links: clone(response.revision_links), addressed_in_proposal_id: response.addressed_in_proposal_id, addressed_at: response.addressed_at || null });

/** Customer content is fixed; discussion remains live but is scoped to this
    exact proposal. Legacy comments remain in seller history without guessed IDs. */
export function publicProposal(deal, proposalId) {
  if (proposalId == null && !deal.proposals?.length) return { id: deal.id, number: deal.number, title: deal.title, customer: deal.customer, owner: text(deal.owner), customer_next_decision: '', customer_decision_date: '', scope: {}, alternatives: [], evidence: [], illustrative: true, proposal_id: null, proposal_version: null, published_at: null, manifest: [], comments: [], responses: [], selected_quote_id: null, selected_quote_revision: null };
  const proposal = proposalRecord(deal, proposalId);
  const selection = [...(deal.proposal_selections || [])].reverse().find(item => item.proposal_id === proposal.id && proposal.manifest.some(ref => ref.quote_id === item.quote_id && ref.revision === item.revision));
  // Older stored snapshots contained seller follow-up fields. Project an explicit
  // public allowlist without mutating any issued scope, amount or stored version.
  const snapshot = {};
  for (const field of ['id', 'number', 'title', 'customer', 'scope', 'alternatives', 'owner', 'evidence', 'illustrative']) if (proposal.snapshot[field] !== undefined) snapshot[field] = clone(proposal.snapshot[field]);
  snapshot.customer_next_decision = text(proposal.snapshot.customer_next_decision);
  snapshot.customer_decision_date = text(proposal.snapshot.customer_decision_date);
  return { ...snapshot, proposal_id: proposal.id, proposal_version: proposal.version, published_at: proposal.published_at, manifest: clone(proposal.manifest), comments: clone(deal.comments.filter(item => item.visibility === 'customer' && item.proposal_id === proposal.id)), responses: (deal.customer_responses || []).filter(item => item.proposal_id === proposal.id).map(publicResponse), selected_quote_id: selection?.quote_id || null, selected_quote_revision: selection?.revision ?? null };
}

/** Add a repeatable demonstration without resetting or migrating the user's work.
    Only the scenario content is fixed: every run receives fresh record identities.
    Build off-workspace so a changed/incomplete catalog cannot leave a partial deal. */
export function createDemoScenario(catalog, state) {
  if (!state || state.version !== 1 || !Array.isArray(state.deals)) throw new Error('The workspace cannot be read.');
  const training = D.getPriceLines(catalog, 'r3200').find(line => line.line_class === 'service' && /start.up.*training/i.test(line.name));
  const opener = D.getOption(catalog, 'r3200', 'easy_load_bag_opener');
  const spareKit = D.getOption(catalog, 'r3200', 'spare_parts_kit');
  if (!training || !opener || !spareKit) throw new Error('The demonstration requires the R3200 training service, Easy Load option and Spare Parts Kit in the source catalog.');

  const scenario = { version: 1, deals: [] };
  const deal = createDeal(scenario, {
    title: 'Hardware kit bagging', customer: 'Northstar Components', owner: 'Kyle Xu',
    crm_id: 'DEMO-CRM-1042',
    scope: {
      application: 'Mixed hardware kits', bag_dimensions: '12 × 16 in', throughput: '25 bags/min',
      notes: 'Manual loading. Confirm bag material, product samples and operator workflow with PAC.',
    },
    next_action: 'Add the requested spare parts kit to Alternative B and publish a revised proposal.',
    next_action_date: '2026-11-09', last_contact: '2026-11-07',
  });
  const numbers = new Set(state.deals.map(item => item.number));
  let sequence = 14;
  while (numbers.has(`PAC-2026-${String(sequence).padStart(3, '0')}`)) sequence++;
  deal.number = `PAC-2026-${String(sequence).padStart(3, '0')}`;
  deal.crm_id = `DEMO-${deal.number}`;
  deal.demo_scenario = 'pac-mercury-review-v1';

  const a = addQuote(catalog, deal, { machine_id: 'r3200', label: 'Standard loading' });
  selectOption(catalog, deal, a, training);
  reviewQuote(catalog, deal, a, 'application', 'sales');
  issueQuote(catalog, deal, a);

  const b = addQuote(catalog, deal, { machine_id: 'r3200', label: 'Assisted loading' });
  selectOption(catalog, deal, b, opener);
  selectOption(catalog, deal, b, training);
  reviewQuote(catalog, deal, b, 'application', 'sales');
  issueQuote(catalog, deal, b);
  if (totals(a).total !== 33060 || totals(b).total !== 40810 || spareKit.price_usd !== 1130) {
    throw new Error('Source catalog prices no longer match the reviewed demonstration. Confirm the scenario before creating it.');
  }

  const proposal = publishProposal(deal);
  recordCustomerResponse(deal, {
    proposal_id: proposal.id, quote_id: b.id, revision: 0, kind: 'changes_requested',
    body: 'Please add a spare parts kit to the assisted-loading option.', author: 'Northstar Components',
  });
  activity(deal, 'Demonstration scenario created. Customer, CRM reference and reviews are illustrative; no customer was contacted.');
  state.deals.push(deal);
  return deal;
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
  publishProposal(deal);
  addComment(deal, { body: 'Can we review how assisted loading would change the operator workflow?', author: 'Demo customer', quote_id: b.id, revision: 0 });
  activity(deal, 'Staged demo: catalog-backed prices; customer, CRM reference and approvals are illustrative.');
  return state;
}
