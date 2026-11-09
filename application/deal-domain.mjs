// Additive Deal workspace state. Existing quotes and issued proposals remain authoritative.
// The host adapter validates iframe source/origin; normalization validates captured view data.
import { n as normalizeInspection } from '../assets/explorer/assets/inspection-reference-WG_yQLtT.js';

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' ? value.trim() : '';
const copy = value => JSON.parse(JSON.stringify(value));
const mediaKeys = ['machine', 'opening', 'sealing'];

function requireDeal(state) {
  if (!plain(state) || !plain(state.deal) || !text(state.deal.id)) throw Error('Choose a valid deal.');
  if (!plain(state.quotes) || !state.quotes.a || !state.quotes.b) throw Error('This deal has no quote alternatives.');
  if (own(state, 'findings') && !Array.isArray(state.findings)) throw Error('The saved Explorer findings could not be read.');
}

/** Add missing fields without replacing or changing existing quote, publication or comment records. */
export function hydrateDealState(state) {
  requireDeal(state);
  if (!own(state.deal, 'nextAction')) state.deal.nextAction = 'Confirm the loading requirements and review quote alternatives.';
  if (!own(state.deal, 'followUpDate')) state.deal.followUpDate = '';
  if (!own(state, 'findings')) state.findings = [];
  return state;
}

function requiredText(value, label, limit) {
  const result = text(value);
  if (!result) throw Error(`Enter ${label}.`);
  if (result.length > limit) throw Error(`Keep ${label} within ${limit} characters.`);
  return result;
}

function nextFindingId(findings) {
  const ids = new Set(findings.map(item => item.id));
  let number = findings.length + 1;
  while (ids.has(`finding-${number}`)) number += 1;
  return `finding-${number}`;
}

/** Internal exploration evidence only. Selecting or saving a view never configures a quote. */
export function addFinding(state, { kind, title, note, mediaKey, alternative, inspection } = {}) {
  requireDeal(state);
  if (!['photo', '3d'].includes(kind)) throw Error('Choose a photo or 3D reference finding.');
  if (!mediaKeys.includes(mediaKey)) throw Error('Choose a valid equipment reference.');
  if (!['a', 'b'].includes(alternative)) throw Error('Choose quote A or B for this finding.');
  const quote = state.quotes[alternative];
  if (quote.id !== alternative || !Number.isInteger(quote.revision) || quote.revision < 0) throw Error('Choose a valid quote revision.');
  const findingTitle = requiredText(title, 'a finding title', 160);
  const findingNote = requiredText(note, 'a finding note', 5000);
  let capturedInspection;
  if (kind === '3d') {
    if (!inspection) throw Error('Capture a 3D reference view before saving this finding.');
    // Full schema validation includes model revision agreement, finite camera vectors,
    // paused operation, safe plain JSON and a <=120,000-character raster preview.
    capturedInspection = normalizeInspection(inspection);
  } else if (inspection !== undefined && inspection !== null) {
    throw Error('A photo finding cannot contain a 3D inspection.');
  }
  const findings = state.findings || [];
  const finding = {
    id: nextFindingId(findings), dealId: state.deal.id,
    quoteId: alternative, quoteRevision: quote.revision,
    kind, title: findingTitle, note: findingNote, mediaKey,
    ...(capturedInspection ? { inspection: copy(capturedInspection) } : {}),
    createdAt: new Date().toISOString(), status: 'open',
  };
  if (!own(state, 'findings')) state.findings = [];
  state.findings.push(finding);
  return finding;
}

export function markFindingStatus(state, id, status) {
  requireDeal(state);
  if (!['open', 'addressed'].includes(status)) throw Error('Choose an open or addressed finding status.');
  const finding = state.findings?.find(item => item.id === id && item.dealId === state.deal.id);
  if (!finding) throw Error('This finding does not belong to the current deal.');
  finding.status = status;
  return finding;
}

function dateInput(value) {
  if (value === '') return '';
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Enter a valid follow-up date.');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw Error('Enter a valid follow-up date.');
  return value;
}

/** Supports partial updates; all supplied values are validated before any are written. */
export function updateDealDetails(state, values = {}) {
  requireDeal(state);
  if (!plain(values)) throw Error('Enter valid deal details.');
  const updates = {};
  if (own(values, 'owner')) updates.owner = requiredText(values.owner, 'the deal owner', 120);
  if (own(values, 'nextAction')) updates.nextAction = requiredText(values.nextAction, 'the next action', 500);
  if (own(values, 'followUpDate')) updates.followUpDate = dateInput(values.followUpDate);
  Object.assign(state.deal, updates);
  return state.deal;
}
