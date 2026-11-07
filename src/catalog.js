/* Runtime catalog reads are separate from persisted quote snapshots. Source identifiers
   only join the currently loaded catalog; they never become quote identity. */

const SELECTABLE = new Set(['catalog_base', 'catalog_base_variant', 'catalog_option', 'service']);
const BASE_CLASSES = new Set(['catalog_base', 'catalog_base_variant']);
const isWarranty = line => line.line_class === 'warranty_option' || /warranty/i.test(line.name || '');
const BROWSER_IMAGE = /\.(?:jpe?g|png|webp|gif|avif|svg)$/i;
const FORBIDDEN_KEY = /^(?:item_id|item_ids|line_id|line_ids|narrative_id|narrative_ids|block_id|block_ids|note_for|note_item_ids|variant_of|base_item_id|variant_item_ids|link_id|link_ids|doc_id|price_refs|path|decided_by)$|(?:_line_id|_line_ids|_block_id|_block_ids)$/;
const uuid = () => globalThis.crypto?.randomUUID?.() || `quote-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const copy = value => JSON.parse(JSON.stringify(value));
const unique = values => [...new Set(values.filter(Boolean))];

export const money = value => value == null ? 'Price to confirm' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
export const unitLabel = unit => ({ lump_sum: 'lump sum', each: 'each', per_day: 'per day', per_hour: 'per hour', other: 'unit to confirm' }[unit] || 'unit to confirm');

export function cleanSnapshot(value) {
  if (Array.isArray(value)) return value.map(cleanSnapshot);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => key === 'quote_line_id' || !FORBIDDEN_KEY.test(key)).map(([key, item]) => [key, cleanSnapshot(item)]));
  return value;
}

export async function loadCatalog(baseUrl = '/pac-machinery-demo/source') {
  const names = ['manifest', 'overview', 'machines', 'price_lines', 'narratives', 'media', 'commercial_terms', 'spare_parts', 'options'];
  const records = await Promise.all(names.map(async name => {
    const response = await fetch(`${baseUrl}/${['manifest', 'overview'].includes(name) ? '' : 'catalog/'}${name}.json`);
    if (!response.ok) throw new Error(`Unable to load catalog ${name}: ${response.status}`);
    return response.json();
  }));
  const [manifest, overview, machines, priceLines, narratives, media, terms, kits, options] = records;
  if (manifest.status !== 'passed' || manifest.signed_off !== true) throw new Error('This catalog is not signed off for this demo.');
  return { manifest, overview, machines, priceLines, narratives, media, terms, kits, options, baseUrl };
}

export const getMachine = (catalog, machineId) => catalog.machines.find(machine => machine.machine_id === machineId);
export const getPriceLines = (catalog, machineId) => catalog.priceLines.filter(line => line.machine_id === machineId);
export const getBase = (catalog, machineId) => getPriceLines(catalog, machineId).find(line => line.line_class === 'catalog_base');
export const getTerms = (catalog, machineId) => catalog.terms.find(terms => terms.machine_id === machineId) || {};
export const getKits = (catalog, machineId) => catalog.kits.filter(kit => kit.machine_ids?.includes(machineId));
export const getOption = (catalog, machineId, optionId) => getPriceLines(catalog, machineId).find(line => line.option_id === optionId);
export const getSelectableLines = (catalog, machineId) => getPriceLines(catalog, machineId).filter(line => SELECTABLE.has(line.line_class));
export const getIncludedLines = (catalog, machineId) => getPriceLines(catalog, machineId).filter(line => line.line_class === 'catalog_included');
export const mediaUrl = (catalog, picture) => `${catalog.baseUrl || '/pac-machinery-demo/source'}/${picture.converted_file || picture.file}`;

export function isUsableImage(picture) {
  return Boolean(picture?.confirmed_by && BROWSER_IMAGE.test(picture.converted_file || picture.file || '') && (picture.converted_file || !['unconverted_emf', 'fallback_only'].includes(picture.status)));
}

export function machinePhotos(catalog, machineId, { detail = false } = {}) {
  const kind = detail ? 'machine_detail' : 'machine';
  return catalog.media.filter(picture => isUsableImage(picture) && picture.matches === machineId && picture.kind === kind)
    .sort((a, b) => (machineId === 'r3200' ? Number(b.image_id === 'img_877f3a8a815e') - Number(a.image_id === 'img_877f3a8a815e') : 0));
}

export function optionPhotos(catalog, machineId, optionId) {
  const applicable = getOption(catalog, machineId, optionId);
  if (!applicable) return [];
  return catalog.media.filter(picture => {
    if (!isUsableImage(picture) || !['generic', machineId].includes(picture.matches)) return false;
    if (!['feature', 'machine_detail', 'diagram', 'screenshot', 'product_sample', 'packaged_product'].includes(picture.kind)) return false;
    const narrative = catalog.narratives.find(n => n.title?.line_id === picture.feature_name?.line_id);
    if (!narrative) return false;
    return narrative.item_ids?.some(id => catalog.priceLines.find(row => row.item_id === id)?.option_id === optionId);
  });
}

export function describeLine(catalog, line) {
  const narrative = catalog.narratives.find(item => item.narrative_id === line.narrative_id);
  const notes = getPriceLines(catalog, line.machine_id).filter(item => line.note_item_ids?.includes(item.item_id) || item.note_for === line.item_id).map(item => item.source_line || item.name);
  const flags = (line.flags || []).map(flag => ({ kind: flag.kind, target: flag.target ?? null, evidence: flag.evidence }));
  const ambiguousRequires = (line.requires_option_ids || []).filter(req => !req.option_id || /\bor\b/i.test(req.target || ''));
  const ambiguity = ambiguousRequires.length ? `PAC confirmation required: ${ambiguousRequires.map(req => req.target || 'Unresolved required option').join('; ')}. The source does not establish an unambiguous selection.` : null;
  const reviewReasons = flags.filter(flag => ['engineering_review', 'models_only', 'lead_time'].includes(flag.kind)).map(flag => flag.evidence);
  if (ambiguity) reviewReasons.push(ambiguity);
  if (isWarranty(line)) reviewReasons.push('Warranty is governed by the original terms. PAC must confirm the duration, pricing basis and conditions before any extended warranty is added to a priced proposal.');
  if (line.price_usd == null && line.line_class !== 'catalog_included') reviewReasons.push('Price has not been provided; this item cannot be included in a priced subtotal.');
  if (line.price_unit === 'other') reviewReasons.push('Pricing unit requires PAC confirmation.');
  return {
    description: narrative?.body?.map(paragraph => paragraph.text).join('\n\n') || '',
    sourceLine: line.source_line || line.name,
    notes,
    flags,
    ambiguity,
    needsReview: reviewReasons.length > 0,
    reviewReasons,
    leadTimeNotes: flags.filter(flag => flag.kind === 'lead_time').map(flag => flag.evidence),
  };
}

export function snapshotLine(catalog, line, { quantity = 1, requiredBy = [] } = {}) {
  const info = describeLine(catalog, line);
  const unit = line.price_unit || 'lump_sum';
  const qty = Number(quantity);
  const matchingKits = /spare[ -]?parts/i.test(line.name) ? getKits(catalog, line.machine_id).filter(kit => kit.price_usd === line.price_usd) : [];
  if (!Number.isFinite(qty) || qty <= 0 || (unit === 'each' && !Number.isInteger(qty)) || (unit === 'lump_sum' && qty !== 1)) throw new Error(`Invalid quantity for ${unit}.`);
  return {
    quote_line_id: uuid(),
    machine_id: line.machine_id,
    option_id: line.option_id || null,
    ...(matchingKits.length === 1 ? { kit_id: matchingKits[0].kit_id } : {}),
    name: line.name,
    line_class: line.line_class,
    quantity: qty,
    price_unit: unit,
    price_usd: line.price_usd,
    currency: 'USD',
    catalog_run: catalog.manifest.run_id,
    catalog_hash: catalog.manifest.catalog_sha256,
    source_line: info.sourceLine,
    description: info.description,
    notes: info.notes,
    flags: info.flags,
    requires: (line.requires_option_ids || []).map(req => ({ target: req.target, option_id: req.option_id ?? null, ambiguous: !req.option_id || /\bor\b/i.test(req.target || '') })),
    required_by: unique(requiredBy),
    review_reasons: info.reviewReasons,
  };
}

export function newDraft(catalog, machineId) {
  const machine = getMachine(catalog, machineId);
  const base = getBase(catalog, machineId);
  if (!machine || !base) throw new Error('Machine or base configuration is unavailable.');
  const photo = machinePhotos(catalog, machineId)[0];
  const now = new Date().toISOString();
  return {
    schema_version: 1,
    draft_id: uuid(),
    created_at: now,
    updated_at: now,
    machine_id: machineId,
    machine_title: machine.title.text,
    catalog_run: catalog.manifest.run_id,
    catalog_hash: catalog.manifest.catalog_sha256,
    currency: 'USD',
    title: `${machine.title.text} proposal`,
    requirements: { company: '', contact: '', application: '', bag_width: '', bag_length: '', throughput: '', notes: '', illustrative: false },
    machine_snapshot: {
      title: machine.title.text,
      subtitle: machine.subtitle?.text || '',
      summary: machine.summary.map(item => item.text),
      specs: machine.specs.map(({ name, value }) => ({ name, value })),
      engineering_approval_required: machine.engineering_approval_required,
      photo: photo ? { image_id: photo.image_id, file: photo.converted_file || photo.file, kind: photo.kind, matches: photo.matches, confirmed_by: photo.confirmed_by } : null,
    },
    terms_snapshot: cleanSnapshot(getTerms(catalog, machineId)),
    included_snapshot: getIncludedLines(catalog, machineId).map(line => snapshotLine(catalog, line)),
    lines: [snapshotLine(catalog, base)],
    review_status: 'Draft — application and final configuration require PAC review',
  };
}

export const total = draft => draft.lines.reduce((sum, line) => sum + (line.price_usd == null ? 0 : line.price_usd * line.quantity), 0);
export const equipmentTotal = draft => draft.lines.filter(line => line.line_class !== 'service').reduce((sum, line) => sum + (line.price_usd == null ? 0 : line.price_usd * line.quantity), 0);
export const refreshStatus = (catalog, draft) => ({ mismatch: draft.catalog_run !== catalog.manifest.run_id || draft.catalog_hash !== catalog.manifest.catalog_sha256, message: 'This draft retains its saved prices. The catalog has changed; explicit reconciliation with PAC is required before configuration edits.' });

function sameRow(snapshot, row) {
  if (snapshot.machine_id !== row.machine_id) return false;
  if (row.option_id) return snapshot.option_id === row.option_id;
  // This comparison is allowed only in the exact same catalog snapshot; on a
  // catalog mismatch all mutation paths below stop before using it.
  return snapshot.option_id == null && snapshot.line_class === row.line_class && snapshot.name === row.name && snapshot.price_usd === row.price_usd && snapshot.price_unit === row.price_unit;
}

export const selectedLine = (draft, row) => draft.lines.find(line => sameRow(line, row));

export function planSelection(catalog, draft, row, { quantity = 1 } = {}) {
  const plan = { additions: [], alreadySelected: false, reviewReasons: [], blocked: false, addedTotal: 0, replacesBase: BASE_CLASSES.has(row.line_class), machine_id: draft.machine_id, catalog_run: catalog.manifest.run_id, catalog_hash: catalog.manifest.catalog_sha256 };
  const block = message => { plan.blocked = true; plan.reviewReasons.push(message); return plan; };
  if (refreshStatus(catalog, draft).mismatch) return block(refreshStatus(catalog, draft).message);
  if (row.machine_id !== draft.machine_id || !getPriceLines(catalog, draft.machine_id).includes(row)) return block('This price row does not belong to the selected machine and catalog.');
  if (isWarranty(row)) return block(describeLine(catalog, row).reviewReasons.find(reason => reason.startsWith('Warranty')));
  const rowInfo = describeLine(catalog, row);
  if (rowInfo.ambiguity) return block(rowInfo.ambiguity);
  if (!SELECTABLE.has(row.line_class)) return block(row.line_class === 'catalog_included' ? 'This feature is already included in the base price.' : 'This source row is not a selectable catalog item.');
  if (!Number.isFinite(row.price_usd)) return block('Price requires confirmation; this item cannot be added to the priced subtotal.');
  if (row.price_unit === 'other') return block('The pricing unit requires PAC confirmation.');
  if (selectedLine(draft, row)) { plan.alreadySelected = true; return plan; }
  const visited = new Set();
  const visit = (current, requiredBy = []) => {
    const key = current.option_id || `${current.line_class}:${current.name}`;
    if (visited.has(key)) return;
    visited.add(key);
    const existing = selectedLine(draft, current);
    if (existing || current.line_class === 'catalog_included') return;
    const currentInfo = describeLine(catalog, current);
    if (currentInfo.ambiguity || isWarranty(current)) {
      plan.blocked = true;
      plan.reviewReasons.push(...currentInfo.reviewReasons);
      return;
    }
    if (!SELECTABLE.has(current.line_class) || !Number.isFinite(current.price_usd) || current.price_unit === 'other') {
      plan.blocked = true;
      plan.reviewReasons.push(`Required item “${current.name}” cannot be priced. PAC confirmation is required.`);
      return;
    }
    const snapshot = snapshotLine(catalog, current, { quantity: current === row ? quantity : 1, requiredBy });
    plan.additions.push(snapshot);
    plan.reviewReasons.push(...snapshot.review_reasons);
    for (const req of current.requires_option_ids || []) {
      if (!req.option_id || /\bor\b/i.test(req.target || '')) continue; // Ambiguity was blocked before pricing; never auto-add one alternative.
      const target = getOption(catalog, draft.machine_id, req.option_id);
      if (!target) { plan.reviewReasons.push(`Required item “${req.target}” is not priced for this machine. PAC confirmation is required.`); plan.blocked = true; }
      else visit(target, [current.option_id || current.name]);
    }
  };
  visit(row);
  plan.reviewReasons = unique(plan.reviewReasons);
  if (plan.blocked) {
    plan.additions = [];
    return plan;
  }
  plan.addedTotal = plan.additions.reduce((sum, line) => sum + line.price_usd * line.quantity, 0) - (plan.replacesBase ? draft.lines.filter(line => BASE_CLASSES.has(line.line_class)).reduce((sum, line) => sum + line.price_usd * line.quantity, 0) : 0);
  return plan;
}

export function applySelection(draft, plan) {
  if (plan.blocked) throw new Error(plan.reviewReasons.join(' '));
  if (plan.machine_id !== draft.machine_id || plan.catalog_run !== draft.catalog_run || plan.catalog_hash !== draft.catalog_hash) throw new Error('Selection no longer matches this draft.');
  if (plan.alreadySelected || !plan.additions.length) return draft;
  const result = copy(draft);
  if (plan.replacesBase) result.lines = result.lines.filter(line => !BASE_CLASSES.has(line.line_class));
  for (const addition of plan.additions) {
    if (!result.lines.some(line => sameRow(line, addition))) result.lines.push(copy(addition));
  }
  result.updated_at = new Date().toISOString();
  return result;
}

export function planRemoval(catalog, draft, quoteLineId) {
  const line = draft.lines.find(item => item.quote_line_id === quoteLineId);
  if (!line) return { blocked: true, blockers: [], reason: 'The selected line is unavailable.' };
  if (refreshStatus(catalog, draft).mismatch) return { blocked: true, blockers: [], reason: refreshStatus(catalog, draft).message };
  if (BASE_CLASSES.has(line.line_class)) return { blocked: true, blockers: [], reason: 'Keep one base configuration. Select a different base to replace it.' };
  const blockers = draft.lines.filter(item => item.quote_line_id !== quoteLineId && (item.requires || []).some(req => req.option_id === line.option_id && !req.ambiguous));
  return { blocked: blockers.length > 0, blockers, quote_line_id: quoteLineId, reason: blockers.length ? `Required by ${blockers.map(item => item.name).join(', ')}. Remove that selection first.` : '' };
}

export function removeLine(catalog, draft, quoteLineId) {
  const plan = planRemoval(catalog, draft, quoteLineId);
  if (plan.blocked) throw new Error(plan.reason);
  return { ...draft, lines: draft.lines.filter(line => line.quote_line_id !== quoteLineId), updated_at: new Date().toISOString() };
}

export function setQuantity(catalog, draft, quoteLineId, quantity) {
  if (refreshStatus(catalog, draft).mismatch) throw new Error(refreshStatus(catalog, draft).message);
  const line = draft.lines.find(item => item.quote_line_id === quoteLineId);
  if (!line) throw new Error('Line is unavailable.');
  const qty = Number(quantity);
  if (line.price_unit === 'lump_sum' && qty !== 1) throw new Error('Lump sum pricing uses quantity 1.');
  if (!Number.isFinite(qty) || qty <= 0 || (line.price_unit === 'each' && !Number.isInteger(qty))) throw new Error('Enter a valid positive quantity.');
  return { ...draft, lines: draft.lines.map(item => item.quote_line_id === quoteLineId ? { ...item, quantity: qty } : item), updated_at: new Date().toISOString() };
}

export function reviewReasons(catalog, draft) {
  const reasons = [];
  if (draft.machine_snapshot?.engineering_approval_required) reasons.push('PAC engineering approval is required before quoting this machine.');
  if (refreshStatus(catalog, draft).mismatch) reasons.push(refreshStatus(catalog, draft).message);
  for (const line of draft.lines) reasons.push(...(line.review_reasons || []).map(reason => `${line.name}: ${reason}`));
  return unique(reasons);
}

export function serializeDraft(draft) {
  const safe = cleanSnapshot(draft);
  for (const line of safe.lines || []) {
    if (!line.quote_line_id || !line.machine_id || !('option_id' in line) || !line.catalog_run || !line.catalog_hash) throw new Error('Incomplete quote snapshot.');
  }
  return JSON.stringify(safe);
}

export function deserializeDraft(serialized) {
  const draft = typeof serialized === 'string' ? JSON.parse(serialized) : copy(serialized);
  if (draft.schema_version !== 1 || !draft.draft_id || !draft.machine_id || !Array.isArray(draft.lines)) throw new Error('This saved draft cannot be read.');
  return JSON.parse(serializeDraft(draft));
}
