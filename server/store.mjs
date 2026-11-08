import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync, createHash, timingSafeEqual } from 'node:crypto';
import * as S from '../src/sales-domain.js';

export const hash = value => createHash('sha256').update(String(value)).digest('hex');
export const DEMO_ACCOUNTS = [
  { id: 'pac-sales', email: 'sales@pac.demo', name: 'PAC Sales', role: 'sales' },
  { id: 'pac-engineering', email: 'engineering@pac.demo', name: 'PAC Engineering', role: 'engineering' },
  { id: 'pac-manager', email: 'manager@pac.demo', name: 'PAC Manager', role: 'manager' },
];
export function publicUser(row) { return row ? { id: row.id, email: row.email, name: row.name, role: row.role } : null; }

export function openStore(dbPath, catalog, password = 'pac-demo-2026') {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS workspace(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL,state TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS requests(actor TEXT NOT NULL,request_id TEXT NOT NULL,payload_hash TEXT NOT NULL,result TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(actor,request_id));
    CREATE TABLE IF NOT EXISTS shares(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,deal_id TEXT NOT NULL,proposal_id TEXT NOT NULL,recipient_name TEXT NOT NULL,recipient_email TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL,expires_at INTEGER NOT NULL,revoked_at TEXT);
    CREATE TABLE IF NOT EXISTS inquiries(id TEXT PRIMARY KEY,request_id TEXT UNIQUE NOT NULL,payload_hash TEXT NOT NULL,payload TEXT NOT NULL,receipt TEXT NOT NULL,created_at TEXT NOT NULL);
  `);
  if (!db.prepare('SELECT id FROM workspace WHERE id=1').get()) db.prepare('INSERT INTO workspace VALUES(1,1,?)').run(JSON.stringify(S.seedWorkspace(catalog)));
  for (const user of DEMO_ACCOUNTS) {
    if (db.prepare('SELECT id FROM users WHERE id=?').get(user.id)) continue;
    const salt = randomBytes(16).toString('hex');
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(user.id, user.email, user.name, user.role, salt, scryptSync(password, salt, 64).toString('hex'));
  }
  function workspace() {
    const row = db.prepare('SELECT state,version FROM workspace WHERE id=1').get();
    return { state: S.migrateWorkspace(JSON.parse(row.state)), version: row.version };
  }
  function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (e) { db.exec('ROLLBACK'); throw e; } }
  function writeWorkspace(state, previousVersion) {
    const update = db.prepare('UPDATE workspace SET state=?,version=version+1 WHERE id=1 AND version=?').run(JSON.stringify(state), previousVersion);
    if (!update.changes) throw Object.assign(new Error('The workspace changed. Reload it before reconciling your retained edits.'), { status: 409, code: 'VERSION_CONFLICT' });
    return previousVersion + 1;
  }
  function authenticate(email, password) {
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(email || '').toLowerCase().trim());
    // Use a dummy derivation on misses rather than skipping password work entirely.
    const derived = scryptSync(String(password || ''), user?.salt || 'unknown-local-account', 64);
    return user && timingSafeEqual(Buffer.from(user.password_hash, 'hex'), derived) ? publicUser(user) : null;
  }
  function createSession(user) {
    const token = randomBytes(32).toString('base64url');
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token), user.id, Date.now() + 12 * 60 * 60 * 1000);
    return token;
  }
  function session(token) {
    return publicUser(db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(hash(token || ''), Date.now()));
  }
  return { db, workspace, writeWorkspace, transaction, authenticate, createSession, session, close: () => db.close() };
}
