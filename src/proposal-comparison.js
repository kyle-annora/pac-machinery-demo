/* A common decision model for seller presentation and fixed customer proposals.
   Only published facts enter this model; no live catalog or guessed savings. */
const asText = value => String(value ?? '').trim();
const amount = line => Number.isFinite(line.total) ? line.total : Number.isFinite(line.price_usd) ? line.price_usd * (line.quantity ?? 1) : line.price;
const key = line => `${line.line_class || 'item'}:${line.option_id || line.name}`;
const scopeLines = alternative => [
  ...(alternative.lines || []),
  ...(alternative.engineering || []).map((line, index) => ({ ...line, name: line.description, line_class: 'engineering', quantity: 1, price_usd: line.price, total: line.price, occurrence: index })),
  ...(alternative.special || []).map((line, index) => ({ ...line, name: line.description, line_class: 'special', quantity: 1, price_usd: line.price, total: line.price, occurrence: index })),
];
const signature = line => JSON.stringify([line.quantity ?? 1, amount(line), line.description || '', line.conditions || [], line.lead_time || '']);
const names = items => items.map(item => item.name).join(', ');

/** Editorial summaries retain the constraints from the supplied narrative. Full
    source detail remains available alongside these short descriptions. */
export function conciseLineDescription(line) {
  if (!asText(line.description) || line.description === line.name) return '';
  if (line.option_id === 'easy_load_bag_opener') return 'Forms a square or rectangular bag opening and grips the bag during loading. Designed for bags 10 in or wider; requires Seal Flattener Fingers.';
  if (line.option_id === 'seal_flattener_fingers') return 'Stretches the bag before sealing to reduce wrinkles in the seal area, including when heavier products pull on the bag.';
  const clean = asText(line.description).replace(/\bhas bee reached\b/g, 'has been reached').replace(/\bfinisehd\b/g, 'finished').replace(/\bparts fo the machine\b/g, 'parts for the machine').replace(/\belectricitythat\b/g, 'electricity that').replace(/\belimantor\b/g, 'eliminator').replace(/\brequies\b/g, 'requires').replace(/\benviroments\b/g, 'environments').replace(/\bthe the\b/g, 'the');
  const first = clean.match(/^.*?[.!?](?=\s|$)/)?.[0] || clean;
  return first.length > 240 ? `${first.slice(0, 237).replace(/\s+\S*$/, '')}…` : first;
}

export function proposalComparison(proposal) {
  const alternatives = proposal.alternatives || [];
  const columns = alternatives.map(scopeLines);
  // Occurrence-aware keys preserve repeated custom items rather than dropping them.
  const maps = columns.map(lines => {
    const occurrences = new Map();
    return new Map(lines.map(line => { const base = key(line), n = occurrences.get(base) || 0; occurrences.set(base, n + 1); return [`${base}:${n}`, line]; }));
  });
  const rows = [...new Set(maps.flatMap(map => [...map.keys()]))].map(id => {
    const values = maps.map(map => map.get(id) || null);
    return { key: id, label: values.find(Boolean).name, values };
  });
  const shared = rows.filter(row => row.values.every(Boolean) && row.values.every(value => signature(value) === signature(row.values[0])));
  const differences = rows.filter(row => !shared.includes(row));
  const sameMachine = alternatives.length > 0 && alternatives.every(a => a.machine_id === alternatives[0].machine_id);
  const commonPhoto = sameMachine && alternatives[0].photo?.file && alternatives.every(a => a.photo?.file === alternatives[0].photo.file) ? alternatives[0] : null;
  const baseline = alternatives[0];
  const summaries = alternatives.map((a, index) => {
    const distinct = differences.map(row => row.values[index]).filter(Boolean);
    const extra = differences.filter(row => !row.values[0] && row.values[index]).map(row => row.values[index]);
    const removed = differences.filter(row => row.values[0] && !row.values[index]).map(row => row.values[0]);
    const repriced = differences.filter(row => row.values[0] && row.values[index] && signature(row.values[0]) !== signature(row.values[index]));
    const delta = index && Number.isFinite(a.totals?.total) && Number.isFinite(baseline?.totals?.total) ? Math.round((a.totals.total - baseline.totals.total) * 100) / 100 : 0;
    let summary = distinct.length ? `Quoted scope: ${names(distinct)}.` : 'The shared equipment and services below, with no additional configuration items.';
    if (sameMachine && a.lines?.some(line => line.option_id === 'easy_load_bag_opener')) summary = 'Adds bag-opening and seal-area support for the operator. Confirm bag size, product handling and loading workflow with PAC.';
    else if (sameMachine && !distinct.length && differences.some(row => row.values.some(line => line?.option_id === 'easy_load_bag_opener'))) summary = 'The shared base equipment and services, without the added bag-opening and seal-area options.';
    return { quote_id: a.quote_id, label: a.label, summary, distinct, added: extra, removed, changed: repriced, delta, compared_with: baseline?.label, discount_delta: (a.totals?.discount || 0) - (baseline?.totals?.discount || 0) };
  });
  return {
    title: alternatives.length === 1 ? 'Your proposed configuration' : sameMachine ? `${alternatives.length === 2 ? 'Two' : alternatives.length} approaches to your application` : 'Compare equipment for your application',
    summary: alternatives.length === 1 ? 'Review the equipment, quoted scope and conditions with PAC.' : 'Compare what is included, what changes and the investment for each approach. Their prices are not added together.',
    sameMachine, commonPhoto, shared, differences, alternatives: summaries,
  };
}
