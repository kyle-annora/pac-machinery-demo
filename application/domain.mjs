// Bounded R3200 demonstration domain. Dated sample prices are not current PAC offers.
// No CRM, authentication, signature, payment or external delivery is simulated here.
export const BASIS = Object.freeze({ date: '2025-01-29', base: 27580, training: 5480, opener: 6035, fingers: 1715 });
export const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const fingerprint = value => JSON.stringify(stable(value));
const text = value => typeof value === 'string' ? value.trim() : '';
const numeric = value => (typeof value === 'number' || typeof value === 'string') && value !== '' && String(value).trim() !== '' && Number.isFinite(Number(value));
const nonnegative = value => numeric(value) && Number(value) >= 0;
const positive = value => numeric(value) && Number(value) > 0;
const validQuantity = value => positive(value) && Number.isInteger(Number(value));
const copyValue = value => value === undefined ? null : clone(value);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const engineeringEstimateFields = ['reason', 'laborHours', 'laborRate', 'materials', 'estimate'];
const hasEstimate = engineering => engineeringEstimateFields.some(key => own(engineering, key));
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};

export function money(value) {
  return numeric(value) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value)) : 'Pending';
}

export function initialState() {
  const quote = (id, name, assisted) => ({
    id, name, revision: 0, opener: assisted, fingers: assisted, training: true, quantity: 1,
    engineering: { enabled: false, description: '', amount: null, leadWeeks: null },
    note: '', status: 'draft', savedSnapshot: null, approvedFingerprint: null,
  });
  return {
    schema: 1,
    deal: { id: 'deal-harbor-components', name: 'Harbor Components · R3200', company: 'Harbor Components', contact: 'Alex Morgan', email: 'alex@harbor.example', owner: 'PAC sales team' },
    scope: { width: 12, length: 16, material: 'Polyethylene', target: '20 bags/min', notes: 'Illustrative buyer requirements. Application fit and performance require PAC confirmation.' },
    quotes: { a: quote('a', 'Standard loading', false), b: quote('b', 'Assisted loading', true) },
    activeQuote: 'b', publications: [], comments: [],
  };
}

function getQuote(state, id) {
  if (!['a', 'b'].includes(id) || !state?.quotes?.[id] || state.quotes[id].id !== id) throw Error('Choose a valid quote alternative.');
  return state.quotes[id];
}
function scopeInput(scope = {}) {
  return { width: copyValue(scope.width), length: copyValue(scope.length), material: copyValue(scope.material), target: copyValue(scope.target), notes: copyValue(scope.notes ?? '') };
}
function quoteInput(q) {
  const e = q.engineering || {};
  return {
    id: q.id, name: copyValue(q.name), revision: copyValue(q.revision),
    opener: q.opener, fingers: q.fingers, training: q.training, quantity: copyValue(q.quantity),
    engineering: { enabled: Boolean(e.enabled), description: copyValue(e.description ?? ''), amount: copyValue(e.amount), leadWeeks: copyValue(e.leadWeeks),
      ...(hasEstimate(e) ? Object.fromEntries(engineeringEstimateFields.map(key => [key, copyValue(e[key])])) : {}) },
    ...(own(q, 'baseLeadWeeks') ? { baseLeadWeeks: copyValue(q.baseLeadWeeks), leadTimeStatus: copyValue(q.leadTimeStatus ?? 'Planning time') } : {}),
    note: copyValue(q.note ?? ''),
  };
}
function currentSnapshot(state, id) {
  const q = getQuote(state, id);
  return { quote: quoteInput(q), scope: scopeInput(state.scope), basis: clone(BASIS), lines: quoteLines(q), total: quoteTotal(q) };
}
function snapshotCurrent(state, id) {
  const q = getQuote(state, id);
  return Boolean(q.savedSnapshot) && fingerprint(q.savedSnapshot) === fingerprint(currentSnapshot(state, id));
}

export function quoteLines(q) {
  // Customer projections have their own frozen, issued line prices.
  if (Array.isArray(q?.lines)) return q.lines.map(projectLine);
  if (!q || typeof q !== 'object') throw Error('Choose a valid quote.');
  const quantity = validQuantity(q.quantity) ? Number(q.quantity) : null;
  const line = (id, name, detail, unitPrice, count, kind) => ({ id, name, detail, quantity: count, unitPrice, total: unitPrice === null || count === null ? null : Math.round(unitPrice * count * 100) / 100, kind });
  const lines = [line('base', 'Rollbag R3200', 'Automatic bagging system', BASIS.base, quantity, 'machine')];
  if (q.opener) lines.push(line('opener', 'Easy Load Bag Opener', 'Assisted bag opening; requires Seal Flattener Fingers and bags at least 10 inches wide.', BASIS.opener, quantity, 'option'));
  if (q.fingers) lines.push(line('fingers', 'Seal Flattener Fingers', 'Required companion when Easy Load Bag Opener is selected.', BASIS.fingers, quantity, 'option'));
  // The bounded sample prices training once per quote, not once per machine.
  if (q.training) lines.push(line('training', 'On-Site Start-Up & Training', 'One service allowance for this sample quote.', BASIS.training, 1, 'service'));
  if (q.engineering?.enabled) lines.push(line('engineering', 'Application engineering', text(q.engineering.description) || 'Scope to be confirmed', nonnegative(q.engineering.amount) ? Number(q.engineering.amount) : null, 1, 'custom'));
  return lines;
}

export function quoteTotal(q) {
  const lines = quoteLines(q);
  return lines.some(line => !nonnegative(line.total)) ? null : Math.round(lines.reduce((sum, line) => sum + Number(line.total), 0) * 100) / 100;
}

function inputBlockers(state, id) {
  const q = getQuote(state, id), scope = state.scope || {}, e = q.engineering || {};
  return [
    !text(q.name) && 'Name this quote alternative.',
    (!Number.isInteger(q.revision) || q.revision < 0) && 'The quote revision is invalid.',
    !validQuantity(q.quantity) && 'Enter a whole machine quantity of at least 1.',
    (!positive(scope.width) || !positive(scope.length)) && 'Enter positive bag width and length.',
    !text(scope.material) && 'Record the bag material.',
    !text(scope.target) && 'Record the buyer’s production target.',
    ![q.opener, q.fingers, q.training, e.enabled].every(value => typeof value === 'boolean') && 'Choose valid option selections.',
    q.opener && (!positive(scope.width) || Number(scope.width) < 10) && 'Easy Load Bag Opener requires bags at least 10 inches wide.',
    q.opener && !q.fingers && 'Easy Load Bag Opener requires Seal Flattener Fingers.',
    e.enabled && !text(e.description) && 'Describe the application engineering scope.',
    e.enabled && hasEstimate(e) && !text(e.reason) && 'Explain why this engineering requirement is needed.',
    e.enabled && hasEstimate(e) && !nonnegative(e.laborHours) && 'Enter the engineering labor hours.',
    e.enabled && hasEstimate(e) && !nonnegative(e.laborRate) && 'Enter the assumed engineering labor rate.',
    e.enabled && hasEstimate(e) && !nonnegative(e.materials) && 'Enter the engineering materials allowance.',
    e.enabled && hasEstimate(e) && (!nonnegative(e.estimate) || ![e.laborHours, e.laborRate, e.materials].every(nonnegative) || Math.round((Number(e.laborHours) * Number(e.laborRate) + Number(e.materials)) * 100) / 100 !== Number(e.estimate)) && 'Recalculate the engineering estimate from hours, rate and materials.',
    own(q, 'baseLeadWeeks') && !nonnegative(q.baseLeadWeeks) && 'Confirm the base planning lead time.',
    e.enabled && !nonnegative(e.amount) && 'Enter a confirmed customer price for application engineering. Pending is not zero.',
    e.enabled && !nonnegative(e.leadWeeks) && 'Confirm the additional engineering lead time in weeks.',
    quoteTotal(q) === null && 'Resolve all quantities and customer prices before approval.',
  ].filter(Boolean);
}

export function validateQuote(state, id) {
  const q = getQuote(state, id), errors = inputBlockers(state, id);
  if (!snapshotCurrent(state, id)) errors.push(q.status === 'published' ? 'This published quote or its scope changed. Create a revision before editing.' : 'Save the current configuration and application scope.');
  if (['approved', 'published'].includes(q.status) && q.approvedFingerprint !== fingerprint(currentSnapshot(state, id))) errors.push('The approval is out of date. Save and approve the current quote again.');
  return errors;
}

export function saveQuote(state, id) {
  const q = getQuote(state, id);
  if (q.status === 'published') throw Error('Published quotes are read-only. Create a revision first.');
  // Drafts can preserve missing engineering inputs. Completeness gates approval.
  q.savedSnapshot = freeze(currentSnapshot(state, id));
  q.approvedFingerprint = null;
  q.status = 'saved';
  return q;
}

export function approveQuote(state, id) {
  const q = getQuote(state, id);
  if (q.status === 'published') throw Error('Published quotes are read-only. Create a revision first.');
  const errors = inputBlockers(state, id);
  if (errors.length) throw Error(errors[0]);
  if (!snapshotCurrent(state, id) || !['saved', 'approved'].includes(q.status)) throw Error('Save the current configuration and application scope before approval.');
  q.approvedFingerprint = fingerprint(currentSnapshot(state, id));
  q.status = 'approved';
  return q;
}

function projectLine(line) {
  const projected = { id: line.id, name: line.name, detail: line.detail, quantity: line.quantity, unitPrice: line.unitPrice, total: line.total, kind: line.kind };
  if (typeof line.included === 'boolean') projected.included = line.included;
  return projected;
}
function customerQuote(q) {
  const e = q.engineering || {};
  return {
    id: q.id, name: q.name, revision: q.revision, opener: q.opener, fingers: q.fingers,
    training: q.training, quantity: Number(q.quantity), note: text(q.note), status: 'published',
    engineering: { enabled: Boolean(e.enabled), description: e.enabled ? text(e.description) : '', leadWeeks: e.enabled && nonnegative(e.leadWeeks) ? Number(e.leadWeeks) : null },
    lines: quoteLines(q).map(projectLine), total: quoteTotal(q),
    ...(own(q, 'baseLeadWeeks') ? {
      baseLeadWeeks: nonnegative(q.baseLeadWeeks) ? Number(q.baseLeadWeeks) : null,
      planningLeadWeeks: nonnegative(q.baseLeadWeeks) && (!e.enabled || nonnegative(e.leadWeeks)) ? Number(q.baseLeadWeeks) + (e.enabled ? Number(e.leadWeeks) : 0) : null,
      leadTimeStatus: text(q.leadTimeStatus) || 'Planning time',
    } : {}),
  };
}

export function publicProjection(publication) {
  if (!publication?.quotes?.a || !publication?.quotes?.b) throw Error('Choose a published proposal.');
  return {
    id: publication.id, version: publication.version, createdAt: publication.createdAt,
    sample: true, basis: { date: BASIS.date, label: 'Dated source-template prices · sample proposal' },
    scope: scopeInput(publication.scope),
    customer: { company: publication.customer?.company, contact: publication.customer?.contact },
    quotes: { a: customerQuote(publication.quotes.a), b: customerQuote(publication.quotes.b) },
  };
}

function customerContent(publication) {
  const content = publicProjection(publication);
  delete content.id; delete content.version; delete content.createdAt;
  for (const q of Object.values(content.quotes)) delete q.revision;
  return content;
}

export function publishProposal(state, { createdAt } = {}) {
  if (createdAt !== undefined && (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt)))) throw Error('Provide a valid publication timestamp.');
  if (!text(state.deal?.company) || !text(state.deal?.contact)) throw Error('Confirm the customer company and contact before publishing.');
  for (const id of ['a', 'b']) {
    const q = getQuote(state, id), errors = validateQuote(state, id);
    if (errors.length) throw Error(`${q.name}: ${errors[0]}`);
    if (!['approved', 'published'].includes(q.status) || q.approvedFingerprint !== fingerprint(currentSnapshot(state, id))) throw Error(`Save and approve ${q.name} before publishing.`);
  }
  const latest = state.publications.at(-1);
  const next = publicProjection({
    id: `${state.deal.id}-proposal-v${(latest?.version || 0) + 1}`,
    version: (latest?.version || 0) + 1, createdAt: createdAt ?? new Date().toISOString(),
    scope: state.scope, customer: state.deal, quotes: state.quotes,
  });
  if (latest && fingerprint(customerContent(next)) === fingerprint(customerContent(latest))) {
    if (['a', 'b'].every(id => state.quotes[id].status === 'published')) return freeze(latest);
    throw Error('There are no customer-facing changes to publish. Edit the revised quote before creating another proposal version.');
  }
  // Frozen copies share no references with editable state or caller inputs.
  const publication = freeze(next);
  state.publications.push(publication);
  for (const id of ['a', 'b']) state.quotes[id].status = 'published';
  return publication;
}

export function reviseQuote(state, id) {
  const q = getQuote(state, id), latest = state.publications.at(-1);
  if (q.status !== 'published' || !latest?.quotes?.[id] || latest.quotes[id].revision !== q.revision) throw Error('Publish this quote before creating its next revision.');
  if (!q.savedSnapshot?.quote) throw Error('The published quote’s saved configuration is unavailable.');
  // Restore the saved issued inputs even if an editor attempted to mutate them.
  const revised = clone(q.savedSnapshot.quote);
  revised.revision += 1;
  revised.status = 'draft'; revised.savedSnapshot = null; revised.approvedFingerprint = null;
  state.quotes[id] = revised; state.activeQuote = id;
  return revised;
}

export function addComment(state, { version, alternative, topic = 'General', author, text: message } = {}) {
  const publication = state.publications.find(item => item.version === version);
  if (!publication) throw Error('Choose an existing published proposal version.');
  const id = typeof alternative === 'string' ? alternative.toLowerCase() : '';
  if (!['a', 'b'].includes(id) || !publication.quotes[id]) throw Error('Choose an alternative in this proposal version.');
  if (!text(author)) throw Error('Enter your name before posting a comment.');
  if (!text(message)) throw Error('Write a question or change request.');
  const comment = {
    id: `comment-${state.comments.length + 1}`, version, alternative: id,
    revision: publication.quotes[id].revision, topic: text(topic) || 'General',
    author: text(author), text: text(message), createdAt: new Date().toISOString(), status: 'open',
  };
  state.comments.push(comment);
  return comment;
}
