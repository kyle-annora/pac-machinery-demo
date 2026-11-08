// A recoverable editor buffer is separate from the saved commercial revision.
// Saving applies only this quote, preserving unrelated deal/customer changes.
const copy = value => JSON.parse(JSON.stringify(value));
export function quoteBasis(working) {
  const { approvals, updated_at, saved_at, ...commercial } = working;
  return JSON.stringify(commercial);
}
export function validQuoteEdit(state, entry) {
  const deal = state?.deals?.find(item => item.id === entry?.dealId);
  const quote = deal?.quotes?.find(item => item.id === entry?.quoteId);
  return Boolean(quote && entry?.version === 1 && typeof entry.base === 'string' &&
    quote.working.status === 'draft' && entry.working?.status === 'draft' &&
    quote.working.revision === entry.working.revision &&
    Array.isArray(entry.working.draft?.lines) && Array.isArray(entry.working.engineering) &&
    Array.isArray(entry.working.special) && entry.working.discount && entry.working.approvals);
}
export function stageQuoteChange(deal, quoteId, previous, command) {
  const quote = deal.quotes.find(item => item.id === quoteId);
  if (!quote || quote.working.status !== 'draft') throw new Error('Create a draft revision before editing this quote.');
  if (previous && (previous.version !== 1 || previous.dealId !== deal.id || previous.quoteId !== quoteId)) throw new Error('This editor belongs to another quote.');
  if (previous && previous.base !== quoteBasis(quote.working)) throw new Error('This quote changed since you started editing. Your edits are retained. Discard them to load the saved quote.');
  const candidate = copy(deal);
  const draftQuote = candidate.quotes.find(item => item.id === quoteId);
  if (previous) draftQuote.working = copy(previous.working);
  command(candidate, draftQuote);
  return { version: 1, dealId: deal.id, quoteId, base: previous?.base || quoteBasis(quote.working), working: copy(draftQuote.working) };
}
export function applyQuoteEdit(state, entry) {
  if (!validQuoteEdit(state, entry)) throw new Error('This editor no longer matches an editable quote revision. Your edits have not been applied.');
  const deal = state.deals.find(item => item.id === entry.dealId);
  const quote = deal.quotes.find(item => item.id === entry.quoteId);
  if (quoteBasis(quote.working) !== entry.base) throw new Error('This quote changed in another view. Your edits are retained. Discard them to load the saved quote.');
  quote.working = copy(entry.working);
  quote.working.approvals = {};
  quote.working.saved_at = new Date().toISOString();
  quote.working.updated_at = quote.working.saved_at;
  deal.updated_at = quote.working.saved_at;
  deal.activity.unshift({ id: `save-${globalThis.crypto.randomUUID()}`, at: deal.updated_at, quote_id: quote.id, revision: quote.working.revision, message: `${quote.label} Rev ${quote.working.revision} saved.` });
  return quote;
}
