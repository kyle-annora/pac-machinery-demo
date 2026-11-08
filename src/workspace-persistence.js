/**
 * One synchronous workspace commit. Commands must mutate only their candidate;
 * navigation, notifications and form-draft cleanup belong after this returns.
 *
 * `save(serialized)` must atomically persist the JSON string or throw. A browser
 * localStorage.setItem adapter satisfies that contract. An asynchronous service
 * will need an awaited commit contract; returning a Promise here is an error.
 * The helper cannot roll back an adapter that writes partially before throwing.
 */
export class WorkspacePersistenceError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'WorkspacePersistenceError';
    this.code = 'WORKSPACE_SAVE_FAILED';
  }
}

function preserveFrozenSubtrees(source, copy) {
  if (!source || typeof source !== 'object' || !copy || typeof copy !== 'object') return;
  for (const key of Object.keys(copy)) preserveFrozenSubtrees(source[key], copy[key]);
  if (Object.isFrozen(source)) Object.freeze(copy);
}

const isThenable = value => value != null && typeof value.then === 'function';

export function commitWorkspace(currentState, command, { save } = {}) {
  if (typeof command !== 'function' || typeof save !== 'function') {
    throw new TypeError('Workspace commits require a command and a synchronous save adapter.');
  }

  let candidate;
  try {
    candidate = JSON.parse(JSON.stringify(currentState));
    preserveFrozenSubtrees(currentState, candidate);
  } catch (cause) {
    throw new WorkspacePersistenceError('The workspace could not be prepared for saving. Your saved data is unchanged.', cause);
  }

  // Validation failures propagate unchanged; neither persistence nor UI effects
  // run when a command has only partially changed its isolated candidate.
  const result = command(candidate);
  if (isThenable(result)) throw new TypeError('Workspace commands must complete synchronously.');

  try {
    const serialized = JSON.stringify(candidate);
    const saved = save(serialized);
    if (saved === false || isThenable(saved)) {
      throw new TypeError('The save adapter did not acknowledge a synchronous workspace save.');
    }
  } catch (cause) {
    throw new WorkspacePersistenceError('Changes could not be saved. Your saved workspace is unchanged. Keep your edits and try again.', cause);
  }

  return { state: candidate, result };
}
