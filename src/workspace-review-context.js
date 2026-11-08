import * as C from './catalog.js';
import { conciseLineDescription } from './proposal-comparison.js';

// Presentation of source conditions only. Approval policy stays in sales-domain.
export function engineeringTriggers(catalog, quote, working = quote.working) {
  const triggers = [];
  const machine = C.getMachine(catalog, quote.machine_id);
  if (working.draft.machine_snapshot?.engineering_approval_required || machine?.engineering_approval_required) {
    triggers.push({ name: working.draft.machine_title, reason: 'This machine requires engineering approval.' });
  }
  for (const line of working.draft.lines) {
    const source = C.getPriceLines(catalog, quote.machine_id).find(row => row.line_class === line.line_class && (line.option_id ? row.option_id === line.option_id : row.name === line.name));
    const reasons = [...new Set([...(line.flags || []), ...(source?.flags || [])].filter(flag => flag.kind === 'engineering_review').map(flag => flag.evidence || 'Engineering review required by the catalog.'))];
    if (reasons.length) triggers.push({ name: line.name, reason: reasons.join(' ') });
  }
  return triggers;
}

export function optionPurpose(catalog, row) {
  const full = C.describeLine(catalog, row).description.replace(/\s+/g, ' ').trim();
  if (!full) return row.line_class === 'service' ? 'Service scope and conditions are recorded with the quote.' : '';
  return conciseLineDescription({ ...row, description: full });
}

export function optionGroup(row) {
  if (row.line_class === 'service') return 'Services';
  if (/print|label|registration/i.test(row.name)) return 'Printing & identification';
  if (/load|funnel|conveyor|table|holder|support|count/i.test(row.name)) return 'Loading & handling';
  if (/seal|air expeller|bag open|flattener/i.test(row.name)) return 'Bag handling & sealing';
  if (/spare|warranty|crate/i.test(row.name)) return 'Support & delivery';
  return 'Machine options';
}
