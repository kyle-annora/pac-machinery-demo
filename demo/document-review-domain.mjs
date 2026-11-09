/**
 * Local document-review records, separate from frozen quotation content.
 * No storage, delivery, authentication, or quotation mutations happen here.
 * Every command returns a validated, deeply frozen copy of the review store.
 */
const SCHEMA = 1;
const MAX_TEXT = 4000;
const MAX_QUOTE = 1000;
const SAMPLE_AT = '2026-11-09T17:23:00.000Z';

function require(condition, message) {
  if (!condition) throw new Error(message);
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function object(value, label) {
  require(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} is invalid.`);
  return value;
}

function text(value, label, max = MAX_TEXT, allowEmpty = false) {
  require(typeof value === 'string', `${label} must be text.`);
  const clean = value.trim();
  require(allowEmpty || clean.length > 0, `${label} cannot be empty.`);
  require(clean.length <= max, `${label} must be ${max} characters or fewer.`);
  return clean;
}

function positiveInteger(value, label, max = Number.MAX_SAFE_INTEGER) {
  require(Number.isSafeInteger(value) && value > 0 && value <= max, `${label} is invalid.`);
  return value;
}

function boolean(value, label) {
  require(typeof value === 'boolean', `${label} is invalid.`);
  return value;
}

function timestamp(value) {
  require(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)), 'Comment date is invalid.');
  return new Date(value).toISOString();
}

function rectangleList(value) {
  require(Array.isArray(value) && value.length <= 200, 'Document selection is invalid.');
  return value.map(rect => {
    require(Array.isArray(rect) && rect.length === 4 && rect.every(n => Number.isFinite(n) && n >= 0 && n <= 1), 'Document selection coordinates are invalid.');
    const [x, y, width, height] = rect;
    require(width > 0 && height > 0 && x + width <= 1 + 1e-6 && y + height <= 1 + 1e-6, 'Document selection must stay within its page.');
    return [x, y, width, height];
  });
}

function cleanReply(value) {
  object(value, 'Reply');
  return {
    id: text(value.id, 'Reply ID', 128),
    text: text(value.text, 'Reply'),
    author: text(value.author, 'Reply author', 120),
    at: timestamp(value.at),
    sample: value.sample === undefined ? false : boolean(value.sample, 'Sample status'),
  };
}

function cleanThread(value) {
  object(value, 'Comment');
  const version = positiveInteger(value.version, 'Proposal version');
  require(value.documentId === `quote-v${version}`, 'Comment document does not match its proposal version.');
  require(Array.isArray(value.replies), 'Comment replies are invalid.');
  return {
    id: text(value.id, 'Comment ID', 128),
    version,
    documentId: `quote-v${version}`,
    page: positiveInteger(value.page, 'Document page', 2),
    quote: text(value.quote, 'Selected text', MAX_QUOTE, true),
    rects: rectangleList(value.rects),
    text: text(value.text, 'Comment'),
    author: text(value.author, 'Comment author', 120),
    at: timestamp(value.at),
    sample: value.sample === undefined ? false : boolean(value.sample, 'Sample status'),
    resolved: boolean(value.resolved, 'Resolved status'),
    replies: value.replies.map(cleanReply),
  };
}

/** Validate parsed storage data and discard unknown properties. Never silently lose invalid records. */
export function sanitizeReviewStore(raw) {
  object(raw, 'Document review data');
  require(raw.schema === SCHEMA && Array.isArray(raw.threads), 'Document review data has an unsupported format.');
  const threads = raw.threads.map(cleanThread);
  const ids = new Set();
  for (const thread of threads) {
    for (const entry of [thread, ...thread.replies]) {
      require(!ids.has(entry.id), 'Document review data contains a duplicate comment or reply ID.');
      ids.add(entry.id);
    }
  }
  return freeze({ schema: SCHEMA, threads });
}

export function createReviewStore() {
  return freeze({ schema: SCHEMA, threads: [] });
}

function identity(id) {
  if (id !== undefined) return id;
  require(typeof globalThis.crypto?.randomUUID === 'function', 'A comment ID could not be generated. Please use a supported browser.');
  return globalThis.crypto.randomUUID();
}

export function addThread(store, input) {
  const current = sanitizeReviewStore(store);
  object(input, 'New comment');
  const { version, page, quote = '', rects = [], author = 'Demo reviewer', sample = false } = input;
  return sanitizeReviewStore({
    schema: SCHEMA,
    threads: [...current.threads, {
      id: identity(input.id), version, documentId: `quote-v${version}`, page,
      quote, rects, text: input.text, author, at: input.at ?? new Date().toISOString(),
      sample, resolved: false, replies: [],
    }],
  });
}

export function replyToThread(store, id, input) {
  const current = sanitizeReviewStore(store);
  const target = current.threads.find(thread => thread.id === id);
  require(target, 'This comment could not be found.');
  require(!target.resolved, 'Reopen this comment before adding a reply.');
  object(input, 'New reply');
  const reply = {
    id: identity(input.id), text: input.text, author: input.author ?? 'Demo reviewer',
    at: input.at ?? new Date().toISOString(), sample: input.sample ?? false,
  };
  return sanitizeReviewStore({
    schema: SCHEMA,
    threads: current.threads.map(thread => thread.id === id ? { ...thread, replies: [...thread.replies, reply] } : thread),
  });
}

export function setThreadResolved(store, id, resolved) {
  const current = sanitizeReviewStore(store);
  boolean(resolved, 'Resolved status');
  require(current.threads.some(thread => thread.id === id), 'This comment could not be found.');
  return sanitizeReviewStore({
    schema: SCHEMA,
    threads: current.threads.map(thread => thread.id === id ? { ...thread, resolved } : thread),
  });
}

export function threadsForVersion(store, version, { status = 'all' } = {}) {
  const current = sanitizeReviewStore(store);
  positiveInteger(version, 'Proposal version');
  require(['all', 'open', 'resolved'].includes(status), 'Comment filter is invalid.');
  return freeze(current.threads.filter(thread => thread.version === version &&
    (status === 'all' || thread.resolved === (status === 'resolved'))));
}

/** A visibly labelled example; only the caller decides which version should receive it. */
export function ensureSampleThread(store, version) {
  const current = sanitizeReviewStore(store);
  positiveInteger(version, 'Proposal version');
  const id = `sample-quote-v${version}-planning`;
  if (current.threads.some(thread => thread.id === id)) return current;
  const withThread = addThread(current, {
    id, version, page: 2, quote: 'Planning lead time: 6 weeks - illustrative', rects: [],
    text: 'Does the six-week planning estimate include the assisted-loading options?',
    author: 'Alex Morgan', at: SAMPLE_AT, sample: true,
  });
  return replyToThread(withThread, id, {
    id: `${id}-reply`,
    text: 'The sample proposal uses six weeks for both options. PAC will confirm timing for the final configuration.',
    author: 'PAC sales team', at: '2026-11-09T17:25:00.000Z', sample: true,
  });
}
