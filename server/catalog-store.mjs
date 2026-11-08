// Transactional catalog persistence is separate from the public Website catalog.
import { hash } from './store.mjs';

export function createCatalogStore(store, initialCatalog, helpers) {
  const db=store.db;
  db.exec('CREATE TABLE IF NOT EXISTS catalog_state(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL,state TEXT NOT NULL)');
  if(!db.prepare('SELECT id FROM catalog_state WHERE id=1').get())db.prepare('INSERT INTO catalog_state VALUES(1,1,?)').run(JSON.stringify(helpers.createCatalogState(initialCatalog)));
  function read(){const row=db.prepare('SELECT * FROM catalog_state WHERE id=1').get();return {state:JSON.parse(row.state),version:row.version};}
  function project(record=read()){return {catalog:record.state.publishedCatalog,version:record.version,draft:record.state.draft,history:record.state.history,changes:record.state.draft?helpers.catalogChanges(record.state.publishedCatalog,record.state.draft.catalog):[]};}
  function command(input,identity){
    const requestId=input.requestId;
    if(typeof requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(requestId))throw Object.assign(new Error('Supply a unique requestId.'),{status:400,code:'REQUEST_ID_REQUIRED'});
    if(identity.role!=='manager')throw Object.assign(new Error('Manager access is required to maintain the catalog.'),{status:403,code:'FORBIDDEN'});
    const digest=hash(JSON.stringify({command:input.command,args:input.args||{}}));
    return store.transaction(()=>{
      const actor=`catalog:${identity.id}`,prior=db.prepare('SELECT payload_hash,result FROM requests WHERE actor=? AND request_id=?').get(actor,requestId),record=read();
      if(prior){if(prior.payload_hash!==digest)throw Object.assign(new Error('This requestId was already used for another catalog operation.'),{status:409,code:'REQUEST_REUSED'});return {...project(record),result:JSON.parse(prior.result),replayed:true};}
      if(!Number.isInteger(input.expectedVersion)||input.expectedVersion!==record.version)throw Object.assign(new Error('The catalog changed. Reload before reviewing your edits.'),{status:409,code:'VERSION_CONFLICT'});
      const result=helpers.executeCatalogCommand(record.state,input.command,input.args||{},identity);
      db.prepare('UPDATE catalog_state SET version=version+1,state=? WHERE id=1 AND version=?').run(JSON.stringify(record.state),record.version);
      db.prepare('INSERT INTO requests VALUES(?,?,?,?,?)').run(actor,requestId,digest,JSON.stringify(result??null),new Date().toISOString());
      return {...project({state:record.state,version:record.version+1}),result:result??null};
    });
  }
  return {read,project,command};
}
