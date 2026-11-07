/* Photo-based exploration uses the catalog's confirmed media. An attached
   reference changes only through an explicit capture, never through browsing. */
import { cleanSnapshot, describeLine, getMachine, getOption, machinePhotos, optionPhotos } from './catalog.js';

export const REQUEST_SCOPES = Object.freeze(['complete_system', 'option_review', 'application_review']);
const OPTION_TOPICS = ['easy_load_bag_opener', 'seal_flattener_fingers', 'label_printer_applicator'];
const REQUIREMENT_FIELDS = ['project', 'company', 'contact', 'application', 'bag_dimensions', 'bag_width', 'bag_length', 'throughput', 'notes'];
const copy = value => JSON.parse(JSON.stringify(value));
const uuid = () => globalThis.crypto.randomUUID();
const photoValue = photo => photo ? { image_id: photo.image_id, file: photo.converted_file || photo.file } : null;
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const requirementsValue = requirements => ({
  ...Object.fromEntries(REQUIREMENT_FIELDS.map(key => [key, String(requirements?.[key] ?? '').trim()])),
  illustrative: requirements?.illustrative === true,
});
const referenceValue = reference => reference ? {
  schema_version: reference.schema_version,
  reference_id: reference.reference_id,
  machine_id: reference.machine_id,
  topic_key: reference.topic_key,
  title: reference.title,
  description: reference.description,
  source_label: reference.source_label,
  option_id: reference.option_id ?? null,
  photo: reference.photo ? { image_id: reference.photo.image_id, file: reference.photo.file } : null,
  catalog_run: reference.catalog_run,
  catalog_hash: reference.catalog_hash,
  captured_at: reference.captured_at,
} : null;

export function topics(catalog, machineId) {
  const machine = getMachine(catalog, machineId);
  if (!machine) return [];
  const machinePhoto = machinePhotos(catalog, machineId)[0];
  return [{
    key: 'machine',
    title: machine.title.text,
    description: machine.summary.map(paragraph => paragraph.text).join('\n\n'),
    option_id: null,
    photo: photoValue(machinePhoto),
    source_label: machinePhoto ? 'Confirmed machine photograph · PAC catalog' : 'PAC catalog description · no confirmed machine photograph',
  }, ...OPTION_TOPICS.flatMap(optionId => {
    const row = getOption(catalog, machineId, optionId);
    if (!row || row.line_class !== 'catalog_option') return [];
    const photo = optionPhotos(catalog, machineId, optionId)[0];
    return [{
      key: optionId,
      title: row.name,
      description: describeLine(catalog, row).description || row.source_line || row.name,
      option_id: optionId,
      photo: photoValue(photo),
      source_label: photo
        ? (photo.matches === 'generic' ? `Confirmed option reference photograph · not an installed ${machine.title.text} configuration` : 'Confirmed option photograph · PAC catalog')
        : 'PAC catalog option description · no confirmed option photograph',
    }];
  })];
}

export function captureReference(catalog, machineId, topicKey) {
  const topic = topics(catalog, machineId).find(item => item.key === topicKey);
  if (!topic) throw new Error('This product detail is unavailable for the selected machine.');
  return freeze({
    schema_version: 1,
    reference_id: uuid(),
    machine_id: machineId,
    topic_key: topic.key,
    title: topic.title,
    description: topic.description,
    source_label: topic.source_label,
    option_id: topic.option_id,
    photo: copy(topic.photo),
    catalog_run: catalog.manifest.run_id,
    catalog_hash: catalog.manifest.catalog_sha256,
    captured_at: new Date().toISOString(),
  });
}

export function validateReference(catalog, reference, machineId = reference?.machine_id) {
  const fail = reason => ({ valid: false, reason });
  if (!reference) return fail('No product reference is attached.');
  if (reference.schema_version !== 1 || !reference.reference_id || !Number.isFinite(Date.parse(reference.captured_at)))
    return fail('This saved reference format is unavailable. Keep the original reference.');
  if (reference.machine_id !== machineId || !getMachine(catalog, machineId))
    return fail('This reference belongs to another machine. Open its original machine to view it.');
  if (reference.catalog_run !== catalog.manifest.run_id || reference.catalog_hash !== catalog.manifest.catalog_sha256)
    return fail('The exact catalog version saved with this reference is unavailable. The saved reference is unchanged.');
  const topic = topics(catalog, machineId).find(item => item.key === reference.topic_key);
  if (!topic || topic.option_id !== reference.option_id || topic.title !== reference.title || topic.description !== reference.description || topic.source_label !== reference.source_label)
    return fail('This exact product detail is unavailable. The saved reference is unchanged.');
  if (JSON.stringify(photoValue(reference.photo)) !== JSON.stringify(topic.photo))
    return fail('The confirmed photograph saved with this reference is unavailable. No replacement was attached.');
  return { valid: true, reason: '' };
}

// Canonical JSON is an exact comparison value, not a security or approval token.
// The fixed field order also makes legacy drafts without these fields predictable.
export function requirementsFingerprint({ requirements, request_scope, reference } = {}) {
  return `requirements-v1:${JSON.stringify({
    requirements: requirementsValue(requirements),
    request_scope: request_scope || '',
    reference: referenceValue(reference),
  })}`;
}

export function inquiryStatus(draft = {}) {
  const fingerprint = requirementsFingerprint(draft);
  const confirmation = draft.inquiry_confirmation;
  const hasConfirmation = confirmation?.schema_version === 1 && Number.isInteger(confirmation.revision) && confirmation.revision > 0;
  const confirmed = Boolean(hasConfirmation && confirmation.machine_id === draft.machine_id && confirmation.fingerprint === fingerprint && confirmation.fingerprint === requirementsFingerprint(confirmation));
  return {
    confirmed,
    changed: Boolean(hasConfirmation && !confirmed),
    revision: hasConfirmation ? confirmation.revision : 0,
    fingerprint,
    confirmed_at: hasConfirmation ? confirmation.confirmed_at : null,
  };
}

export function confirmInquiry(draft) {
  const requirements = requirementsValue(draft?.requirements);
  if (!draft?.machine_id) throw new Error('Choose a machine before confirming your requirements.');
  if (!requirements.application) throw new Error('Describe your application before confirming your requirements.');
  if (!REQUEST_SCOPES.includes(draft.request_scope)) throw new Error('Choose the scope of your request before confirming your requirements.');
  if (draft.reference && (draft.reference.machine_id !== draft.machine_id || draft.reference.catalog_run !== draft.catalog_run || draft.reference.catalog_hash !== draft.catalog_hash))
    throw new Error('The attached reference does not match this draft and catalog version. Keep it or explicitly attach a matching reference.');
  const previous = draft.inquiry_confirmation;
  const history = Array.isArray(draft.inquiry_history) ? copy(cleanSnapshot(draft.inquiry_history)) : [];
  if (previous) history.push(copy(cleanSnapshot(previous)));
  const revision = Math.max(0, ...history.map(item => Number.isInteger(item.revision) ? item.revision : 0)) + 1;
  const confirmation = freeze({
    schema_version: 1,
    revision,
    confirmed_at: new Date().toISOString(),
    machine_id: draft.machine_id,
    requirements,
    request_scope: draft.request_scope,
    reference: referenceValue(draft.reference),
    fingerprint: requirementsFingerprint(draft),
    confirmation_type: 'local_user_requirements',
    notice: 'Your requirements are confirmed in this local draft. PAC has not reviewed or approved the application, configuration or quotation.',
  });
  return {
    ...copy(cleanSnapshot(draft)),
    inquiry_confirmation: confirmation,
    inquiry_history: freeze(history),
    updated_at: confirmation.confirmed_at,
  };
}
