import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const manifestPath = file => file + '.manifest.json';
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const requiredColumns = {
  workspace:['id','version','state'], users:['id','email','name','role','salt','password_hash'],
  sessions:['token_hash','user_id','expires_at'], requests:['actor','request_id','payload_hash','result','created_at'],
  shares:['id','token_hash','deal_id','proposal_id','recipient_name','recipient_email','created_by','created_at','expires_at','revoked_at'],
  inquiries:['id','request_id','payload_hash','payload','receipt','created_at'], catalog_state:['id','version','state'],
};

function requireFile(file) {
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink())throw new Error('The database must be a regular file, not a symlink.');
}
function unused(file,{manifest=false}={}) {
  for(const candidate of [file,file+'-wal',file+'-shm',file+'-journal',...(manifest?[manifestPath(file)]:[])]) {
    if(fs.existsSync(candidate))throw new Error(`Refusing to overwrite an existing recovery path: ${candidate}`);
  }
}
function tempFor(file) { return path.join(path.dirname(file),`.pac-recovery-${randomUUID()}.sqlite`); }
function cleanup(file) { for(const suffix of ['', '-wal', '-shm', '-journal'])fs.rmSync(file+suffix,{force:true}); }
function publishExclusive(temp,destination) {
  // Same-directory hard-link creation is atomic and fails if destination exists.
  fs.linkSync(temp,destination);fs.unlinkSync(temp);
}

export function validateDatabase(file) {
  requireFile(file);
  const db=new DatabaseSync(file,{readOnly:true});
  try {
    db.exec('PRAGMA query_only=ON; PRAGMA trusted_schema=OFF;');
    const integrity=db.prepare('PRAGMA integrity_check').all();
    if(integrity.length!==1||integrity[0].integrity_check!=='ok')throw new Error('SQLite integrity check failed.');
    if(db.prepare("SELECT name FROM sqlite_schema WHERE type IN ('trigger','view')").all().length)throw new Error('Unexpected executable database schema.');
    for(const [table,columns] of Object.entries(requiredColumns)) {
      const actual=db.prepare(`PRAGMA table_info(${table})`).all().map(row=>row.name);
      if(JSON.stringify(actual)!==JSON.stringify(columns))throw new Error(`Unsupported database schema: ${table}.`);
    }
    const workspace=db.prepare('SELECT state,version FROM workspace WHERE id=1').get();
    const catalog=db.prepare('SELECT state,version FROM catalog_state WHERE id=1').get();
    const state=JSON.parse(workspace?.state||'null'),catalogState=JSON.parse(catalog?.state||'null');
    if(!Number.isInteger(workspace?.version)||workspace.version<1||!Array.isArray(state?.deals))throw new Error('Invalid workspace recovery state.');
    if(!Number.isInteger(catalog?.version)||catalog.version<1||!Array.isArray(catalogState?.publishedCatalog?.priceLines)||!Array.isArray(catalogState.history))throw new Error('Invalid catalog recovery state.');
    return {workspaceVersion:workspace.version,catalogVersion:catalog.version,deals:state.deals.length,users:db.prepare('SELECT count(*) AS count FROM users').get().count,inquiries:db.prepare('SELECT count(*) AS count FROM inquiries').get().count,shares:db.prepare('SELECT count(*) AS count FROM shares').get().count};
  } finally {db.close();}
}

export function backupDatabase({source,destination}) {
  source=path.resolve(source);destination=path.resolve(destination);
  requireFile(source);unused(destination,{manifest:true});
  fs.mkdirSync(path.dirname(destination),{recursive:true,mode:0o700});
  const temp=tempFor(destination);let db,published=false,manifestWritten=false;
  try {
    db=new DatabaseSync(source,{readOnly:true});
    db.exec('PRAGMA busy_timeout=5000; PRAGMA trusted_schema=OFF;');
    // VACUUM INTO produces a consistent standalone snapshot, including committed WAL data.
    db.prepare('VACUUM INTO ?').run(temp);db.close();db=null;
    fs.chmodSync(temp,0o600);
    const summary=validateDatabase(temp);
    const manifest={format:'pac-sqlite-backup/1',createdAt:new Date().toISOString(),sha256:digest(temp),bytes:fs.statSync(temp).size,...summary};
    fs.writeFileSync(manifestPath(destination),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});manifestWritten=true;
    publishExclusive(temp,destination);published=true;
    return {file:destination,manifest:manifestPath(destination),...summary};
  } finally {
    db?.close();cleanup(temp);
    if(!published&&manifestWritten)fs.rmSync(manifestPath(destination),{force:true});
  }
}

export function restoreDatabase({source,destination}) {
  source=path.resolve(source);destination=path.resolve(destination);
  requireFile(source);requireFile(manifestPath(source));unused(destination);
  const manifest=JSON.parse(fs.readFileSync(manifestPath(source),'utf8'));
  if(manifest.format!=='pac-sqlite-backup/1'||manifest.sha256!==digest(source)||manifest.bytes!==fs.statSync(source).size)throw new Error('Backup checksum or manifest validation failed.');
  fs.mkdirSync(path.dirname(destination),{recursive:true,mode:0o700});
  const temp=tempFor(destination);let db;
  try {
    fs.copyFileSync(source,temp,fs.constants.COPYFILE_EXCL);fs.chmodSync(temp,0o600);
    const before=validateDatabase(temp);
    if(before.workspaceVersion!==manifest.workspaceVersion||before.catalogVersion!==manifest.catalogVersion)throw new Error('Backup version metadata does not match its contents.');
    db=new DatabaseSync(temp);db.exec('PRAGMA trusted_schema=OFF; DELETE FROM sessions; PRAGMA wal_checkpoint(TRUNCATE);');db.close();db=null;
    const summary=validateDatabase(temp);
    publishExclusive(temp,destination);
    return {file:destination,sessionsInvalidated:true,...summary};
  } finally {db?.close();cleanup(temp);}
}

function main() {
  const [command,...args]=process.argv.slice(2),options={};
  if(!['backup','restore','verify'].includes(command))throw new Error('Usage: node scripts/database-recovery.mjs backup|restore --source FILE --destination NEW_FILE; verify --source FILE');
  for(let index=0;index<args.length;index+=2){if(!['--source','--destination'].includes(args[index])||!args[index+1])throw new Error('Supply --source and, for backup or restore, --destination.');options[args[index].slice(2)]=args[index+1];}
  if(!options.source||(command!=='verify'&&!options.destination))throw new Error('Source and destination paths are required.');
  const result=command==='backup'?backupDatabase(options):command==='restore'?restoreDatabase(options):validateDatabase(path.resolve(options.source));
  console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
