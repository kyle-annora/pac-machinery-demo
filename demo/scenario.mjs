/**
 * Deterministic, isolated rehearsal of the approved PAC sales script.
 * Each checkpoint is reconstructed through the same quote domain commands used by
 * the current application. The caller persists the result in its own demo store.
 * No Website data, browser storage, external service or reviewed Deal is read here.
 */
import {
  BASIS, initialState, clone, quoteLines, quoteTotal, validateQuote,
  saveQuote, approveQuote, publishProposal, reviseQuote, addComment, publicProjection,
} from '../application/domain.mjs';
import { hydrateDealState, addFinding, updateDealDetails } from '../application/deal-domain.mjs';

export const WORKSPACE_STEPS = Object.freeze([
  ...Array.from({ length: 19 }, (_, i) => `A${String(i + 6).padStart(2, '0')}`),
  ...Array.from({ length: 16 }, (_, i) => `B${String(i + 1).padStart(2, '0')}`),
]);
export const SAMPLE = Object.freeze({
  baseLeadWeeks: 6, priceBasis: BASIS.date, date: '2026-11-09', followUpDate: '2026-11-12',
  engineering: Object.freeze({ laborHours: 4, laborRate: 100, materials: 100, estimate: 500, amount: 500, leadWeeks: 1 }),
});
export const QUESTION = 'Could you include a loading guide for our irregular hardware parts in Option B, and show the price and timing impact?';
export const REPLY = 'Proposal V2 adds a $500 illustrative loading-guide engineering allowance to Option B and shows a one-week planning impact. Final geometry and application fit need PAC review of your sample parts and bags. Please review V2 and confirm the sample-review step.';
export const CLARIFICATION = 'Hi PAC team — our pre-opened polyethylene bags are 12 inches wide by 16 inches long. We load the hardware kits by hand. We would like to evaluate assisted bag opening. Our target is 20 bags per minute. — Alex';
const ENGINEERING_SCOPE = 'Loading-guide design and fabrication allowance for irregular hardware parts.';
const ENGINEERING_REASON = 'Support repeatable manual positioning during loading. Final geometry requires PAC review of representative parts and bags.';
const BASE_SCOPE = 'Package irregular hardware kits in polyethylene bags using manual loading. Compare standard loading with assisted bag opening. Confirm bag dimensions before preparing options.';
const ASSET_ROOT = '../application/assets/';
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze); Object.freeze(value);
  }
  return value;
};
const stamp = stepId => new Date(Date.UTC(2026, 10, 9, 17, WORKSPACE_STEPS.indexOf(stepId))).toISOString();
const require = (condition, message) => { if (!condition) throw Error(message); };
const view = (page, extras = {}) => ({ page, quoteId: 'b', ...extras });
const currentTotal = state => ({ a: quoteTotal(state.quotes.a), b: quoteTotal(state.quotes.b) });

function seed() {
  const s = hydrateDealState(initialState());
  Object.assign(s.deal, {
    id: 'DEMO-HARBOR', code: 'DEMO-042', opportunityReference: 'DEMO-042',
    owner: 'PAC sales team · demo', application: 'Irregular hardware kits', process: 'Manual loading',
    nextAction: 'Confirm bag dimensions before preparing quote alternatives.', followUpDate: '',
    stage: 'Qualifying', source: 'Prepared sales example', crmConnection: null,
  });
  Object.assign(s.scope, { width: null, length: null, notes: BASE_SCOPE });
  for (const q of Object.values(s.quotes)) {
    q.opener = false; q.fingers = false;
    q.baseLeadWeeks = SAMPLE.baseLeadWeeks;
    q.leadTimeStatus = 'Illustrative planning time · PAC to confirm';
  }
  s.quotes.a.name = 'Standard loading'; s.quotes.b.name = 'Assisted loading'; s.activeQuote = 'a';
  s.meta = {
    sample: true, sampleLabel: 'Illustrative sales case', quotesCreated: false, requirementsConfirmed: false,
    priceVisible: true, clarification: null, approvalRecords: [], events: [],
    engineeringStatus: 'Not requested', waitingOn: 'Customer bag dimensions', lastContact: null,
    fitCondition: 'PAC must confirm application fit using representative bags and parts.',
    priceNote: 'Sample source-template prices dated January 29, 2025. Not a current PAC offer.',
    timingNote: 'Six-week base planning time and engineering timing are illustrative.',
    excludedScope: 'Freight, tax and final commercial terms require PAC confirmation.',
    application: 'Irregular hardware kits', revisionSource: null,
  };
  return s;
}

function event(s, stepId, action, entity = 'DEMO-HARBOR') {
  s.meta.events.push({ id: `event-${stepId}-${entity}`, stepId, action, entity, at: stamp(stepId), sample: true });
}
function saved(s, id, stepId) {
  saveQuote(s, id); event(s, stepId, `Saved Option ${id.toUpperCase()} Rev ${s.quotes[id].revision}`, id);
}
function approved(s, id, stepId) {
  approveQuote(s, id);
  const q = s.quotes[id];
  s.meta.approvalRecords.push({
    id: `approval-${id}-${q.revision}`, quoteId: id, revision: q.revision, actor: 'Demo reviewer',
    at: stamp(stepId), fingerprint: q.approvedFingerprint, total: quoteTotal(q), sample: true,
  });
  event(s, stepId, `Approved Option ${id.toUpperCase()} Rev ${q.revision}`, id);
}
function resourceManifest(publication) {
  const version = publication.version;
  return [
    {
      id: `quote-v${version}`, kind: 'quote-pdf', label: `Quote V${version}.pdf`,
      href: `./documents/quote-v${version}.pdf`, mimeType: 'application/pdf', version,
      revisions: { a: publication.quotes.a.revision, b: publication.quotes.b.revision },
      totals: { a: publication.quotes.a.total, b: publication.quotes.b.total },
      scope: 'Frozen sample quote document for this publication',
    },
    {
      id: `r3200-reference-v${version}`, kind: 'product-reference', label: 'PAC Rollbag R3200 product reference',
      href: 'https://www.pacmachinery.com/products/rollbag-r3200-and-r3200xl/', version,
      scope: 'General model reference; not an exact assembled configuration',
    },
    {
      id: `opener-reference-v${version}`, kind: 'option-reference', label: 'Easy Load Bag Opener reference photograph',
      href: `${ASSET_ROOT}easy-load.jpg`, version,
      scope: 'Official option photograph; no custom-guide geometry is represented',
    },
  ];
}
function issued(s, stepId) {
  const publication = publishProposal(s, { createdAt: stamp(stepId) });
  // Resource manifests are generated from the frozen customer projection, never
  // from a live draft. They remain version-bound when a later quote is revised.
  const withResources = deepFreeze({ ...clone(publication), resourceManifest: resourceManifest(publication) });
  s.publications[s.publications.length - 1] = withResources;
  s.deal.stage = 'Proposal published';
  event(s, stepId, `Published Proposal V${publication.version}`, publication.id);
  return withResources;
}

function validateApplication(scope) {
  require(Number.isFinite(Number(scope.width)) && Number(scope.width) > 0 && Number.isFinite(Number(scope.length)) && Number(scope.length) > 0, 'Confirm bag width and length before preparing quote alternatives.');
  require(typeof scope.material === 'string' && scope.material.trim(), 'Confirm the bag material before preparing quote alternatives.');
  require(typeof scope.target === 'string' && scope.target.trim(), 'Confirm the customer target before preparing quote alternatives.');
}

export function confirmRequirements(state, values) {
  require(!state.publications.length, 'Use the quote revision workflow to change published application scope.');
  const scope = { ...state.scope, ...values };
  validateApplication(scope);
  state.scope = scope;
  state.meta.requirementsConfirmed = true;
}

/** The quote-creation gate is independent of UI visibility. */
export function createAlternatives(state) {
  validateApplication(state.scope || {});
  require(typeof state.deal?.opportunityReference === 'string' && state.deal.opportunityReference.trim(), 'Record the opportunity reference before preparing quote alternatives.');
  require(Boolean(state.meta?.requirementsConfirmed), 'Confirm the application facts before preparing quote alternatives.');
  state.meta.quotesCreated = true;
  state.deal.stage = 'Configuring';
  return state.quotes;
}
function expectedFailure(fn, code, matcher, additional = []) {
  try { fn(); } catch (error) {
    require(matcher.test(error.message), `Unexpected validation failure: ${error.message}`);
    return { code, messages: [...new Set([error.message, ...additional])] };
  }
  throw Error(`The expected ${code} gate did not block the action.`);
}

function apply(s, stepId) {
  let screen = view('overview'), expectedBlock = null, receipt = null, focus = null;
  switch (stepId) {
    case 'A06': screen = view('transition'); break;
    case 'A07': screen = view('overview'); break;
    case 'A08':
      screen = view('requirements', { section: 'missing' });
      expectedBlock = expectedFailure(() => createAlternatives(s), 'MISSING_REQUIRED', /bag width and length/);
      break;
    case 'A09':
      s.meta.clarification = { text: CLARIFICATION, suggested: { width: 12, length: 16, material: 'Polyethylene', target: '20 bags/min' }, confirmed: false, source: 'Prepared customer message · demo' };
      screen = view('requirements', { section: 'clarification' }); break;
    case 'A10':
      confirmRequirements(s, { width: 12, length: 16, notes: 'Irregular hardware kits; manual loading; 12 × 16-inch polyethylene bags. Customer target: 20 bags/min. PAC to confirm application fit with representative bags and parts.' });
      s.meta.clarification.confirmed = true;
      s.meta.waitingOn = 'PAC configuration review';
      updateDealDetails(s, { nextAction: 'Prepare standard and assisted-loading alternatives.' });
      screen = view('requirements', { section: 'confirmed' });
      receipt = { title: 'Application requirements confirmed', detail: 'Both alternatives will use this same customer brief.', kind: 'success' };
      event(s, stepId, 'Confirmed the supplied application facts'); break;
    case 'A11':
      createAlternatives(s); screen = view('builder', { quoteId: 'a' });
      event(s, stepId, 'Created A Rev 0 and B Rev 0'); break;
    case 'A12':
      s.quotes.b.opener = true; s.activeQuote = 'b'; screen = view('builder'); focus = 'opener';
      // Use domain approval validation, not a presentation-only warning.
      expectedBlock = expectedFailure(() => approveQuote(s, 'b'), 'OPTION_DEPENDENCY', /Flattener Fingers/);
      break;
    case 'A13': s.quotes.b.fingers = true; screen = view('builder'); focus = 'fingers'; break;
    case 'A14': s.meta.priceVisible = false; screen = view('builder'); break;
    case 'A15': s.meta.priceVisible = true; screen = view('builder'); break;
    case 'A16':
      s.quotes.a.note = 'Standard hand loading for the current hardware-kit process.';
      s.quotes.b.note = 'Assisted bag opening for evaluation with your actual bags and parts.';
      saved(s, 'a', stepId); saved(s, 'b', stepId); screen = view('builder');
      receipt = { title: 'Both alternatives saved', detail: 'Ready for review. No customer version has been published.', kind: 'success' }; break;
    case 'A17': screen = view('review'); break;
    case 'A18': approved(s, 'a', stepId); screen = view('review'); focus = 'a'; break;
    case 'A19': approved(s, 'b', stepId); screen = view('review'); focus = 'b'; break;
    case 'A20':
      issued(s, stepId); screen = view('publication', { version: 1 });
      receipt = { title: 'Proposal V1 published', detail: 'A Rev 0 and B Rev 0 are preserved in this customer version.', kind: 'success' }; break;
    case 'A21': screen = view('proposal', { version: 1, section: 'application' }); break;
    case 'A22': screen = view('proposal', { version: 1, section: 'equipment' }); break;
    case 'A23': screen = view('proposal', { version: 1, section: 'documents' }); break;
    case 'A24': screen = view('proposal', { version: 1, section: 'compare' }); break;
    case 'B01': {
      const c = addComment(s, { version: 1, alternative: 'b', topic: 'Loading area', author: 'Alex Morgan', text: QUESTION });
      Object.assign(c, { id: 'C1', code: 'C1', createdAt: stamp(stepId), status: 'open', statusLabel: 'Awaiting sales' });
      screen = view('proposal', { version: 1, section: 'discussion' });
      receipt = { title: 'Question recorded', detail: 'Attached to Proposal V1 · Option B · Rev 0.', kind: 'success' };
      event(s, stepId, 'Recorded customer question C1', 'C1'); break;
    }
    case 'B02':
      updateDealDetails(s, { nextAction: 'Assess loading-guide scope with engineering.' });
      s.meta.waitingOn = 'Engineering assessment'; screen = view('activity'); break;
    case 'B03': screen = view('explorer', { mediaKey: 'sealing' }); focus = 'loading-area'; break;
    case 'B04': {
      const f = addFinding(s, { kind: 'photo', alternative: 'b', mediaKey: 'sealing', title: 'Loading-guide scope', note: 'Customer requested a guide for irregular parts. Review representative bags and part samples before confirming guide geometry.' });
      Object.assign(f, { id: 'F1', code: 'F1', createdAt: stamp(stepId), questionId: 'C1', proposalVersion: 1, internalOnly: true });
      screen = view('explorer', { mediaKey: 'sealing' });
      receipt = { title: 'Finding saved to this deal', detail: 'F1 keeps the PAC photo and C1 together for the revision discussion.', kind: 'success' };
      event(s, stepId, 'Saved internal equipment finding F1', 'F1'); break;
    }
    case 'B05':
      reviseQuote(s, 'b'); s.meta.revisionSource = { quoteId: 'b', fromRevision: 0, toRevision: 1, questionId: 'C1', findingId: 'F1' };
      screen = view('builder'); event(s, stepId, 'Created B Rev 1 from the customer question and finding', 'b'); break;
    case 'B06':
      s.quotes.b.engineering = { enabled: true, description: ENGINEERING_SCOPE, reason: ENGINEERING_REASON, laborHours: null, laborRate: null, materials: null, estimate: null, amount: null, leadWeeks: null };
      s.meta.engineeringStatus = 'Awaiting engineering'; screen = view('builder', { section: 'engineering' }); break;
    case 'B07':
      saved(s, 'b', stepId); screen = view('review');
      expectedBlock = expectedFailure(() => approveQuote(s, 'b'), 'ENGINEERING_INCOMPLETE', /labor hours/, validateQuote(s, 'b'));
      break;
    case 'B08':
      Object.assign(s.quotes.b.engineering, SAMPLE.engineering);
      s.quotes.b.status = 'draft'; s.quotes.b.approvedFingerprint = null;
      s.meta.engineeringStatus = 'Estimate prepared · awaiting review';
      screen = view('builder', { section: 'engineering' });
      event(s, stepId, 'Prepared engineering estimate and proposed customer price', 'b'); break;
    case 'B09':
      s.quotes.b.note = 'Includes a $500 illustrative loading-guide engineering allowance. Final geometry and application fit require PAC review of representative parts and bags. Planning lead time: 7 weeks, illustrative.';
      saved(s, 'b', stepId); screen = view('builder', { section: 'engineering' });
      receipt = { title: 'B Rev 1 saved', detail: '$41,310 · 7-week illustrative planning time. Review is still required.', kind: 'success' }; break;
    case 'B10': screen = view('review', { section: 'changes' }); break;
    case 'B11':
      approved(s, 'b', stepId); s.meta.engineeringStatus = 'Reviewed in this demo';
      screen = view('review', { section: 'changes' }); break;
    case 'B12':
      issued(s, stepId); screen = view('publication', { version: 2 });
      receipt = { title: 'Proposal V2 published', detail: 'A remains Rev 0. B is now Rev 1. The original question still needs a reply.', kind: 'success' }; break;
    case 'B13': {
      const c = s.comments.find(item => item.id === 'C1');
      require(c && c.version === 1 && c.alternative === 'b' && c.revision === 0, 'The original question context must be intact.');
      require(s.publications.some(p => p.version === 2), 'Publish V2 before linking the customer reply.');
      Object.assign(c, { reply: REPLY, replyId: 'R1', replyAuthor: 'PAC sales team · demo', replyAt: stamp(stepId), replyVersion: 2, status: 'replied', statusLabel: 'Answered · awaiting customer' });
      s.meta.waitingOn = 'Customer sample-review confirmation';
      s.meta.lastContact = { date: SAMPLE.date, at: stamp(stepId), channel: 'Proposal reply', recordId: 'R1', questionId: 'C1', sample: true };
      screen = view('activity'); event(s, stepId, 'Replied to C1 and linked Proposal V2', 'R1');
      receipt = { title: 'Reply recorded', detail: 'The original V1 question now points to the revised V2 offer.', kind: 'success' }; break;
    }
    case 'B14': screen = view('proposal', { version: 2, section: 'compare' }); break;
    case 'B15': screen = view('proposal', { version: 1, section: 'history' }); break;
    case 'B16':
      updateDealDetails(s, { owner: 'PAC sales team · demo', nextAction: 'Confirm representative sample parts and bags for the guide review.', followUpDate: SAMPLE.followUpDate });
      s.deal.stage = 'Awaiting customer'; s.meta.waitingOn = 'Customer sample-review confirmation';
      screen = view('overview', { section: 'follow-up' });
      event(s, stepId, 'Saved the owned customer follow-up');
      receipt = { title: 'Next action saved', detail: 'PAC sales team · Follow up November 12 · Confirm representative samples.', kind: 'success' }; break;
    default: throw Error(`Unknown Workspace step: ${stepId}`);
  }
  s.activeQuote = screen.quoteId || s.activeQuote;
  s.meta.currentStep = stepId;
  return { stepId, state: s, view: screen, expectedBlock, focus, receipt };
}

/** Rebuild an exact checkpoint without reading any external or prior browser record. */
export function workspaceAt(stepId) {
  const index = WORKSPACE_STEPS.indexOf(stepId);
  require(index >= 0, `Unknown Workspace step: ${stepId}`);
  const state = seed(); let record;
  for (const id of WORKSPACE_STEPS.slice(0, index + 1)) record = apply(state, id);
  assertWorkspaceStep(record);
  return record;
}

/** Verify a checkpoint before the host advertises it as successfully completed. */
export function assertWorkspaceStep(record) {
  require(record && WORKSPACE_STEPS.includes(record.stepId), 'Choose a valid Workspace checkpoint.');
  const { state: s, stepId } = record;
  require(s?.deal?.id === 'DEMO-HARBOR' && s.meta?.sample === true, 'The checkpoint is not the isolated sample sales case.');
  const index = WORKSPACE_STEPS.indexOf(stepId), at = id => index >= WORKSPACE_STEPS.indexOf(id);
  require(s.deal.crmConnection === null, 'The sample cannot imply a CRM connection.');
  require(!('inquiryId' in s.deal) && !('websiteInquiry' in s), 'Website inquiries must remain independent.');
  require(s.meta.quotesCreated === at('A11'), 'The quote-creation gate did not complete at the expected step.');
  if (at('A10')) require(s.scope.width === 12 && s.scope.length === 16 && s.meta.requirementsConfirmed, 'The application dimensions were not confirmed.');
  else require(s.scope.width === null && s.scope.length === null, 'Unconfirmed dimensions must remain unknown.');
  const totals = currentTotal(s);
  require(totals.a === 33060, 'Option A must remain $33,060.');
  const expectedB = !at('A12') ? 33060 : !at('A13') ? 39095 : at('B06') && !at('B08') ? null : at('B08') ? 41310 : 40810;
  require(totals.b === expectedB, 'Option B does not match the scripted amount.');
  require(s.publications.length === (at('B12') ? 2 : at('A20') ? 1 : 0), 'Unexpected number of published versions.');
  if (at('A20')) {
    const p = s.publications[0];
    require(p.version === 1 && p.quotes.a.total === 33060 && p.quotes.b.total === 40810 && p.quotes.b.revision === 0 && !p.quotes.b.engineering.enabled, 'The original V1 offer was changed.');
    require(p.quotes.b.planningLeadWeeks === 6 && p.resourceManifest[0].version === 1, 'The original timing or documents changed.');
  }
  if (at('B12')) {
    const p = s.publications[1];
    require(p.version === 2 && p.quotes.a.revision === 0 && p.quotes.b.revision === 1 && p.quotes.b.total === 41310 && p.quotes.b.planningLeadWeeks === 7, 'The revised V2 offer is inconsistent.');
  }
  require(s.comments.length === (at('B01') ? 1 : 0), 'Customer questions must not be duplicated.');
  require(s.findings.length === (at('B04') ? 1 : 0), 'Explorer findings must not be duplicated.');
  if (at('B01')) {
    const c = s.comments[0];
    require(c.id === 'C1' && c.version === 1 && c.alternative === 'b' && c.revision === 0, 'Customer question context was lost.');
    require(Boolean(c.reply) === at('B13'), 'Publishing must not answer the customer question.');
  }
  require(s.quotes.b.revision === (at('B05') ? 1 : 0), 'Option B revision is inconsistent.');
  if (['A08', 'A12', 'B07'].includes(stepId)) require(record.expectedBlock?.messages?.length > 0, 'The expected validation block is missing.');
  else require(record.expectedBlock === null, 'Unexpected validation block.');
  for (const q of Object.values(s.quotes)) {
    if (['approved', 'published'].includes(q.status)) {
      require(validateQuote(s, q.id).length === 0, 'An approval no longer matches its saved quote.');
      require(s.meta.approvalRecords.some(a => a.quoteId === q.id && a.revision === q.revision && a.fingerprint === q.approvedFingerprint), 'Approval actor/revision attribution is missing.');
    }
  }
  for (const p of s.publications) {
    const wire = JSON.stringify(publicProjection(p));
    for (const privateKey of ['laborHours', 'laborRate', 'materials', 'estimate', 'approvedFingerprint', 'savedSnapshot', 'findings']) require(!wire.includes(`"${privateKey}"`), `Internal ${privateKey} leaked into the customer projection.`);
    require(p.resourceManifest[0].totals.a === p.quotes.a.total && p.resourceManifest[0].totals.b === p.quotes.b.total, 'The quote document manifest differs from its version.');
  }
  if (at('B16')) require(s.deal.followUpDate === SAMPLE.followUpDate && s.deal.stage === 'Awaiting customer' && s.meta.lastContact.recordId === 'R1', 'The final follow-up is incomplete.');
  return true;
}

/** Customer-safe issued document data; no draft, cost or finding fields. */
export function customerPublication(record, version = record.view.version) {
  const issued = record.state.publications.find(p => p.version === Number(version));
  require(Boolean(issued), 'Choose an available published version.');
  return deepFreeze({ ...publicProjection(issued), resourceManifest: clone(issued.resourceManifest) });
}

export function quotePlanningWeeks(q) {
  if (!Number.isFinite(q?.baseLeadWeeks)) return null;
  if (q.engineering?.enabled && !Number.isFinite(q.engineering.leadWeeks)) return null;
  return q.baseLeadWeeks + (q.engineering?.enabled ? q.engineering.leadWeeks : 0);
}
export { quoteTotal, quoteLines, validateQuote };
