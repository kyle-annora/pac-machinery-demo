// Server-side catalog revision policy. Browser views use only the API projection.
import { createHash, randomUUID } from 'node:crypto';

const copy = value => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const value = input => String(input ?? '').trim();
const round = input => Math.round((input + Number.EPSILON) * 100) / 100;
const digest = catalog => createHash('sha256').update(JSON.stringify({ priceLines: catalog.priceLines, terms: catalog.terms })).digest('hex');
const identity = actor => {
  if (actor?.role !== 'manager' || !value(actor.id) || !value(actor.name)) throw new Error('A Manager account is required to maintain the catalog.');
  return { id: actor.id, name: actor.name, role: actor.role };
};
const price = input => {
  if (input === '' || input == null || typeof input === 'boolean' || !Number.isFinite(Number(input)) || Number(input) < 0 || Number(input) > 1e9) throw new Error('Enter a nonnegative price below $1 billion.');
  return round(Number(input));
};
const rowKey = row => row.item_id || `${row.machine_id}|${row.option_id || row.line_id || row.name}`;
const cleanLine = row => ({ price_usd: row.price_usd, line_class: row.line_class, requires_option_ids: (row.requires_option_ids || []).map(item => item.option_id || item.target) });
const cleanLeadTime = lead => lead ? { text: lead.text, min_weeks: lead.min_weeks, max_weeks: lead.max_weeks } : null;
const moneyText = number => `$${Number(number).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const replacePrice = (text, before, after) => String(text || '').replace(/\$\s*[\d,]+(?:\.\d{1,2})?/g, token => Number(token.replace(/[^\d.]/g, '')) === before ? moneyText(after) : token);

function synchronizePrice(catalog, row, previousPrice) {
  if (row.line_class === 'catalog_base') {
    const machine = catalog.machines.find(item => item.machine_id === row.machine_id);
    if (machine) machine.base_price_usd = row.price_usd;
  }
  const option = catalog.options?.find(item => item.option_id === row.option_id);
  if (option) {
    option.priced_on ||= {}; option.included_on ||= [];
    if (row.line_class === 'catalog_included') { delete option.priced_on[row.machine_id]; if (!option.included_on.includes(row.machine_id)) option.included_on.push(row.machine_id); }
    else { option.priced_on[row.machine_id] = row.price_usd; option.included_on = option.included_on.filter(id => id !== row.machine_id); }
  }
  if (row.price_usd === previousPrice) return;
  const startup = catalog.terms.find(item => item.machine_id === row.machine_id)?.startup;
  if (startup && row.line_class === 'service' && (startup.price_line_ids?.includes(row.line_id) || startup.label === row.name)) {
    startup.source_reference ||= copy({ price_usd: startup.price_usd, prices_stated: startup.prices_stated, text: startup.text, price_refs: startup.price_refs });
    startup.price_usd = row.price_usd;
    startup.text = replacePrice(startup.text, previousPrice, row.price_usd);
    startup.prices_stated = (startup.prices_stated || []).map(n => n === previousPrice ? row.price_usd : n);
    startup.price_refs = (startup.price_refs || []).map(ref => ref.price_usd === previousPrice ? { ...ref, price_usd: row.price_usd, price_text: moneyText(row.price_usd) } : ref);
    startup.admin_change = copy(row.admin_change);
  }
  const narrative = catalog.narratives?.find(item => item.narrative_id === row.narrative_id);
  if (narrative) {
    narrative.source_body ||= copy(narrative.body);
    narrative.body = narrative.body.map(part => ({ ...part, text: replacePrice(part.text, previousPrice, row.price_usd) }));
  }
  for (const kit of [...(catalog.kits || [])]) {
    if (!/spare[ -]?parts/i.test(row.name) || !kit.machine_ids?.includes(row.machine_id) || kit.price_usd !== previousPrice) continue;
    let target = kit;
    if (kit.machine_ids.length > 1) {
      target = { ...copy(kit), kit_id: `${kit.kit_id}-admin-${row.machine_id}`, machine_ids: [row.machine_id] };
      kit.machine_ids = kit.machine_ids.filter(id => id !== row.machine_id); catalog.kits.push(target);
    }
    target.source_reference ||= copy({ price_usd: target.price_usd, price_text: target.price_text, title: target.title });
    target.price_usd = row.price_usd; target.price_text = moneyText(row.price_usd);
    target.title.text = replacePrice(target.title.text, previousPrice, row.price_usd);
    target.admin_change = copy(row.admin_change);
  }
}

export function createCatalogState(catalog) {
  if (!Array.isArray(catalog?.priceLines) || !Array.isArray(catalog?.terms) || !catalog.manifest?.catalog_sha256) throw new Error('The source catalog is incomplete.');
  return { publishedCatalog: copy(catalog), draft: null, history: [] };
}

export function catalogChanges(published, candidate) {
  const changes = [];
  const beforeLines = new Map(published.priceLines.map(row => [rowKey(row), row]));
  for (const row of candidate.priceLines) {
    const before = beforeLines.get(rowKey(row));
    if (!before || JSON.stringify(cleanLine(before)) !== JSON.stringify(cleanLine(row))) changes.push({ section: 'price_line', key: rowKey(row), machine_id: row.machine_id, label: row.name, before: before ? cleanLine(before) : null, after: cleanLine(row) });
  }
  for (const terms of candidate.terms) {
    const before = published.terms.find(item => item.machine_id === terms.machine_id)?.lead_time || null;
    if (JSON.stringify(cleanLeadTime(before)) !== JSON.stringify(cleanLeadTime(terms.lead_time))) changes.push({ section: 'lead_time', key: terms.machine_id, machine_id: terms.machine_id, label: 'Lead time', before: cleanLeadTime(before), after: cleanLeadTime(terms.lead_time) });
  }
  return changes;
}

function requireDraft(state) {
  if (!state.draft) throw new Error('Create a catalog revision before editing.');
  if (state.draft.based_on_hash !== state.publishedCatalog.manifest.catalog_sha256) throw new Error('The published catalog changed. Start a fresh catalog revision.');
  return state.draft;
}

function validateRequirements(catalog, row, ids) {
  if (!Array.isArray(ids) || ids.length > 50 || ids.some(id => typeof id !== 'string')) throw new Error('Choose valid required options.');
  if (ids.length && (!row.option_id || !['catalog_option', 'catalog_included'].includes(row.line_class))) throw new Error('Required companions can only be assigned to catalog options.');
  if (new Set(ids).size !== ids.length) throw new Error('Select each required option only once.');
  if (ids.includes(row.option_id)) throw new Error('An option cannot require itself.');
  const machineRows = catalog.priceLines.filter(item => item.machine_id === row.machine_id);
  const result = ids.map(id => {
    const target = machineRows.find(item => item.option_id === id && ['catalog_option', 'catalog_included'].includes(item.line_class));
    if (!target) throw new Error('Required options must be available on this machine.');
    return { target: target.name, option_id: target.option_id };
  });
  const graph = new Map(machineRows.filter(item => item.option_id).map(item => [item.option_id, item === row ? ids : (item.requires_option_ids || []).map(ref => ref.option_id).filter(Boolean)]));
  const reaches = (node, path = new Set()) => {
    if (path.has(node)) throw new Error('Required-option rules cannot create a dependency cycle.');
    const next = new Set(path); next.add(node);
    for (const target of graph.get(node) || []) reaches(target, next);
  };
  if (row.option_id) reaches(row.option_id);
  return result;
}

/** Execute only against an isolated, version-checked candidate owned by the service. */
export function executeCatalogCommand(state, command, args = {}, actor) {
  const author = identity(actor);
  if (command === 'startDraft') {
    if (state.draft) return state.draft;
    state.draft = { id: `catalog-draft-${randomUUID()}`, label: value(args.label) || 'Catalog update', based_on_hash: state.publishedCatalog.manifest.catalog_sha256, created_at: now(), updated_at: now(), created_by: author, catalog: copy(state.publishedCatalog), review: null };
    return state.draft;
  }
  const current = requireDraft(state);
  if (command === 'saveDraft') {
    const next = copy(current), at = now();
    const operations = ['line', 'terms', 'adjustment'].filter(key => args[key] != null);
    if (operations.length !== 1) throw new Error('Save one catalog change at a time.');
    if (args.label != null) { next.label = value(args.label); if (!next.label || next.label.length > 160) throw new Error('Use a catalog revision name under 160 characters.'); }
    if (args.line) {
      const input = args.line;
      const row = next.catalog.priceLines.find(item => rowKey(item) === input.item_id);
      if (!row) throw new Error('This price line is not in the catalog.');
      const previousPrice = row.price_usd;
      if ('price_usd' in input) row.price_usd = price(input.price_usd);
      if ('included' in input) {
        if (!row.option_id || !['catalog_option', 'catalog_included'].includes(row.line_class)) throw new Error('Only catalog options can be changed to an included feature.');
        if (typeof input.included !== 'boolean') throw new Error('Choose whether this option is included.');
        row.line_class = input.included ? 'catalog_included' : 'catalog_option';
        if (input.included) row.price_usd = 0;
      }
      if (row.line_class === 'catalog_included' && row.price_usd !== 0) throw new Error('Included features have no additional price.');
      if ('requires_option_ids' in input) {
        row.requires_option_ids = validateRequirements(next.catalog, row, input.requires_option_ids);
        row.flags = (row.flags || []).filter(flag => flag.kind !== 'requires');
        if (row.requires_option_ids.length) row.flags.push({ kind: 'requires', evidence: `Requires ${row.requires_option_ids.map(item => item.target).join(' and ')}` });
      }
      if (next.catalog.priceLines.some(included => included.machine_id === row.machine_id && included.line_class === 'catalog_included' && included.requires_option_ids?.some(ref => next.catalog.priceLines.find(item => item.machine_id === row.machine_id && item.option_id === ref.option_id)?.line_class !== 'catalog_included'))) throw new Error('An included feature can only require other included features. Include its companions first or keep this option priced.');
      row.admin_change = { by: author, at, draft_id: next.id };
      synchronizePrice(next.catalog, row, previousPrice);
    }
    if (args.terms) {
      const input = args.terms, terms = next.catalog.terms.find(item => item.machine_id === input.machine_id);
      if (!terms) throw new Error('Choose a machine with a commercial-terms record.');
      const text = value(input.text);
      if (!text || text.length > 4000) throw new Error('Enter lead-time terms under 4,000 characters.');
      const optionalWeek = n => n === '' || n == null ? null : Number(n);
      const min = optionalWeek(input.min_weeks), max = optionalWeek(input.max_weeks);
      if ((min == null) !== (max == null) || min != null && (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min || max > 520)) throw new Error('Enter a valid minimum and maximum lead time in weeks.');
      terms.lead_time = { ...(terms.lead_time || {}), text, min_weeks: min, max_weeks: max, admin_change: { by: author, at, draft_id: next.id } };
    }
    if (args.adjustment) {
      const input = args.adjustment;
      if (!next.catalog.machines.some(machine => machine.machine_id === input.machine_id)) throw new Error('Choose a machine for the price adjustment.');
      const percent = Number(input.percent);
      if (input.percent === '' || input.percent == null || !Number.isFinite(percent) || percent <= -100 || percent > 1000) throw new Error('Enter a percentage greater than −100 and no more than 1,000.');
      for (const row of next.catalog.priceLines.filter(item => item.machine_id === input.machine_id && item.line_class !== 'catalog_included' && Number.isFinite(item.price_usd))) {
        const previousPrice = row.price_usd;
        row.price_usd = price(round(row.price_usd * (1 + percent / 100)));
        row.admin_change = { by: author, at, draft_id: next.id };
        synchronizePrice(next.catalog, row, previousPrice);
      }
    }
    next.review = null; next.updated_at = at;
    state.draft = next;
    return { draft_id: next.id, changes: catalogChanges(state.publishedCatalog, next.catalog) };
  }
  if (command === 'reviewDraft') {
    const changes = catalogChanges(state.publishedCatalog, current.catalog);
    if (!changes.length) throw new Error('Make a catalog change before reviewing this revision.');
    current.review = { actor: author, at: now(), fingerprint: digest(current.catalog) };
    return current.review;
  }
  if (command === 'publishDraft') {
    const changes = catalogChanges(state.publishedCatalog, current.catalog);
    if (!current.review || current.review.fingerprint !== digest(current.catalog)) throw new Error('Review the current catalog changes before publishing.');
    if (!changes.length) throw new Error('There are no catalog changes to publish.');
    const next = copy(current.catalog), at = now();
    const sourceManifest = next.manifest.source_manifest || copy(next.manifest);
    next.manifest = { ...next.manifest, origin: 'workspace_admin', source_catalog_hash: sourceManifest.catalog_sha256, source_run_id: sourceManifest.run_id, source_manifest: sourceManifest, run_id: `pac-admin-${randomUUID()}`, catalog_sha256: digest(next), published_at: at, published_by: author, approval: copy(current.review) };
    const entry = { id: current.id, label: current.label, based_on_hash: current.based_on_hash, catalog_hash: next.manifest.catalog_sha256, run_id: next.manifest.run_id, published_at: at, published_by: author, review: copy(current.review), changes };
    state.history ||= []; state.history.unshift(entry);
    state.publishedCatalog = next; state.draft = null;
    return entry;
  }
  if (command === 'discardDraft') { state.draft = null; return { discarded: current.id }; }
  throw new Error('Choose a supported catalog action.');
}
