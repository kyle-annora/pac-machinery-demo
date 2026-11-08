// The server acknowledges mutations before the application replaces saved state.
export class ServiceError extends Error {
  constructor(message, status = 0, code = 'REQUEST_FAILED') {
    super(message); this.name = 'ServiceError'; this.status = status; this.code = code;
  }
}
export async function requestJSON(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal });
  } catch {
    throw new ServiceError('The service could not be reached. Your edits are retained. Check the connection and retry.');
  }
  let data;
  try { data = await response.json(); } catch { throw new ServiceError('The service returned an unreadable response.', response.status); }
  if (!response.ok) throw new ServiceError(data.error?.message || data.message || (typeof data.error === 'string' ? data.error : 'This request could not be completed.'), response.status, data.code || data.error?.code);
  return data;
}
export class WorkspaceService {
  constructor(envelope) { this.accept(envelope); this.pending = null; }
  accept(envelope) { this.state = envelope.state; this.version = envelope.version; this.user = envelope.user; return envelope; }
  async refresh() { return this.accept(await requestJSON('/api/workspace')); }
  async command(command, args = {}) {
    const signature = JSON.stringify({ command, args });
    const payload = this.pending?.signature === signature ? this.pending.payload :
      { command, args, expectedVersion: this.version, requestId: crypto.randomUUID() };
    this.pending = { signature, payload };
    try {
      const response = await requestJSON('/api/workspace/commands', { method: 'POST', body: payload });
      this.pending = null; return this.accept(response);
    } catch (error) {
      // A network failure may follow a successful commit. Preserve its identity
      // for a retry; validation/conflict failures have not committed this command.
      if (error.status) this.pending = null;
      throw error;
    }
  }
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function loginMarkup(session, error = '') {
  return `<main id="main" class="pac-auth"><section class="pac-auth-form"><img src="/assets/pac-machinery-logo.png" alt="PAC Machinery" width="230"><h1>Sales workspace</h1><p>Sign in to manage applications, quotes and customer proposals.</p>
  ${error ? `<div role="alert" class="pac-auth-error">${escape(error)}</div>` : ''}
  <form id="workspace-login"><label>Email<input name="email" type="email" autocomplete="username" required value="sales@pac.demo"></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button type="submit" class="primary">Sign in</button><p id="login-status" role="status"></p></form>
  ${session?.mode === 'local-demo' ? `<details class="pac-auth-demo"><summary>Local test accounts</summary><p>These accounts use the local database and server permissions. PAC SSO is not connected.</p><ul>${(session.accounts || []).map(account => `<li><strong>${escape(account.name || account.role)}</strong><code>${escape(account.email)}</code></li>`).join('')}</ul><p>Default test password: <code>pac-demo-2026</code></p></details>` : ''}</section><aside class="pac-auth-aside"><h2>Keep the application<br>and the quote together.</h2><p>Build alternatives, review scope and pricing, and continue the customer conversation in a versioned proposal.</p><div><span>Configure</span><span>Review</span><span>Present</span></div></aside></main>`;
}
