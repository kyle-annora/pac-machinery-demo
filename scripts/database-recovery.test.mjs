import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createPacServer } from '../server/app.mjs';
import { backupDatabase,restoreDatabase,validateDatabase } from './database-recovery.mjs';

function fixture(t) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'pac-recovery-test-')),source=path.join(directory,'live.sqlite');
  const service=createPacServer({dbPath:source});
  t.after(()=>{service.store.close();fs.rmSync(directory,{recursive:true,force:true});});
  return {directory,source,service,backup:path.join(directory,'backup.sqlite'),restored:path.join(directory,'restored.sqlite')};
}
test('live WAL backup restores the committed workspace, catalog and inquiry state and expires staff sessions',t=>{
  const f=fixture(t),store=f.service.store,current=store.workspace();
  current.state.deals[0].title='Committed recovery example';store.writeWorkspace(current.state,current.version);
  store.db.prepare('INSERT INTO inquiries VALUES(?,?,?,?,?,?)').run('inquiry-1','request-123','hash','{}','{"status":"received"}',new Date().toISOString());
  store.createSession({id:'pac-sales'});
  const result=backupDatabase({source:f.source,destination:f.backup});assert.equal(result.workspaceVersion,2);assert.equal(result.inquiries,1);
  current.state.deals[0].title='Later live edit';store.writeWorkspace(current.state,2);
  const restored=restoreDatabase({source:f.backup,destination:f.restored});assert.equal(restored.workspaceVersion,2);assert.equal(restored.sessionsInvalidated,true);
  const db=new DatabaseSync(f.restored,{readOnly:true});
  assert.equal(JSON.parse(db.prepare('SELECT state FROM workspace').get().state).deals[0].title,'Committed recovery example');
  assert.equal(db.prepare('SELECT count(*) AS n FROM sessions').get().n,0);assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,3);db.close();
  assert.equal(store.workspace().state.deals[0].title,'Later live edit');assert.equal(fs.statSync(f.backup).mode&0o777,0o600);
});
test('recovery refuses overwrites, modified backups and destination sidecars',t=>{
  const f=fixture(t);backupDatabase({source:f.source,destination:f.backup});
  const original=fs.readFileSync(f.source);
  assert.throws(()=>backupDatabase({source:f.source,destination:f.backup}),/Refusing to overwrite/);
  assert.throws(()=>restoreDatabase({source:f.backup,destination:f.source}),/Refusing to overwrite/);assert.deepEqual(fs.readFileSync(f.source),original);
  fs.writeFileSync(f.restored+'-wal','active');assert.throws(()=>restoreDatabase({source:f.backup,destination:f.restored}),/Refusing to overwrite/);fs.rmSync(f.restored+'-wal');
  fs.appendFileSync(f.backup,'tampered');assert.throws(()=>restoreDatabase({source:f.backup,destination:f.restored}),/checksum/);assert.equal(fs.existsSync(f.restored),false);
});
test('validation rejects non-PAC databases and executable schema',t=>{
  const f=fixture(t),unrelated=path.join(f.directory,'other.sqlite'),db=new DatabaseSync(unrelated);db.exec('CREATE TABLE unrelated(id INTEGER)');db.close();
  assert.throws(()=>validateDatabase(unrelated),/Unsupported database schema/);
  f.service.store.db.exec('CREATE VIEW unexpected AS SELECT * FROM workspace');assert.throws(()=>backupDatabase({source:f.source,destination:f.backup}),/Unexpected executable/);assert.equal(fs.existsSync(f.backup),false);
});
