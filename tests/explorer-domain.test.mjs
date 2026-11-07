import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../src/catalog.js';
import * as E from '../src/explorer.js';

const source = (process.env.ROLLBAG_SOURCE || fileURLToPath(new URL('../data/catalog/', import.meta.url))) + path.sep;
const read = path => JSON.parse(fs.readFileSync(source + path));
const c = { manifest: read('manifest.json'), machines: read('catalog/machines.json'), priceLines: read('catalog/price_lines.json'), narratives: read('catalog/narratives.json'), media: read('catalog/media.json'), terms: read('catalog/commercial_terms.json'), kits: read('catalog/spare_parts.json') };
let count = 0;
const ok = (name, fn) => { fn(); count++; console.log(`PASS ${name}`); };
const copy = value => JSON.parse(JSON.stringify(value));
const reference = E.captureReference(c, 'r3200', 'machine');
const draft = D.newDraft(c, 'r3200');

ok('machine uses the exact confirmed R3200 photograph', () => {
  assert.equal(E.topics(c, 'r3200')[0].photo.image_id, 'img_877f3a8a815e');
  assert.equal(E.validateReference(c, reference).valid, true);
  assert.match(reference.reference_id, /^[0-9a-f-]{36}$/);
});
ok('option references are available rows with catalog descriptions, labeled as generic', () => {
  const list = E.topics(c, 'r3200');
  assert.deepEqual(list.map(t => t.key), ['machine', 'easy_load_bag_opener', 'seal_flattener_fingers', 'label_printer_applicator']);
  for (const topic of list.slice(1)) {
    assert.equal(topic.description, D.describeLine(c, D.getOption(c, 'r3200', topic.option_id)).description);
    assert.match(topic.source_label, /not an installed/);
    assert.ok(topic.photo.image_id);
  }
  const noEasyLoad = { ...c, priceLines: c.priceLines.filter(row => !(row.machine_id === 'r3200' && row.option_id === 'easy_load_bag_opener')) };
  assert.ok(!E.topics(noEasyLoad, 'r3200').some(topic => topic.key === 'easy_load_bag_opener'));
});
ok('missing or unconfirmed machine photograph never gets a substitute', () => {
  assert.equal(E.topics(c, 'r3200_bag_maker')[0].photo, null);
  const noConfirmedMedia = { ...c, media: c.media.map(photo => ({ ...photo, confirmed_by: null })) };
  assert.ok(E.topics(noConfirmedMedia, 'r3200').every(topic => topic.photo === null));
  assert.equal(E.validateReference(noConfirmedMedia, reference).valid, false);
  assert.deepEqual(E.topics(c, 'missing'), []);
  assert.throws(() => E.captureReference(c, 'r3200', 'invented_geometry'));
});
ok('reference restoration rejects wrong machine, catalog revision and exact photo', () => {
  assert.equal(E.validateReference(c, reference, 'r1275').valid, false);
  assert.equal(E.validateReference({ ...c, manifest: { ...c.manifest, run_id: 'future' } }, reference).valid, false);
  assert.equal(E.validateReference({ ...c, manifest: { ...c.manifest, catalog_sha256: 'changed' } }, reference).valid, false);
  assert.equal(E.validateReference(c, { ...reference, photo: { ...reference.photo, file: 'substitute.jpg' } }).valid, false);
  assert.equal(E.validateReference(c, { ...reference, option_id: 'seal_flattener_fingers' }).valid, false);
});
ok('generic imagery qualification follows the attached reference through confirmation', () => {
  const optionReference = E.captureReference(c, 'r3200', 'easy_load_bag_opener');
  assert.match(optionReference.source_label, /not an installed/);
  assert.equal(E.validateReference(c, { ...optionReference, source_label: 'R3200 installed option' }).valid, false);
  const confirmed = E.confirmInquiry({ ...draft, requirements: { application: 'Load replacement parts' }, request_scope: 'option_review', reference: optionReference });
  assert.equal(confirmed.inquiry_confirmation.reference.source_label, optionReference.source_label);
});
ok('browsing and capturing another topic do not alter the attached immutable reference', () => {
  const attached = { ...draft, reference };
  const before = JSON.stringify(attached);
  E.topics(c, 'r3200');
  const other = E.captureReference(c, 'r3200', 'easy_load_bag_opener');
  assert.notEqual(other.reference_id, reference.reference_id);
  assert.equal(JSON.stringify(attached), before);
  assert.throws(() => { reference.photo.file = 'changed.jpg'; }, TypeError);
});
ok('older drafts remain valid and unconfirmed without new fields', () => {
  assert.equal(E.inquiryStatus(draft).confirmed, false);
  assert.equal(E.inquiryStatus(draft).changed, false);
  assert.equal(E.inquiryStatus(draft).revision, 0);
  assert.equal(E.requirementsFingerprint({ requirements: draft.requirements }), E.requirementsFingerprint(draft));
  assert.deepEqual(D.deserializeDraft(D.serializeDraft(draft)), draft);
});
ok('confirmation requires explicit application and request scope', () => {
  assert.throws(() => E.confirmInquiry(draft), /application/);
  const application = { ...draft, requirements: { ...draft.requirements, application: 'Bag replacement parts' } };
  assert.throws(() => E.confirmInquiry(application), /scope/);
  assert.throws(() => E.confirmInquiry({ ...application, request_scope: 'automatic_part_order' }), /scope/);
  assert.throws(() => E.confirmInquiry({ ...application, request_scope: 'complete_system', reference: { ...reference, machine_id: 'r1275' } }), /does not match/);
});
const ready = { ...draft, requirements: { ...draft.requirements, project: 'Replacement parts', application: 'Bag replacement parts', bag_dimensions: '12 × 16', throughput: '40 bags/min' }, request_scope: 'complete_system', reference };
const first = E.confirmInquiry(ready);
ok('confirmation is local requirements only and preserves the input', () => {
  assert.equal(ready.inquiry_confirmation, undefined);
  assert.equal(first.inquiry_confirmation.revision, 1);
  assert.equal(first.inquiry_confirmation.confirmation_type, 'local_user_requirements');
  assert.match(first.inquiry_confirmation.notice, /PAC has not reviewed or approved/);
  assert.equal(E.inquiryStatus(first).confirmed, true);
  assert.equal(first.inquiry_confirmation.lines, undefined);
  assert.equal(first.inquiry_confirmation.requirements.project, 'Replacement parts');
  assert.equal(first.inquiry_confirmation.requirements.bag_dimensions, '12 × 16');
  assert.equal(D.total(first), D.total(ready));
  assert.throws(() => { first.inquiry_confirmation.requirements.application = 'changed'; }, TypeError);
});
ok('editing requirements, scope or attached reference invalidates current confirmation', () => {
  for (const edited of [
    { ...first, requirements: { ...first.requirements, throughput: '60 bags/min' } },
    { ...first, requirements: { ...first.requirements, bag_dimensions: '14 × 20' } },
    { ...first, requirements: { ...first.requirements, project: 'New packaging project' } },
    { ...first, requirements: { ...first.requirements, notes: 'Use a different bag material' } },
    { ...first, request_scope: 'application_review' },
    { ...first, reference: E.captureReference(c, 'r3200', 'easy_load_bag_opener') },
    { ...first, machine_id: 'r1275' },
  ]) {
    assert.equal(E.inquiryStatus(edited).confirmed, false);
    assert.equal(E.inquiryStatus(edited).changed, true);
  }
  assert.equal(E.inquiryStatus({ ...first, title: 'A new proposal title' }).confirmed, true);
  const damaged = copy(first);
  damaged.inquiry_confirmation.requirements.application = 'Different saved application';
  assert.equal(E.inquiryStatus(damaged).confirmed, false);
});
ok('new confirmations preserve immutable previous requirements and reference', () => {
  const firstSnapshot = copy(first.inquiry_confirmation);
  const second = E.confirmInquiry({ ...first, requirements: { ...first.requirements, throughput: '60 bags/min' } });
  const third = E.confirmInquiry({ ...second, request_scope: 'application_review' });
  assert.equal(third.inquiry_confirmation.revision, 3);
  assert.deepEqual(third.inquiry_history.map(item => item.revision), [1, 2]);
  assert.deepEqual(third.inquiry_history[0], firstSnapshot);
  assert.equal(third.inquiry_history[0].requirements.throughput, '40 bags/min');
  assert.throws(() => { third.inquiry_history[0].reference.title = 'changed'; }, TypeError);
});
ok('persistence contains no transient source identity and round trips all reference history', () => {
  const saved = D.serializeDraft(first);
  assert.ok(!/"(?:item_id|line_id|narrative_id|block_id|note_item_ids|price_line_ids|line_ids|block_ids)"/.test(saved));
  const loaded = D.deserializeDraft(saved);
  assert.deepEqual(loaded, first);
  assert.equal(E.inquiryStatus(loaded).confirmed, true);
  assert.equal(E.validateReference(c, loaded.reference).valid, true);
});
console.log(`${count} explorer domain checks passed. Browser acceptance is separate.`);
