import * as C from './catalog.js';
import * as S from './sales-domain.js';
import { renderDealExplorer, mountDealExplorer } from './deal-explorer.js';
import { commitWorkspace } from './workspace-persistence.js';
import { requestJSON } from './workspace-service.js';
import { renderIntake, mountIntake } from './application-intake.js';
import { renderRevisionDiff } from './workspace-tools.js';
import { icon } from './workbench.js';
import { renderDealWorkspace, renderQuoteWorkspace } from './mercury-views.js';
import { proposalComparison, conciseLineDescription } from './proposal-comparison.js';
import { engineeringTriggers, optionPurpose, optionGroup } from './workspace-review-context.js';
import { stageQuoteChange, applyQuoteEdit, validQuoteEdit } from './quote-edit-session.js';

const STORE = 'pac-machinery-demo.pac.rollbag.sales.v1';
const QUOTE_EDIT_STORE = 'pac-machinery-demo.pac.rollbag.sales.quote-edits.v1';
const FORM_STORE = 'pac-machinery-demo.pac.rollbag.sales.form-edits.v1';
const CONTEXT_STORE = 'pac-machinery-demo.pac.rollbag.sales.context.v1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => Number.isFinite(value) ? new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(value)) : 'Price pending';
const titleCase = value => String(value || '').replace(/_/g,' ').replace(/^./, c => c.toUpperCase());
const date = value => { if(!value)return 'Not recorded'; const normalized=/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00`:value; const parsed=new Date(normalized); return Number.isNaN(parsed.getTime())?'Not recorded':parsed.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); };
const stages = ['discovery','configuring','review','quoted','presented','won','lost'];
const roles = ['sales','engineering','manager'];
let catalog, state, callbacks = {}, role = 'sales', showPrices = true;
let service = null, saving = false, composeDealId = null, shareDealId = null, shareRecords = [], createdShare = null, repricePreview = null;
const draftStore = key => service ? `${key}.server.${service.user.id}` : key;
let search = '', stageFilter = 'all', showNewDeal = false, optionSearch = '', optionCategory = 'all';
let selectedRevision = {}, error = '', storageWarning = '', pendingSelection = null;
let fieldSequence = 0, videoLoaded = false;
let intakeCleanup=null;
let rendered = {}, explorerCleanup = null, mountedExplorer = null;
let hubView = 'deals', quoteStatusFilter = 'all', activeDealId = null;
const activeQuoteIds = {};
const quoteTabs = {}, proposalAlternatives = {}, dealTabs = {}, selectedLines = {}, quotePanels = {};
const closedDealInspectors = new Set();
let quoteEdits = new Map(), lastSavedRaw = null;
let showAddAlternative = false, showDealDetails = false;
let catalogIntakeDraft = null;
let pendingForms = new Map();
let storageBlocked = false;
let originalWorkspaceRaw = null, originalFormsRaw = null, migrationBackupPending = null;
const formBaselines = new WeakMap();

export function init(sourceCatalog, host = {}) {
  catalog = sourceCatalog;
  callbacks = host;
  service = host.service || null;
  if(service) role = service.user.role;
  try { originalFormsRaw=localStorage.getItem(draftStore(FORM_STORE));const forms=JSON.parse(originalFormsRaw||'[]'); pendingForms=new Map(Array.isArray(forms)?forms.filter(entry=>Array.isArray(entry)&&typeof entry[0]==='string'&&entry[1]?.values&&typeof entry[1].values==='object'):[]); } catch { pendingForms=new Map(); }
  if(service) { state = S.migrateWorkspace(service.state); storageBlocked = false; storageWarning = ""; }
  else try {
    originalWorkspaceRaw = localStorage.getItem(STORE);
    const saved = JSON.parse(originalWorkspaceRaw || 'null');
    if (saved && saved.version === 1 && Array.isArray(saved.deals)) {
      state = S.migrateWorkspace(saved);
      if (JSON.stringify(state) !== JSON.stringify(saved)) {
        // Preserve the pre-migration workspace before replacing its saved shape.
        migrationBackupPending = JSON.stringify(saved);
        preserveMigrationBackup();
        persist();
      }
    }
    else if (saved) { state = S.seedWorkspace(catalog); storageBlocked = true; storageWarning = 'The saved workspace format could not be opened. The sample is read-only so your existing data is not overwritten.'; }
    else { state = S.seedWorkspace(catalog); persist(); }
  } catch {
    if (!state) { state = S.seedWorkspace(catalog); storageBlocked = true; }
    storageWarning = 'Browser storage is unavailable or the saved workspace could not be read. Export this workspace before closing.';
  }
  try{const context=JSON.parse(localStorage.getItem(draftStore(CONTEXT_STORE))||'null');if(S.findDeal(state,context?.dealId)){activeDealId=context.dealId;for(const [dealId,quoteId] of Object.entries(context.quoteIds||{})){if(S.findQuote(S.findDeal(state,dealId),quoteId))activeQuoteIds[dealId]=quoteId;}}}catch{}
  try { lastSavedRaw = localStorage.getItem(STORE); } catch { lastSavedRaw = null; }
  try {const entries = JSON.parse(localStorage.getItem(draftStore(QUOTE_EDIT_STORE)) || '[]'); quoteEdits = new Map(Array.isArray(entries) ? entries.filter(([,entry]) => validQuoteEdit(state, entry)) : []);} catch { quoteEdits = new Map(); }
  pendingForms=new Map([...pendingForms].map(([key,entry])=>{if(entry?.name!=='comment'||!entry.values?.quote_ref)return [key,entry];const [quoteId,revision]=entry.values.quote_ref.split('|');const suffix=`|${quoteId}|${revision}`;const normalized=key.endsWith(suffix)?key.slice(0,-suffix.length)+`|${quoteId}`:key;return [normalized,{...entry,key:normalized}];}));
  pendingForms=new Map([...pendingForms].map(([key,entry])=>{
    if(entry?.name!=='comment'||entry.proposalId)return [key,entry];
    const [quoteId,revision]=String(entry.values?.quote_ref||'').split('|');
    const proposal=S.findDeal(state,entry.dealId)?.proposals?.find(p=>p.manifest.some(r=>r.quote_id===quoteId&&r.revision===Number(revision)));
    if(!proposal)return [key,entry];
    const nextKey=`${key}|${proposal.id}`;
    return [nextKey,{...entry,key:nextKey,proposalId:proposal.id,values:{...entry.values,proposal_id:proposal.id}}];
  }));
  const previousCount=pendingForms.size;pendingForms=new Map([...pendingForms].filter(([,entry])=>validPendingEntry(entry)).slice(-64));
  if(previousCount!==pendingForms.size)storageWarning='Some retained form edits no longer match an editable deal revision and were not restored. Saved quotes are unchanged.';
}

export const handles = view => ['demo','present','workspace','deal','quote','deal-explorer'].includes(view);
export const getWorkspace = () => JSON.parse(JSON.stringify(state));
export const serviceUser = () => service?.user || null;
export const firstDealId = () => state?.deals?.[0]?.id;
export function demoDealId() {
  if(!state)return null;
  const existing=state.deals.find(deal=>deal.id===activeDealId&&deal.demo_scenario==='pac-mercury-review-v1')||state.deals.findLast(deal=>deal.demo_scenario==='pac-mercury-review-v1');
  if(existing)return existing.id;
  if(service)return firstDealId();
  try {const deal=commit(candidate=>S.createDemoScenario(catalog,candidate));activeDealId=deal.id;activeQuoteIds[deal.id]=deal.quotes[1].id;return deal.id;}
  catch(err){storageWarning=err.message;return firstDealId();}
}
export const currentDealId = () => S.findDeal(state,activeDealId) ? activeDealId : firstDealId();
export const currentQuoteId = (dealId=currentDealId()) => {const deal=S.findDeal(state,dealId);return S.findQuote(deal,activeQuoteIds[dealId])?.id || deal?.quotes[0]?.id;};
export function startDealForCatalog(savedDraft) {
  catalogIntakeDraft = structuredClone(savedDraft); showNewDeal = true; hubView = 'deals'; navigate('#workspace');
}
export async function attachCatalogDraft(savedDraft, dealId=currentDealId(), label) {
  const deal=dealById(dealId);
  if(!deal){notify('Create a deal before attaching a catalog configuration.');navigate('#workspace');return null;}
  const result=await mutate(candidate=>S.importDraft(catalog,S.findDeal(candidate,deal.id),savedDraft,label || `${savedDraft.machine_title} · Imported configuration`),'Catalog configuration attached as a draft alternative. Complete its application review before issue.',q=>`#quote/${deal.id}/${q.id}`,null,{command:'importDraft',args:{dealId:deal.id,savedDraft,label:label || `${savedDraft.machine_title} · Imported configuration`}});
  if(!result)notify(error||'The configuration could not be added. Your browser draft is preserved.');else catalogIntakeDraft=null;
  return result;
}


const RETAINED_FORMS=new Set(['new-deal','add-quote','scope','deal-details','engineering','labor-rate','special','discount','comment','response-reply','response-status','rename-quote','add-contact','line-price','reset-line-price','return-review']);
function validPendingEntry(entry) {
  if(!entry||!RETAINED_FORMS.has(entry.name)||!entry.values||Array.isArray(entry.values)||typeof entry.values!=='object')return false;
  const fields=Object.entries(entry.values);
  if(fields.length>24||fields.some(([key,value])=>!/^[-a-zA-Z0-9_]+$/.test(key)||['__proto__','constructor','prototype'].includes(key)||typeof value!=='string'||value.length>12000))return false;
  if(entry.name==='new-deal')return !entry.dealId&&!entry.quoteId;
  const deal=S.findDeal(state,entry.dealId);if(!deal)return false;
  if(entry.quoteId){const q=S.findQuote(deal,entry.quoteId);if(!q||q.working.revision!==entry.revision||(q.working.status!=='draft'&&entry.name!=='rename-quote'))return false;const itemId=entry.itemId||(entry.key?.split('|')[4]!=='new'?entry.key?.split('|')[4]:null);if(['line-price','reset-line-price'].includes(entry.name)&&itemId&&!q.working.draft.lines.some(item=>item.quote_line_id===itemId))return false;if(entry.name==='engineering'&&itemId&&!q.working.engineering.some(item=>item.id===itemId))return false;if(entry.name==='special'&&itemId&&!q.working.special.some(item=>item.id===itemId))return false;}
  if(entry.name==='comment'){const [id,revision]=String(entry.values.quote_ref||'').split('|');const q=S.findQuote(deal,id);if(revision==null||!q?.revisions.some(r=>r.revision===Number(revision)))return false;}
  if(entry.proposalId&&!deal.proposals?.some(p=>p.id===entry.proposalId))return false;
  return true;
}
function persistFormDrafts() {
  if(storageBlocked)return;
  try {const entries=[...pendingForms].filter(([,entry])=>validPendingEntry(entry)).slice(-64);const serialized=JSON.stringify(entries);if(serialized.length>750000)throw new Error('Form edit storage limit');localStorage.setItem(draftStore(FORM_STORE),serialized);}
  catch {storageWarning='Unapplied form edits are retained in this window, but could not be saved for reload. Save or discard them before closing.';}
}
function formIdentity(form) {
  const name=form.dataset.salesForm;if(!RETAINED_FORMS.has(name))return null;
  const dealId=form.dataset.deal||'',quoteId=form.dataset.quote||'';
  const quote=quoteId?S.findQuote(S.findDeal(state,dealId),quoteId):null;
  const revision=quote?.working.revision??null;
  const pricingRole=['engineering','labor-rate'].includes(name)?(form.dataset.retainRole||role):'shared';
  const proposalId=form.dataset.proposal||null;
  const key=[name,dealId,quoteId,revision??'',form.dataset.item||'new',pricingRole,form.dataset.commentContext||form.dataset.response||'',...(proposalId?[proposalId]:[])].join('|');
  return {key,name,dealId,quoteId,revision,itemId:form.dataset.item||null,proposalId};
}
function formValues(form) {return Object.fromEntries([...new FormData(form)].filter(([,value])=>typeof value==='string'));}
function captureForm(form) {
  const info=formIdentity(form),base=formBaselines.get(form);if(!info||!base)return;
  const values=formValues(form), previous=pendingForms.get(info.key);
  const hiddenEdits=previous && Object.keys(previous.values).some(key=>!Object.prototype.hasOwnProperty.call(values,key));
  if(JSON.stringify(values)===JSON.stringify(base)&&!hiddenEdits)pendingForms.delete(info.key);
  else {const entry={...info,values:hiddenEdits?{...previous.values,...values}:values,updatedAt:new Date().toISOString()};if(validPendingEntry(entry))pendingForms.set(info.key,entry);}
}
function captureFormDrafts() {
  if(typeof document==='undefined')return;
  const forms=document.querySelectorAll('.sales-main form[data-sales-form]');
  for(const form of forms)captureForm(form);
  if(forms.length)persistFormDrafts();
}
function pendingForContext() {
  const dealId=rendered.view==='demo'?firstDealId():rendered.id;
  return [...pendingForms].filter(([,entry])=>{
    if(!validPendingEntry(entry))return false;
    if(rendered.view==='workspace')return true;
    if(entry.dealId!==dealId)return false;
    if(['demo','present'].includes(rendered.view)){const proposalId=rendered.view==='present'&&rendered.qid?rendered.qid:S.findDeal(state,dealId)?.proposals?.at(-1)?.id;return entry.name==='comment'&&entry.proposalId===proposalId;}
    if(rendered.view==='quote')return !entry.quoteId||entry.quoteId===rendered.qid;
    return true;
  });
}
function pendingQuoteForms(deal,quote) {return [...pendingForms.values()].filter(entry=>validPendingEntry(entry)&&entry.dealId===deal.id&&((entry.quoteId===quote.id&&entry.revision===quote.working.revision)||(!entry.quoteId&&['scope','deal-details'].includes(entry.name))));}
function requireAppliedForms(deal,quote) {
  captureFormDrafts();
  if(quoteEdits.has(quote.id))throw new Error('Save or discard the configuration changes before review or issue.');
  if(pendingQuoteForms(deal,quote).length)throw new Error('Save or discard the unapplied quote and deal form edits before reviewing or issuing this revision.');
}
function unsavedNote() {
  const count=pendingForContext().length;
  return `<div id="pac-unsaved-note" class="pac-unsaved-note no-print" ${count?'':'hidden'}><div><strong>Unapplied form edits</strong><span data-unsaved-message>${count} form${count===1?'':'s'} retained in this browser. Submit each form to apply its changes.</span></div>${action('discard-form-edits','Discard edits',null,null,'text-button')}</div>`;
}
function recoveredFeedback() {
  if(['demo','present'].includes(rendered.view))return '';
  const entries=[...pendingForms.values()].filter(entry=>entry.name==='comment'&&!entry.proposalId&&validPendingEntry(entry)&&(rendered.view==='workspace'||entry.dealId===rendered.id));
  if(!entries.length)return '';
  return `<section class="sales-panel no-print" aria-label="Recovered feedback drafts"><h2>Recovered feedback drafts</h2><p>These unsent drafts refer to older quote revisions from before proposal versions were recorded. Save them to their original quote history without assigning them to a newer proposal.</p>${entries.map(entry=>{
    const deal=S.findDeal(state,entry.dealId),[quoteId,revision]=entry.values.quote_ref.split('|'),quote=S.findQuote(deal,quoteId);
    return `<form class="sales-form" data-sales-form="comment" data-comment-context="${esc(entry.key.split('|').at(-1))}" ${attrs(deal)}><p><strong>${esc(deal.number)} · ${esc(quote.label)} · Rev ${esc(revision)}</strong></p><input type="hidden" name="quote_ref" value="${esc(entry.values.quote_ref)}">${field('Your name','author','',{required:true})}${field('Retained feedback','body','',{type:'textarea',required:true})}<button class="secondary" type="submit">Save original feedback</button></form>`;
  }).join('')}</section>`;
}
function updatePendingNotice() {
  const note=document.getElementById('pac-unsaved-note'),count=pendingForContext().length;
  if(note){note.hidden=!count;const message=note.querySelector('[data-unsaved-message]');if(message)message.textContent=`${count} form${count===1?'':'s'} retained in this browser. Submit each form to apply its changes.`;}
  if(rendered.view==='quote'){
    const deal=dealById(rendered.id),quote=deal&&quoteById(deal,rendered.qid);
    if(quote&&quote.working.status==='draft'){
      const blocked=pendingQuoteForms(deal,quote).length>0||quoteEdits.has(quote.id);
      const incomplete=S.blockers(catalog,deal,quote).some(reason=>!(/^(Application review is required|Engineering approval is required|Manager approval is required)/.test(reason)));
      const save=document.querySelector('[data-sales-action="save-quote"]');if(save)save.disabled=!quoteEdits.has(quote.id);
      const review=document.querySelector('[data-sales-action="quote-tab"][data-slot="header"]');if(review)review.disabled=blocked;
      const saveState=document.querySelector('.mw-save-state');if(saveState){saveState.classList.toggle('is-unsaved',quoteEdits.has(quote.id));saveState.innerHTML=`<span class="mw-dot"></span>${quoteEdits.has(quote.id)?'Unsaved changes':blocked?'Unapplied form edits':'Saved'}`;}
      const readiness=document.querySelector('[data-issue-state]');if(readiness){const count=S.blockers(catalog,deal,quote).length;readiness.textContent=blocked?'Unsaved work':count?`${count} open ${count===1?'item':'items'}`:'Ready to issue';}
      for(const button of document.querySelectorAll('[data-sales-action="review"]'))button.disabled=blocked||incomplete||['changes_requested','needs_resubmission'].includes(S.reviewStatus(deal,quote,button.dataset.review).status);
      for(const button of document.querySelectorAll('[data-sales-action="submit-review"]'))button.disabled=blocked;
      const issue=document.querySelector('[data-sales-action="issue"]');if(issue)issue.disabled=blocked||S.blockers(catalog,deal,quote).length>0||role==='engineering';
    }
  }
}
function restoreFormDrafts() {
  const main=document.querySelector('.sales-main');if(!main)return;
  for(const form of main.querySelectorAll('form[data-sales-form]')){
    form.dataset.retainRole=role;
    const info=formIdentity(form);if(!info)continue;
    formBaselines.set(form,formValues(form));
    const saved=pendingForms.get(info.key);
    if(saved&&validPendingEntry(saved))for(const field of form.elements){if(field.name&&!field.disabled&&Object.prototype.hasOwnProperty.call(saved.values,field.name)&&field.type!=='submit')field.value=saved.values[field.name];}
  }
  const remember=event=>{const form=event.target.closest('form[data-sales-form]');if(form){captureForm(form);persistFormDrafts();updatePendingNotice();}};
  main.addEventListener('input',remember);main.addEventListener('change',remember);
  for(const list of main.querySelectorAll('[role="tablist"]'))list.addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    const controls=[...list.querySelectorAll('[role="tab"]')];const at=controls.indexOf(event.target);if(at<0)return;
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?controls.length-1:(at+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+controls.length)%controls.length;controls[next].click();
    const fresh=[...document.querySelectorAll(`[role="tablist"][aria-label="${list.getAttribute('aria-label')}"] [role="tab"]`)];fresh[next]?.focus();
  });
  updatePendingNotice();
}
function submitFormMutation(form,fn,message,hash,operation) {
  const info=formIdentity(form);
  captureForm(form);
  persistFormDrafts();
  return mutate(candidate=>{
    const deal=form.dataset.deal?S.findDeal(candidate,form.dataset.deal):null;
    const quote=form.dataset.quote?S.findQuote(deal,form.dataset.quote):null;
    return fn(deal,quote,candidate);
  },message,hash,result=>{
    if(!info)return;
    const submitted=formValues(form),previous=pendingForms.get(info.key);
    const unapplied=previous&&Object.keys(previous.values).some(key=>!Object.prototype.hasOwnProperty.call(submitted,key));
    if(unapplied)pendingForms.set(info.key,{...previous,values:{...previous.values,...submitted}});else pendingForms.delete(info.key);
    formBaselines.set(form,submitted);
    // A remote save renders a pending state, replacing the submitted DOM form.
    // Acknowledge that live copy too, so the next render does not recapture the
    // successfully saved values as unapplied changes. Later edits stay dirty.
    if(typeof document!=='undefined')for(const current of document.querySelectorAll('.sales-main form[data-sales-form]'))if(formIdentity(current)?.key===info.key)formBaselines.set(current,submitted);
    persistFormDrafts();
    if(info.name==='new-deal'){showNewDeal=false;activeDealId=result.id;try{localStorage.setItem(draftStore(CONTEXT_STORE),JSON.stringify({dealId:activeDealId,quoteIds:activeQuoteIds}));}catch{}}
  },operation);
}
function discardContextEdits() {
  const keys=pendingForContext().map(([key])=>key);for(const key of keys)pendingForms.delete(key);
  if(typeof document!=='undefined')for(const form of document.querySelectorAll('.sales-main form[data-sales-form]')){const info=formIdentity(form);if(info&&keys.includes(info.key))formBaselines.delete(form);}
  persistFormDrafts();redraw();notify('Unapplied edits discarded. Saved quote and deal data are unchanged.');
}

function persist() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); return true; }
  catch { storageWarning = 'Your changes are in this window only. Browser storage is unavailable; export the workspace before closing.'; return false; }
}
function preserveMigrationBackup() {
  if(!migrationBackupPending)return;
  const key=`${STORE}.before-proposals`;
  if(!localStorage.getItem(key))localStorage.setItem(key,migrationBackupPending);
  if(originalFormsRaw&&!localStorage.getItem(`${FORM_STORE}.before-proposals`))localStorage.setItem(`${FORM_STORE}.before-proposals`,originalFormsRaw);
  migrationBackupPending=null;
}
function commit(fn) {
  if(storageBlocked)throw new Error('The saved workspace could not be read and has not been overwritten. Export a recovery copy from the sales workspace.');
  preserveMigrationBackup();
  const stored=localStorage.getItem(STORE);
  if(lastSavedRaw && stored && stored!==lastSavedRaw){state=S.migrateWorkspace(JSON.parse(stored));lastSavedRaw=stored;}
  const saved=commitWorkspace(state,fn,{save:serialized=>localStorage.setItem(STORE,serialized)});
  state=saved.state;
  lastSavedRaw=JSON.stringify(state);
  storageWarning='';
  return saved.result;
}
function notify(text) { callbacks.toast?.(text); }
function redraw() { callbacks.render?.(); }
function navigate(hash) { if (location.hash === hash) redraw(); else location.hash = hash; }
function mutate(fn, message, hash, afterCommit, operation) {
  if(service)return mutateRemote(fn,message,hash,afterCommit,operation);
  try { const result = commit(fn); error = ''; afterCommit?.(result); if (hash) navigate(typeof hash === 'function' ? hash(result) : hash); else redraw(); if (message) notify(message); return result; }
  catch (err) { error = err.message || 'This change could not be saved.'; redraw(); document.querySelector('.sales-error')?.focus(); return null; }
}
function mutateQuote(deal,quote,fn,message,hash,afterCommit,operation) {
  return mutate(candidate=>{const nextDeal=S.findDeal(candidate,deal.id);return fn(nextDeal,quote?S.findQuote(nextDeal,quote.id):null,candidate);},message,hash,afterCommit,operation && {...operation,args:{dealId:deal.id,...(quote?{quoteId:quote.id}:{}),...operation.args}});
}
async function mutateRemote(fn,message,hash,afterCommit,operation) {
  if(saving)return null;
  try {
    if(!operation)throw new Error('This action is not available in the connected workspace yet. No changes were saved.');
    commitWorkspace(state,fn,{save:()=>{}});
    saving=true;error='';redraw();
    const response=await service.command(operation.command,operation.args||{});
    state=S.migrateWorkspace(response.state);role=service.user.role;saving=false;
    afterCommit?.(response.result);
    if(hash)navigate(typeof hash==='function'?hash(response.result):hash);else redraw();
    if(message)notify(message);
    return response.result;
  } catch(err) {
    saving=false;error=err.message;
    if(err.status===409){try{state=S.migrateWorkspace((await service.refresh()).state);}catch{}}
    if(err.status===401)callbacks.onSessionExpired?.();
    redraw();document.querySelector('.sales-error')?.focus();return null;
  }
}

function firstDeal() { return state.deals[0]; }
function dealById(id) { return S.findDeal(state, id || firstDeal()?.id); }
function quoteById(deal, id) { return S.findQuote(deal, id || deal.quotes[0]?.id); }
function persistQuoteEdits() {
  try { localStorage.setItem(draftStore(QUOTE_EDIT_STORE),JSON.stringify([...quoteEdits])); }
  catch { storageWarning='Unsaved configuration edits are kept in this window only. Save the quote before closing.'; }
}
function stageChange(deal,quote,command,message,{render=true}={}) {
  try {
    const entry=stageQuoteChange(deal,quote.id,quoteEdits.get(quote.id),command);
    quoteEdits.set(quote.id,entry);persistQuoteEdits();error='';
    if(render)redraw();else updatePendingNotice();
    if(message)notify(message);
    return entry;
  } catch(err){error=err.message;redraw();return null;}
}
function saveQuoteChanges(deal,quote) {
  captureFormDrafts();
  const entry=quoteEdits.get(quote.id);
  if(!entry)return;
  if(pendingQuoteForms(deal,quote).length){error='Save or discard the unapplied forms before saving this configuration.';redraw();return;}
  mutate(candidate=>applyQuoteEdit(candidate,entry),'Quote saved. Review this revision when ready.',null,()=>{quoteEdits.delete(quote.id);persistQuoteEdits();},{command:'saveQuoteEdit',args:{entry}});
}
function attrs(deal, quote) { return `data-deal="${esc(deal.id)}"${quote ? ` data-quote="${esc(quote.id)}"` : ''}`; }
function action(name, label, deal, quote, kind = 'secondary', extra = '') { const unique=[...extra.matchAll(/data-(?:row|item|line|review|tab|view|alternative|slot|section)="([^"]+)"/g)].map(match=>match[1]).join('-'); return `<button id="sales-action-${esc([name,deal?.id||'global',quote?.id||'',unique].join('-'))}" type="button" class="${kind}" data-sales-action="${name}" ${deal ? attrs(deal,quote) : ''} ${extra}>${label}</button>`; }
function status(value) { return `<span class="sales-status ${esc(value)}">${esc(titleCase(value))}</span>`; }
function localNote() { if(service)return `<div class="sales-demo-note"><strong>Shared workspace</strong><span>Saved to the local service · ${esc(service.user.name)} · ${esc(titleCase(role))}</span></div>`;return `<div class="sales-demo-note"><span class="sales-demo-dot" aria-hidden="true"></span><strong>Interactive demo</strong><span>Fictional customer · Catalog pricing · Saved in this browser</span></div>`; }
function pageHead(eyebrow, title, description, actions = '') { return `<div class="sales-pagehead"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${description ? `<p>${description}</p>` : ''}</div><div class="sales-actions">${actions}</div></div>`; }
function tabs(deal, selected) { return `<nav class="sales-tabs" aria-label="Deal navigation"><a href="#deal/${esc(deal.id)}" ${selected === 'deal' ? 'aria-current="page"' : ''}>Deal overview</a><a href="#quote/${esc(deal.id)}/${esc(currentQuoteId(deal.id) || '')}" ${selected === 'quote' ? 'aria-current="page"' : ''}>Quote builder</a><a href="#present/${esc(deal.id)}" ${selected === 'present' ? 'aria-current="page"' : ''}>Customer proposal</a><a href="#deal-explorer/${esc(deal.id)}" ${selected === 'deal-explorer' ? 'aria-current="page"' : ''}>3D evidence <span>${deal.evidence.length}</span></a></nav>`; }
function breadcrumbs(deal, last) { return `<div class="sales-breadcrumbs"><a href="#workspace">Sales workspace</a><span>/</span><a href="#deal/${esc(deal.id)}">${esc(deal.number)}</a>${last ? `<span>/</span><span>${esc(last)}</span>` : ''}</div>`; }
function field(label, name, value = '', {type = 'text', required = false, placeholder = '', full = false, min, step, disabled = false} = {}) {
  const id = `sales-${name}-${fieldSequence++}`;
  return `<div class="sales-field${full ? ' full' : ''}"><label for="${id}">${label}${required ? ' <span aria-hidden="true">*</span>' : ''}</label>${type === 'textarea' ? `<textarea id="${id}" name="${name}" rows="3" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''} placeholder="${esc(placeholder)}">${esc(value)}</textarea>` : `<input id="${id}" name="${name}" type="${type}" value="${esc(value)}" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''} placeholder="${esc(placeholder)}" ${min !== undefined ? `min="${min}"` : ''} ${step !== undefined ? `step="${step}"` : ''}>`}</div>`;
}
function select(label, name, choices, selected, extra = '') { const id = `sales-${name}-${fieldSequence++}`; return `<div class="sales-field"><label for="${id}">${label}</label><select id="${id}" name="${name}" ${extra}>${choices.map(([value,text]) => `<option value="${esc(value)}" ${String(selected) === String(value) ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></div>`; }
function price(value) { return showPrices ? money(value) : '<span class="sales-price-hidden">Hidden</span>'; }
function latest(quote) { return quote.revisions[quote.revisions.length - 1]; }
function readWorking(quote) { const chosen = selectedRevision[quote.id]; const current=quote.working.status==='issued' ? latest(quote) || quote.working : (quoteEdits.get(quote.id)?.working || quote.working); return chosen === undefined || chosen === 'working' ? current : quote.revisions.find(x => String(x.revision) === String(chosen)) || current; }
function canEdit(quote) { return quote.working.status === 'draft' && (!selectedRevision[quote.id] || selectedRevision[quote.id] === 'working' || String(selectedRevision[quote.id]) === String(quote.working.revision)); }
function modelPhoto(machineId, className = '') { const picture = C.machinePhotos(catalog,machineId)[0]; return picture ? `<img class="${className}" src="${esc(C.mediaUrl(catalog,picture))}" alt="${esc(C.getMachine(catalog,machineId)?.title?.text || machineId)} — PAC source photograph" loading="lazy">` : '<div class="sales-empty">Exact-model photograph pending PAC confirmation.</div>'; }
function snapshotPhoto(alternative) { return alternative.photo?.file ? `<img src="${esc(`${catalog.baseUrl || '/pac-machinery-demo/source'}/${alternative.photo.file}`)}" alt="${esc(alternative.machine_title)} — source photograph" loading="lazy">` : '<div class="sales-empty">Exact-model photograph pending.</div>'; }

export function render(view, id, qid, revision) {
  if (!state) return '<main id="main" class="sales-main"><h1>Loading sales workspace…</h1></main>';
  captureFormDrafts();
  if(rendered.view && (rendered.view!==view || rendered.id!==id || rendered.qid!==qid || rendered.revision!==revision)) {
    composeDealId=null;shareDealId=null;createdShare=null;error='';
  }
  rendered = {view,id,qid,revision};
  fieldSequence = 0;
  let content;
  try {
    if (view === 'workspace') content = workspace();
    else {
      const deal = view === 'demo' ? firstDeal() : dealById(id);
      if(deal){activeDealId=deal.id;const selected=quoteById(deal,qid||activeQuoteIds[deal.id]);if(selected&&(view==='quote'||qid))activeQuoteIds[deal.id]=selected.id;if(view==='quote'&&selected)rendered.qid=selected.id;try{localStorage.setItem(draftStore(CONTEXT_STORE),JSON.stringify({dealId:activeDealId,quoteIds:activeQuoteIds}));}catch{}}
      if (!deal) content = `<div class="sales-empty"><h1>Deal not found</h1><p>This deal is not saved in this browser.</p><a class="primary" href="#workspace">Open sales workspace</a></div>`;
      else if (view === 'demo' || view === 'present') content = presentation(deal,view==='present'?qid:undefined);
      else if (view === 'deal') content = dealView(deal);
      else if (view === 'quote') {
        const quote=quoteById(deal,rendered.qid);
        if(revision!==undefined){
          if(revision!=='working'&&!quote?.revisions.some(r=>String(r.revision)===String(revision))&&String(quote?.working.revision)!==String(revision))throw new Error('This quote revision was not found.');
          selectedRevision[quote.id]=String(quote.working.revision)===String(revision)&&quote.working.status==='draft'?'working':revision;
        }
        content=quoteView(deal,quote);
      }
      else content = explorerView(deal,qid);
    }
  } catch (err) { content = `<div class="sales-empty"><h1>This workspace view could not be opened.</h1><p>${esc(err.message)}</p><a class="primary" href="#workspace">Return to workspace</a></div>`; }
  return `${saving?'<div class="sw-saving" role="status">Saving changes…</div>':''}<main id="main" ${saving?'inert data-saving="true"':''} class="sales-main ${['workspace','deal','quote','deal-explorer'].includes(view) ? 'mercury-workspace' : ''} ${['demo','present'].includes(view) ? 'sales-presentation' : ''}">${storageWarning ? `<div class="sales-note warning">${esc(storageWarning)}</div>` : ''}${error ? `<div class="sales-error" role="alert" tabindex="-1"><strong>Change not saved</strong><p>${esc(error)}</p></div>` : ''}${unsavedNote()}${recoveredFeedback()}${composeDealId?composerView(dealById(composeDealId)):shareDealId?shareView(dealById(shareDealId)):content}${repricePreview?repriceDialog():''}${pendingSelection ? selectionDialog() : ''}</main>`;
}


function presentation(deal,proposalId) {
  const proposal=S.publicProposal(deal,proposalId), alternatives=proposal.alternatives;
  let choice=proposalAlternatives[deal.id] || activeQuoteIds[deal.id] || alternatives[0]?.quote_id || 'compare';
  if(choice!=='compare'&&!alternatives.some(a=>a.quote_id===choice))choice=alternatives[0]?.quote_id||'compare';
  const active=alternatives.find(a=>a.quote_id===choice), shown=active?[active]:alternatives;
  const comments=proposal.comments.filter(c=>!active||c.quote_id===active.quote_id);
  const feedback={...proposal,alternatives:shown,comments,responses:(proposal.responses||[]).filter(r=>!active||!r.quote_id||r.quote_id===active.quote_id)};
  const evidence=shown.flatMap(a=>a.evidence).filter((e,i,all)=>all.findIndex(other=>other.id===e.id)===i);
  const printHTML=printPresentation(deal,proposal).replace(/<form\b[\s\S]*?<\/form>/g,'').replace(/<button\b[\s\S]*?<\/button>/g,'').replace(/<iframe\b[\s\S]*?<\/iframe>/g,'').replace(/\sid="[^"]*"/g,'');
  return `<header class="pac-proposal-header no-print"><a href="#present/${esc(deal.id)}${proposal.proposal_id?`/${esc(proposal.proposal_id)}`:''}" aria-label="PAC Machinery proposal"><img src="/pac-machinery-demo/assets/pac-machinery-logo.png" alt="PAC Machinery"></a><div class="pac-proposal-identity"><strong>Sales presentation</strong><span>${esc(deal.number)}${proposal.proposal_version?` · Published V${proposal.proposal_version}`:' · Not published'}</span></div><div class="sales-actions">${service&&role!=='engineering'?action('share-proposal','Share with customer',deal,null,'primary'):''}${service&&role!=='engineering'&&proposal.proposal_id?action('mark-presented','Mark presented',deal,null,'secondary',`data-proposal="${esc(proposal.proposal_id)}"`):''}${action('print-proposal','Print / save PDF',deal,null,'secondary')}<a class="secondary" href="#deal/${esc(deal.id)}${active?`/${esc(active.quote_id)}`:''}">${icon('arrow-left')} Back to deal</a></div></header>
  <section class="pac-proposal-intro"><h1>${esc(proposal.title)}</h1><p class="pac-proposal-customer">Prepared for ${esc(proposal.customer)}</p><p>${esc(proposal.scope?.application || 'Explore the equipment and configuration for your application.')}</p><div class="pac-proposal-meta"><span>${esc(proposal.number)}</span><span>${alternatives.length} configuration ${alternatives.length===1?'alternative':'alternatives'}</span><span>Prepared by ${esc(proposal.owner)}</span></div></section>
  ${proposalVersionBar(deal,proposal)}
  <nav class="pac-proposal-tabs" aria-label="Proposal alternative" role="tablist">${alternatives.map(a=>action('proposal-alternative',esc(a.label),deal,{id:a.quote_id},choice===a.quote_id?'active':'',`data-alternative="${esc(a.quote_id)}" role="tab" aria-selected="${choice===a.quote_id}" tabindex="${choice===a.quote_id?'0':'-1'}"`)).join('')}${alternatives.length>1?action('proposal-alternative','Compare alternatives',deal,null,choice==='compare'?'active':'',`data-alternative="compare" role="tab" aria-selected="${choice==='compare'}" tabindex="${choice==='compare'?'0':'-1'}"`):''}</nav>
  ${!alternatives.length?`<section class="sales-empty"><h2>No published configuration yet</h2><p>Complete the quote reviews, issue a revision, and publish the proposal from the deal.</p><a class="primary" href="#deal/${esc(deal.id)}">Open deal</a></section>`:active?`<section class="pac-proposal-summary"><figure class="pac-proposal-machine">${snapshotPhoto(active)}<figcaption>Rollbag equipment · Exact-model source photograph<br>Selected options are listed in this proposal.</figcaption></figure><div class="pac-proposal-configuration"><div class="sales-actions">${status('issued')}<span class="fine-print">${esc(active.number)} · Rev ${active.revision}</span></div><h2>${esc(active.machine_title)}</h2><p>${esc(active.label)}</p><div class="pac-proposal-total"><strong>${money(active.totals.total)}</strong><span>Quoted investment · USD</span></div><dl class="sales-scope-facts"><div><dt>Bag dimensions</dt><dd>${esc(active.scope?.bag_dimensions || 'To confirm')}</dd></div><div><dt>Target throughput</dt><dd>${esc(active.scope?.throughput || 'To confirm')}${active.scope?.throughput&&!/bags|min/i.test(active.scope.throughput)?' bags/min':''}</dd></div><div><dt>Estimated lead time</dt><dd>${shortLead(active.terms)}</dd></div></dl><div class="sales-actions">${action('choose-alternative',proposal.selected_quote_id===active.quote_id?'Preferred alternative':'Mark as preferred',deal,{id:active.quote_id},proposal.selected_quote_id===active.quote_id?'secondary':'primary',`data-proposal="${esc(proposal.proposal_id)}" aria-pressed="${proposal.selected_quote_id===active.quote_id}"`)}<a class="text-button" href="#proposal-discussion" data-sales-action="scroll-section" data-section="proposal-discussion">Ask a question ↓</a></div><p class="fine-print">Preference records your discussion. It is not an order or acceptance.</p></div></section><section class="pac-proposal-details">${quoteDocument(active,true)}${sellerOptionMedia(active)}</section>`:sellerComparison(deal,proposal)}
  <section class="pac-proposal-evidence"><div class="pac-section-heading"><div><div class="eyebrow">APPLICATION REFERENCES</div><h2>See the equipment in context</h2></div><span class="fine-print">${evidence.length} attached ${evidence.length===1?'reference':'references'}</span></div>${evidence.length?`<div class="sales-evidence-grid">${evidence.map(e=>evidenceCard(deal,e,true)).join('')}</div>`:'<p class="fine-print">The machine photo and application video support this discussion. The quoted configuration defines the included equipment.</p>'}${sellerResources(shown)}${evidence.some(e=>e.type!=='photo')?'<p class="fine-print">3D references use an illustrative assembly until PAC confirms a model. They are not PAC CAD or proof of application suitability.</p>':''}</section>
  <section class="pac-proposal-feedback">${proposalComments(deal,feedback)}</section><section class="pac-proposal-next"><div><div class="eyebrow">NEXT STEP</div><h2>Keep the conversation moving</h2><p>${esc(proposal.customer_next_decision||'Review the application and select a configuration.')}</p></div><dl><div><dt>Your PAC contact</dt><dd>${esc(proposal.owner)}</dd></div><div><dt>Decision target</dt><dd>${proposal.customer_decision_date?date(proposal.customer_decision_date):'To confirm'}</dd></div></dl></section><p class="pac-proposal-demo fine-print">Interactive demo · Fictional customer · ${service?"Seller preview · Feedback is saved to the shared workspace. Use Share with customer for recipient access.":"Feedback is saved in this browser. No email is sent."}</p>
  <div class="pac-print-proposal">${printHTML}</div>`;
}

function sellerComparison(deal,proposal) {
  const model=proposalComparison(proposal),alternatives=proposal.alternatives;
  return `<section class="pac-decision-comparison"><div class="pac-decision-heading">${model.commonPhoto?`<figure>${snapshotPhoto(model.commonPhoto)}<figcaption>Shared base equipment · Options are defined by the quote.</figcaption></figure>`:''}<div><h2>${esc(model.title)}</h2><p>${esc(model.summary)}</p><p class="fine-print">Fit and operating performance remain subject to PAC application review.</p></div></div><div class="pac-decision-cards">${alternatives.map((a,index)=>{const summary=model.alternatives[index];return `<article><span class="fine-print">${esc(a.number)} · Rev ${a.revision}</span><h3>${esc(a.label)}</h3>${!model.commonPhoto?`<figure>${snapshotPhoto(a)}</figure>`:''}<p>${esc(summary.summary)}</p><strong class="pac-decision-total">${money(a.totals.total)}</strong><p class="pac-decision-delta">${index?`${summary.delta>=0?'+':'−'}${money(Math.abs(summary.delta))} compared with ${esc(summary.compared_with)}`:'Reference configuration'}</p>${summary.added.length?`<ul>${summary.added.map(line=>`<li><strong>${esc(line.name)}</strong>${conciseLineDescription(line)?`<p>${esc(conciseLineDescription(line))}</p>`:''}</li>`).join('')}</ul>`:''}<p class="fine-print">Estimated lead time: ${shortLead(a.terms)} · Confirmed at order</p>${action('proposal-alternative','View complete configuration',deal,{id:a.quote_id},'secondary',`data-alternative="${esc(a.quote_id)}" data-slot="compare"`)}</article>`;}).join('')}</div>${model.differences.length?`<h3>What changes between the alternatives</h3><div class="sales-table-wrap"><table class="sales-table"><thead><tr><th>Quoted item</th>${alternatives.map(a=>`<th>${esc(a.label)}</th>`).join('')}</tr></thead><tbody>${model.differences.map(row=>`<tr><th scope="row">${esc(row.label)}</th>${row.values.map(line=>`<td>${line?`${line.quantity||1} × ${money(line.price_usd??line.price)}`:'Not included'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}${model.shared.length?`<details class="pac-shared-scope"><summary>Shared equipment and services · ${model.shared.length} items</summary><ul>${model.shared.map(row=>`<li>${esc(row.label)}</li>`).join('')}</ul></details>`:''}<div class="pac-decision-confirm"><h3>Confirm the application together</h3><p>Validate product samples, bag material and dimensions, the loading workflow, and the lead-time conditions before choosing an approach.</p></div></section>`;
}

function sellerOptionMedia(alternative) {
  const media=(alternative.media||[]).filter(item=>/^media\/[a-zA-Z0-9_./-]+$/.test(item.file||'')&&alternative.lines.some(line=>line.option_id===item.option_id));
  if(!media.length)return '';
  return `<section class="pac-seller-media"><h2>A closer look at the selected options</h2><p class="fine-print">Individual catalog references; the quoted line items define the assembled configuration.</p><div>${media.map(item=>`<figure><img src="/pac-machinery-demo/source/${esc(item.file)}" alt="${esc(item.title)} — catalog option reference" loading="lazy"><figcaption><strong>${esc(item.title)}</strong><span>${item.scope==='model_option'?'Model option reference':'Generic option reference · Not the assembled configuration'}</span></figcaption></figure>`).join('')}</div></section>`;
}
function sellerResources(alternatives) {
  const items=alternatives.flatMap(a=>a.resources||[]),resources=items.filter((item,index)=>/^https:\/\/(?:www\.)?(?:pacmachinery\.com|youtube\.com)\//.test(item.url||'')&&items.findIndex(other=>other.url===item.url)===index);
  if(!resources.length)return alternatives.some(a=>a.machine_id==='r3200')?equipmentVideo():'';
  return `<section class="pac-seller-resources"><h3>Equipment references</h3><p class="fine-print">These links were retained with the issued quote. Current website specifications may differ; the issued scope governs this proposal.</p>${resources.map(item=>`<div><span><strong>${esc(item.title)}</strong><small>${esc(item.scope)}</small></span><a class="secondary" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${item.type==='video'?'Watch video':'Open product resource'} ${icon('arrow')}<span class="sr-only">${esc(item.title)}</span></a></div>`).join('')}</section>`;
}

function proposalVersionBar(deal,proposal) {
  if(!proposal.proposal_id)return '';
  const current=deal.proposals.at(-1),historical=current.id!==proposal.proposal_id;
  return `<section class="pac-proposal-version sales-proposal-version no-print" aria-label="Proposal version">${select('Proposal version','proposal_version',[...deal.proposals].reverse().map(p=>[p.id,`V${p.version}${p.id===current.id?' · Latest published':' · Historical'}`]),proposal.proposal_id,`data-sales-change="proposal-version" data-deal="${esc(deal.id)}"`)}<div><strong>Proposal V${proposal.proposal_version}</strong><p class="fine-print">Published ${date(proposal.published_at)} · ${historical?'Historical version. Its quoted scope and prices are preserved.':'Latest published version. New draft changes are not included.'}</p></div><a class="text-button" href="#present/${esc(deal.id)}/${esc(proposal.proposal_id)}">Open this version’s link ↗</a></section>`;
}

function printPresentation(deal,proposal) {
  const alternatives = proposal.alternatives || [];
  const termBlocks=alternatives.map(a=>commercialTerms(a.terms||{},a.lines));
  const sharedTerms=alternatives.length>1&&termBlocks[0]&&termBlocks.every(block=>block===termBlocks[0]);
  return `<header class="pac-print-brand"><img src="/pac-machinery-demo/assets/pac-machinery-logo.png" alt="PAC Machinery"><div><strong>Equipment proposal</strong><span>${esc(proposal.number)} · Proposal V${proposal.proposal_version}</span><span>Prepared by ${esc(proposal.owner)} · ${date(proposal.published_at)}</span></div></header>
  <section class="sales-proposal-hero"><div><h1>${esc(proposal.title)}</h1><p class="pac-proposal-customer">Prepared for ${esc(proposal.customer)}</p><p>Review the application, configuration and commercial terms together.</p><div class="sales-statline"><span>${esc(proposal.number)} · Proposal V${proposal.proposal_version}</span><span>${alternatives.length} configuration alternatives</span><span>USD</span></div></div><div class="sales-media">${alternatives[0] ? snapshotPhoto(alternatives[0]) : modelPhoto('r3200')}<span>Exact-model source photograph · Selected options listed below</span></div></section>
  ${localNote()}
  <section class="sales-panel sales-understanding"><div class="eyebrow">WHAT WE UNDERSTOOD</div><h2>Application requirements</h2><p>${esc(proposal.scope?.application || 'Complete the application scope before a quote can be issued.')}</p><dl class="sales-scope-facts"><div><dt>Requested bag size</dt><dd>${esc(proposal.scope?.bag_dimensions || 'To confirm')}</dd></div><div><dt>Target throughput</dt><dd>${esc(proposal.scope?.throughput || 'To confirm')}${proposal.scope?.throughput && !/bags|min/i.test(proposal.scope.throughput) ? ' bags/min' : ''}</dd></div><div><dt>Application review</dt><dd>${alternatives.length ? 'Demonstration review recorded' : 'Review pending'}</dd></div></dl><p class="fine-print">Targets describe this illustrative application. PAC must confirm performance with the actual product, bags and operator workflow.</p></section>
  <section class="sales-proposal-options"><div class="sales-sectionhead"><div><div class="eyebrow">CHOOSE THE RIGHT APPROACH</div><h2>Compare the configurations.</h2></div><p>Compare the scope and investment together.</p></div>
  ${alternatives.length ? `<div class="sales-alternatives">${alternatives.map((alternative,index) => proposalAlternative(deal,proposal,alternative,index)).join('')}</div>` : '<div class="sales-empty"><h3>No issued quotes yet</h3><p>Configure an alternative, complete its reviews, and issue a revision to present it here.</p><a class="primary" href="#deal/' + esc(deal.id) + '">Prepare a quote</a></div>'}</section>
  ${alternatives.length > 1 ? comparison(alternatives) : ''}
  <section class="sales-panel sales-proposal-evidence"><div class="sales-sectionhead"><div><div class="eyebrow">EVIDENCE BEHIND THE PROPOSAL</div><h2>Application references</h2></div></div><p>Machine and option references help everyone discuss the same configuration.</p><div class="sales-evidence-grid">${alternatives.slice(0,2).map(a => `<figure><div class="sales-media">${snapshotPhoto(a)}</div><figcaption><strong>${esc(a.machine_title)}</strong><span>${esc(a.label)} · Rev ${a.revision}</span><small>Machine photograph; refer to the quote for included options.</small></figcaption></figure>`).join('')}${(proposal.evidence || []).map(e => evidenceCard(deal,e,true)).join('')}</div><p class="fine-print">3D views, when attached, use a reference assembly to illustrate the workflow. A verified PAC model and configuration-specific video can be added after PAC confirms the media.</p></section>
  ${alternatives.some(a=>a.machine_id==='r3200') ? equipmentVideo() : ''}
  ${proposalComments(deal,proposal)}
  <section class="sales-nextstep"><div><div class="eyebrow">AGREE THE NEXT STEP</div><h2>Which approach fits your operation?</h2><p>${esc(proposal.customer_next_decision || 'Review the application and choose a configuration to develop with PAC.')}</p></div><div><strong>${esc(proposal.owner)}</strong><span>Deal owner</span>${proposal.customer_decision_date ? `<span>Decision target · ${date(proposal.customer_decision_date)}</span>` : ''}</div></section>
  <section class="sales-proposal-detail${sharedTerms?' pac-print-shared-quotes':''}"><div class="sales-sectionhead"><div><div class="eyebrow">QUOTE DETAIL</div><h2>The scope behind each alternative.</h2></div><span>Issued revisions · USD</span></div>${alternatives.map(a => quoteDocument(a,false,!sharedTerms)).join('')}</section>
  ${sharedTerms?`<section class="pac-print-common-terms"><header><div class="eyebrow">PROPOSAL V${proposal.proposal_version} · COMMERCIAL TERMS</div><h2>Terms for both configurations</h2><p>The following terms apply to ${alternatives.map(a=>`${esc(a.number)} · Rev ${a.revision}`).join(' and ')}.</p></header><div class="sales-terms">${termBlocks[0]}</div><p class="fine-print">Demonstration quote only. The review actions shown in this workspace are illustrative, not PAC authorization to purchase.</p></section>`:''}
  <div class="sales-demo-footer no-print"><strong>Next: see how the team created this proposal.</strong><a class="primary" href="#deal/${esc(deal.id)}">Show the sales workflow <span>→</span></a></div>`;
}


function equipmentVideo() {
  return `<section class="sales-panel sales-equipment-video no-print"><div class="sales-sectionhead"><div><div class="eyebrow">SEE THE MACHINE AT WORK</div><h2>PAC R3200 application example.</h2></div><a class="text-button" href="https://www.youtube.com/watch?v=nYCpXU1llI4" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></div>${videoLoaded ? '<div class="sales-video-frame"><iframe title="PAC Machinery Rollbag R3200 automatic bagger application example" src="https://www.youtube-nocookie.com/embed/nYCpXU1llI4" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>' : `<div class="sales-video-preview"><div class="sales-media">${modelPhoto('r3200')}</div><div><h3>Rollbag R3200 Automatic Bagger</h3><p>Official PAC Machinery equipment video.</p>${action('load-video','Load equipment video',null,null,'secondary')}<p class="fine-print">Loads the video from YouTube when selected.</p></div></div>`}<p class="fine-print">PAC R3200 application example. Shown options may differ; confirm the quoted configuration with PAC.</p></section>`;
}

function proposalAlternative(deal, proposal, a, index) {
  const selected = proposal.selected_quote_id === a.quote_id;
  return `<article class="sales-alternative${selected ? ' is-selected' : ''}"><div class="sales-alternative-heading"><span class="eyebrow">ALTERNATIVE ${String(index+1).padStart(2,'0')}</span>${selected ? status('preferred') : status('issued')}</div><h3>${esc(a.label)}</h3><p>${esc(a.machine_title)}</p><div class="sales-investment"><strong>${money(a.totals.total)}</strong><span>Quoted investment · USD</span></div><p class="sales-fit">${a.lines.some(l=>l.option_id==='easy_load_bag_opener') ? 'Additional bag-opening support for the operator, with the required companion option included.' : 'A catalog-based configuration to review against your application and operator workflow.'}</p><ul class="sales-included-list">${a.lines.map(line => `<li><span>${esc(line.name)}</span><span>${money(line.total ?? line.price_usd * line.quantity)}</span></li>`).join('')}${a.engineering.map(line => `<li><span>${esc(line.description)} <small>Engineering requirement</small></span><span>${money(line.price)}</span></li>`).join('')}${a.special.map(line => `<li><span>${esc(line.description)} <small>Special order</small></span><span>${money(line.price)}</span></li>`).join('')}${a.totals.discount > 0 ? `<li class="sales-discount-row"><span>Discount</span><span>−${money(a.totals.discount)}</span></li>` : ''}</ul><dl class="sales-quote-facts"><div><dt>Quote</dt><dd>${esc(a.number)} · Rev ${a.revision}</dd></div><div><dt>Lead time</dt><dd>${shortLead(a.terms)}${a.special.length ? ' + special-order conditions' : ''}${quoteLeadConditions(a).map(note=>`<small class="sales-source-condition">${esc(note)}</small>`).join('')}</dd></div></dl>${action('choose-alternative',selected ? 'Preferred alternative' : 'Mark as preferred',deal,{id:a.quote_id},selected ? 'secondary' : 'primary',`aria-pressed="${selected}"`)}<p class="fine-print">Preference records the discussion; it is not an order or acceptance.</p></article>`;
}
function sourceConditions(line) {
  return [...new Set([...(line.conditions||[]),...(line.notes||[]),...(line.lead_time_notes||[]),...(line.flags||[]).filter(f=>f.kind==='lead_time').map(f=>f.evidence)].filter(Boolean))];
}
function conditionHtml(line, internal=false) {
  return sourceConditions(line).map(value=>`<small class="sales-source-condition">${esc(internal&&!showPrices?value.replace(/\$[\d,.]+/g,'[price hidden]'):value)}</small>`).join('');
}
function quoteLeadConditions(alternative) {
  return [...new Set(alternative.lead_time_notes || alternative.lines.flatMap(line=>line.lead_time_notes||[]))];
}
function shortLead(terms) { const t = terms?.lead_time; return t?.min_weeks ? `${esc(t.min_weeks)}–${esc(t.max_weeks || t.min_weeks)} business weeks` : 'PAC to confirm'; }
function comparison(alternatives) {
  const a = alternatives;
  const rows = [['Quoted investment',...a.map(x=>money(x.totals.total))],['Base machine',...a.map(x=>esc(x.machine_title))],['Added catalog options',...a.map(x=>esc(x.lines.filter(l=>!['catalog_base','catalog_base_variant','service'].includes(l.line_class)).map(l=>l.name).join(', ') || 'None'))],['Services',...a.map(x=>esc(x.lines.filter(l=>l.line_class==='service').map(l=>l.name).join(', ') || 'Not included'))],['Engineering',...a.map(x=>esc(x.engineering.map(l=>l.description).join(', ')||'None'))],['Special orders',...a.map(x=>esc(x.special.map(l=>`${l.description} — ${l.lead_time}`).join('; ')||'None'))],['Discount',...a.map(x=>money(x.totals.discount))],['Lead time',...a.map(x=>shortLead(x.terms)+quoteLeadConditions(x).map(note=>`<small>${esc(note)}</small>`).join(''))],['Revision',...a.map(x=>`Rev ${x.revision}`)]];
  return `<section class="sales-panel"><h2>At a glance</h2><div class="sales-table-wrap"><table class="sales-table sales-comparison"><caption class="sr-only">Comparison of issued quote alternatives</caption><thead><tr><th scope="col">Scope</th>${a.map(x=>`<th scope="col">${esc(x.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr><th scope="row">${row[0]}</th>${row.slice(1).map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
function textValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join('\n\n');
  return textValue(value.text || '');
}
function commercialTerms(terms, lines, hidePrices=false) {
  const entries=[['Lead time',textValue(terms.lead_time)],['Quote validity',textValue(terms.quote_valid_days)],['Payment terms',textValue(terms.payment_terms)],['Delivery',textValue(terms.delivery_terms)],['Shipment',textValue(terms.shipment)],['Standard warranty',terms.warranty?.standard?.line_text || textValue(terms.warranty?.standard)],['Warranty conditions',textValue(terms.warranty?.terms)],['Application & feasibility',textValue(terms.project_specifications)],['Factory acceptance test',textValue(terms.fat)],['Financing',textValue(terms.financing)]];
  if(lines.some(l=>l.line_class==='service'))entries.push(['Start-up & training conditions',textValue(terms.startup)]);
  return entries.filter(([,value])=>value).map(([label,value])=>`<div><strong>${label}</strong><p>${esc(hidePrices?value.replace(/\$\s*[\d,.]+/g,'[price hidden]'):value)}</p></div>`).join('');
}
function quoteDocument(a, concise=false, includeTerms=true) {
  const terms = a.terms || {};
  return `<article class="sales-panel sales-quote-document"><div class="sales-sectionhead"><div><h3>${concise?'Configuration & pricing':esc(a.label)}</h3><p>${esc(a.number)} · Rev ${a.revision} · Issued ${date(a.issued_at)}</p></div><strong>${money(a.totals.total)}</strong></div><div class="sales-quote-scope"><strong>Application for this revision</strong><p>${esc(a.scope?.application)}</p><small>${esc(a.scope?.bag_dimensions)} · ${esc(a.scope?.throughput)}</small></div><div class="sales-table-wrap"><table class="sales-table"><caption class="sr-only">${esc(a.label)} priced line items</caption><thead><tr><th scope="col">Description</th><th scope="col">Qty</th><th scope="col">Unit price</th><th scope="col">Amount</th></tr></thead><tbody>${a.lines.map(l=>`<tr><td><strong>${esc(l.name)}</strong><small>${esc(C.unitLabel(l.price_unit))}</small>${concise&&l.description?`<p>${esc(conciseLineDescription(l))}</p>${conciseLineDescription(l)!==l.description?`<details><summary>Full item specification</summary><p>${esc(l.description)}</p></details>`:''}`:''}${conditionHtml(l)}</td><td>${l.quantity}</td><td class="numeric">${money(l.price_usd)}</td><td class="numeric">${money(l.total ?? l.quantity*l.price_usd)}</td></tr>`).join('')}${a.engineering.map(l=>`<tr><td><strong>${esc(l.description)}</strong><small>Engineering requirement</small></td><td>1</td><td class="numeric">${money(l.price)}</td><td class="numeric">${money(l.price)}</td></tr>`).join('')}${a.special.map(l=>`<tr><td><strong>${esc(l.description)}</strong><small>Special order · ${esc(l.lead_time)}</small></td><td>1</td><td class="numeric">${money(l.price)}</td><td class="numeric">${money(l.price)}</td></tr>`).join('')}</tbody><tfoot>${a.totals.discount ? `<tr><th colspan="3">Discount</th><td class="numeric">−${money(a.totals.discount)}</td></tr>` : ''}<tr><th colspan="3">Quote total · USD</th><td class="numeric"><strong>${money(a.totals.total)}</strong></td></tr></tfoot></table></div>${a.included?.length?`<details class="sales-included-details"><summary>Included in the base configuration</summary><ul>${a.included.map(l=>`<li>${esc(l.name)}</li>`).join('')}</ul></details>`:''}${includeTerms?`${concise?'<details class="pac-commercial-terms"><summary>Commercial terms & conditions</summary>':''}<div class="sales-terms"><h4>Commercial terms</h4>${commercialTerms(terms,a.lines)}</div>${concise?'</details>':''}`:'<p class="pac-print-terms-reference">Full commercial terms for this quote are included in Terms for both configurations.</p>'}<p class="fine-print">Demonstration quote only. The review actions shown in this workspace are illustrative, not PAC authorization to purchase.</p></article>`;
}
function proposalComments(deal, proposal) {
  if(!proposal.proposal_id)return '<section class="sales-panel"><h2>Customer feedback</h2><p>Publish a proposal before requesting customer feedback.</p></section>';
  const responses=proposal.responses||[],count=responses.length+proposal.comments.length;
  return `<section class="sales-panel sales-comment-section" id="proposal-discussion"><div class="sales-sectionhead"><div><div class="eyebrow">CUSTOMER DISCUSSION</div><h2>Questions and feedback</h2></div><span>${count} ${count===1?'response':'responses'}</span></div><div class="sales-comment-list">${count?proposal.comments.map(comment=>commentCard(deal,comment)).join('')+responses.map(response=>responseCard(deal,response,false)).join(''):'<p class="sales-empty">Ask a question or request a change to this proposal.</p>'}</div><form class="sales-form no-print" data-sales-form="comment" data-proposal="${esc(proposal.proposal_id||'')}" data-comment-context="${proposal.alternatives.length===1?esc(proposal.alternatives[0].quote_id):'compare'}" ${attrs(deal)}><input type="hidden" name="proposal_id" value="${esc(proposal.proposal_id||'')}"><div class="sales-form-grid">${service?`<input type="hidden" name="author" value="${esc(service.user.name)}"><div class="sales-field"><span>Recorded by</span><p>${esc(service.user.name)} · Seller-entered feedback</p></div>`:field('Your name','author','Customer reviewer',{required:true})}${select('Feedback type','kind',[['question','Question'],['changes_requested','Request changes']],'question')}${select('Quote revision','quote_ref',proposal.alternatives.map(a=>[`${a.quote_id}|${a.revision}`,`${a.label} · Rev ${a.revision}`]),proposal.alternatives[0]?`${proposal.alternatives[0].quote_id}|${proposal.alternatives[0].revision}`:'')}${field('Question or feedback','body','',{type:'textarea',required:true,full:true,placeholder:'Describe the question or change you want PAC to review.'})}</div><div class="sales-actions"><button class="primary" type="submit" ${proposal.proposal_id&&proposal.alternatives.length?'':'disabled'}>${service?'Record feedback':'Save feedback'}</button><span class="fine-print">${service?'Saved to the shared workspace as seller-entered feedback.':'Saved in this browser.'} No email is sent.</span></div></form></section>`;
}
function responseCard(deal,response,internal=false) {
  const links=response.revision_links||[],target=deal.proposals?.find(p=>p.id===response.addressed_in_proposal_id);
  const label={open:'Open',in_progress:'Revision in progress',addressed:'Revised proposal available',resolved:'Resolved',declined:'Declined'}[response.status]||'Open';
  const quote=deal.quotes.find(q=>q.id===response.quote_id);
  const sourceLine=quote?.revisions.find(revision=>revision.revision===response.revision)?.draft.lines.find(line=>line.quote_line_id===response.line_id);
  const section={application:'Application',comparison:'Equipment choice',equipment:'Equipment',options:'Configuration item',pricing:'Price',terms:'Terms & lead time'}[response.section];
  const context=sourceLine?`Configuration item · ${sourceLine.name}`:section;
  const actions=internal&&response.kind==='changes_requested'&&response.status==='open'?(quote?[quote]:(deal.proposals?.find(p=>p.id===response.proposal_id)?.manifest||[]).map(ref=>S.findQuote(deal,ref.quote_id)).filter(Boolean)).map(q=>action('revise-response',`Revise ${q.label}`,deal,null,'secondary',`data-response="${esc(response.id)}" data-target-quote="${esc(q.id)}"`)).join(''):'';
  return `<article class="sales-comment"><div><strong>${esc(response.kind==='changes_requested'?'Change request':'Question')}</strong><span>${esc(label)}</span></div><p>${esc(response.body)}</p>${context?`<p class="mw-context">About: ${esc(context)}</p>`:''}<small>${esc(response.author)} · ${date(response.at)} · Proposal V${response.proposal_version}${quote?` · ${esc(quote.label)} · Rev ${response.revision}`:''}</small><div class="sales-actions">${internal?`<a class="text-button" href="#present/${esc(deal.id)}/${esc(response.proposal_id)}">View original proposal</a>${actions}${links.map(ref=>`<a class="text-button" href="#quote/${esc(deal.id)}/${esc(ref.quote_id)}/${ref.revision}">Open revision ${ref.revision}</a>`).join('')}`:''}${target?`<a class="text-button" href="#present/${esc(deal.id)}/${esc(target.id)}">Review proposal V${target.version}</a>`:''}</div>${(response.replies||[]).map(reply=>`<div class="sw-response-reply"><strong>${esc(reply.author)}</strong><p>${esc(reply.body)}</p><small>${date(reply.at)}</small></div>`).join('')}${response.resolution?`<p class="fine-print">${esc(titleCase(response.resolution.status))}: ${esc(response.resolution.reason)}</p>`:''}${internal?responseControls(deal,response):''}</article>`;
}

function responseControls(deal,response) {
  return `<details class="sw-response-controls"><summary>Reply or update discussion</summary><form class="sales-form" data-sales-form="response-reply" ${attrs(deal)} data-response="${esc(response.id)}">${field('Reply','body','',{type:'textarea',required:true})}<button class="secondary" type="submit">Post reply</button></form>${role!=='engineering'&&response.status!=='in_progress'?`<form class="sales-form" data-sales-form="response-status" ${attrs(deal)} data-response="${esc(response.id)}">${select('Discussion status','status',[['open','Open'],...(response.kind==='question'||response.addressed_in_proposal_id?[['resolved','Resolved']]:[]),['declined','Declined']],response.status)}${field('Reason','reason','',{type:'textarea',required:true})}<button class="secondary" type="submit">Update status</button></form>`:''}</details>`;
}

function proposalHistory(deal) {
  const versions=deal.proposals||[];
  const latestManifest=deal.quotes.filter(q=>q.revisions.length).map(q=>({quote_id:q.id,revision:q.revisions.at(-1).revision}));
  const current=versions.at(-1),hasNew=JSON.stringify(current?.manifest||[])!==JSON.stringify(latestManifest);
  return `<section class="sales-panel" aria-label="Published proposals"><div class="sales-sectionhead"><div><div class="eyebrow">CUSTOMER VERSIONS</div><h2>Published proposals</h2></div>${action('publish-proposal',versions.length?'Publish proposal version':'Publish first proposal',deal,null,'primary',latestManifest.length?'':'disabled')}</div><p>${hasNew?'New issued quote revisions are ready to include in a proposal.':'Each proposal keeps its issued quote revisions, scope, prices and evidence.'}</p><p class="fine-print">${service?"Publishing saves a version to the workspace service. Create a recipient link to share it.":"Publishing saves a version in this browser. It does not email the customer."} Unissued draft changes are excluded.</p><div class="sales-comment-list">${[...versions].reverse().map(p=>`<article class="sales-comment"><div><strong>Proposal V${p.version}</strong><a class="text-button" href="#present/${esc(deal.id)}/${esc(p.id)}">Open V${p.version}</a></div><small>Published ${date(p.published_at)} · ${p.manifest.map(ref=>`${esc(S.findQuote(deal,ref.quote_id)?.number||ref.quote_id)} / Rev ${ref.revision}`).join(' · ')}</small></article>`).join('')||'<p class="sales-empty">Issue a quote, then publish its customer proposal here.</p>'}</div></section>`;
}
function commentCard(deal, comment) { const q=deal.quotes.find(q=>q.id===comment.quote_id); return `<article class="sales-comment sales-legacy-comment"><div><strong>${esc(comment.author)}</strong><time>${date(comment.created_at || comment.at)}</time></div><p class="mw-context">${esc(q?.label || 'Deal discussion')}${comment.revision !== undefined ? ` · Rev ${comment.revision}` : ''} · Earlier discussion</p><p>${esc(comment.body)}</p><small>Preserved from the earlier proposal. New customer questions and replies are tracked against their published version below.</small></article>`; }


function workspace() {
  const needle=search.toLowerCase();
  const deals=state.deals.filter(d=>(stageFilter==='all'||d.status===stageFilter)&&[d.title,d.customer,d.owner,d.number,d.crm_id].join(' ').toLowerCase().includes(needle));
  const allQuotes=state.deals.flatMap(deal=>deal.quotes.map(quote=>({deal,quote})));
  const quotes=allQuotes.filter(({deal,quote})=>(stageFilter==='all'||deal.status===stageFilter)&&(quoteStatusFilter==='all'||quote.working.status===quoteStatusFilter)&&[deal.title,deal.customer,deal.owner,deal.number,quote.number,quote.label,quote.working.draft.machine_title].join(' ').toLowerCase().includes(needle));
  return `<div class="sales-pagehead"><div><h1>${hubView==='quotes'?'Quotes':'Deals'}</h1><p>Keep every configuration and customer conversation connected.</p><div class="pac-workspace-counts"><span>${state.deals.length} ${state.deals.length===1?'deal':'deals'}</span><span>${allQuotes.length} ${allQuotes.length===1?'quote':'quotes'}</span><span>${allQuotes.filter(({quote})=>quote.working.status==='draft').length} ${allQuotes.filter(({quote})=>quote.working.status==='draft').length===1?'draft':'drafts'}</span></div></div><div class="sales-actions"><details class="sw-demo-tools"><summary>Workspace tools</summary><div>${action('export-workspace','Export workspace',null,null,'secondary')}${service?action('export-browser-backup','Export previous browser data',null,null,'secondary'):''}${role!=='engineering'?action('new-demo','Create sample deal',null,null,'secondary'):''}</div></details>${role!=='engineering'?action('new-deal',showNewDeal?'Cancel new deal':'New deal',null,null,showNewDeal?'secondary':'primary'):''}</div></div><nav class="pac-workspace-tabs" aria-label="Workspace view" role="tablist">${[['deals','Deals'],['quotes','Quotes']].map(([view,label])=>action('hub-view',label,null,null,hubView===view?'active':'',`data-view="${view}" role="tab" aria-selected="${hubView===view}" tabindex="${hubView===view?'0':'-1'}"`)).join('')}</nav>${showNewDeal?newDealForm():''}<div class="mw-task-summary"><span><strong>${allQuotes.filter(({quote})=>quote.working.status==='draft').length}</strong> working quotes</span><span><strong>${state.deals.filter(d=>!['won','lost'].includes(d.status)&&d.next_action_date&&d.next_action_date.slice(0,10)<new Date().toISOString().slice(0,10)).length}</strong> overdue follow-ups</span><a href="#reviews">Open review queue →</a></div>
  <section class="sales-panel pac-deals-list"><div class="sales-toolbar"><form data-sales-form="search" class="sales-search"><label for="sales-deal-search" class="sr-only">Search deals and quotes</label><input id="sales-deal-search" type="search" name="search" value="${esc(search)}" placeholder="Search ${hubView==='deals'?'deals, customers or owners':'quotes, customers or machines'}"><button class="secondary" type="submit">Search</button></form><div class="sales-filter">${select('Deal stage','stage_filter',[['all','All stages'],...stages.map(x=>[x,titleCase(x)])],stageFilter,'data-sales-change="stage-filter"')}</div>${hubView==='quotes'?`<div class="sales-filter">${select('Quote status','quote_status',[['all','All quotes'],['draft','Draft'],['issued','Issued']],quoteStatusFilter,'data-sales-change="quote-status"')}</div>`:''}<span class="pac-result-count">${hubView==='deals'?deals.length:quotes.length} ${(hubView==='deals'?deals.length:quotes.length)===1?'result':'results'}</span></div><div class="sales-table-wrap">${hubView==='deals'?`<table class="sales-table sales-deals-table"><caption class="sr-only">Sales deals</caption><thead><tr><th scope="col">Deal</th><th scope="col">Customer</th><th scope="col">Stage</th><th scope="col">Quotes</th><th scope="col">Owner</th><th scope="col">Next action</th><th scope="col">Last contact</th></tr></thead><tbody>${deals.map(d=>`<tr><td><a class="sales-table-link" href="#deal/${esc(d.id)}">${esc(d.title)}</a><small>${esc(d.number)}</small></td><td>${esc(d.customer)}</td><td>${status(d.status)}</td><td>${d.quotes.length}</td><td>${esc(d.owner)}</td><td>${esc(d.next_action||'Not set')}<small>${d.next_action_date?date(d.next_action_date):'No date set'}</small></td><td>${date(d.last_contact)}</td></tr>`).join('')||'<tr><td colspan="7"><div class="sales-empty">No deals match this search.</div></td></tr>'}</tbody></table>`:`<table class="sales-table pac-quotes-table"><caption class="sr-only">All quote alternatives</caption><thead><tr><th scope="col">Quote</th><th scope="col">Deal / customer</th><th scope="col">Machine</th><th scope="col">Status</th><th scope="col">Revision</th><th scope="col">Total</th><th scope="col">Owner</th><th scope="col">Updated</th></tr></thead><tbody>${quotes.map(({deal:d,quote:q})=>`<tr><td><a class="sales-table-link" href="#quote/${esc(d.id)}/${esc(q.id)}">${esc(q.label)}</a><small>${esc(q.number)}</small></td><td><a href="#deal/${esc(d.id)}">${esc(d.title)}</a><small>${esc(d.customer)}</small></td><td>${esc(q.working.draft.machine_title.replace('™','').replace(' Automatic Bagger',''))}</td><td>${status(q.working.status)}</td><td>Rev ${q.working.revision}</td><td class="numeric">${money(S.totals(q).total)}${S.totals(q).pending?'<small>Preliminary</small>':''}</td><td>${esc(d.owner)}</td><td>${date(q.working.updated_at||q.working.created_at)}</td></tr>`).join('')||'<tr><td colspan="8"><div class="sales-empty">No quotes match these filters.</div></td></tr>'}</tbody></table>`}</div></section><div class="pac-workspace-footnote"><span>Demonstration · Catalog-backed pricing</span><span>CRM references are illustrative. No external synchronization is active.</span></div>`;
}

function newDealForm() {
  return `<section class="sales-panel"><h2>Start with the deal</h2><p>${catalogIntakeDraft?`Selected machine: ${esc(catalogIntakeDraft.machine_title)}. Create the deal, then add this configuration as its first alternative.`:'Link the opportunity before assigning a quote number.'}</p><form class="sales-form" data-sales-form="new-deal"><div class="sales-form-grid">${field('Deal title','title','',{required:true,placeholder:'Packaging line upgrade'})}${field('Customer / company','customer','',{required:true})}${field('Deal owner','owner',service?.user.name||'Sales representative',{required:true})}${field('CRM deal reference','crm_id','',{required:Boolean(catalogIntakeDraft),placeholder:'Required before creating a quote'})}${field('Application scope','application','',{type:'textarea',full:true,placeholder:'What is being packed, how is it loaded, and what should improve?'})}${field('Requested bag dimensions','bag_dimensions','',{placeholder:'Width × length in inches'})}${field('Target throughput (bags/min)','throughput','')}</div><button class="primary" type="submit">Create deal</button><p class="fine-print">Save the opportunity now and complete the application as you learn more. A CRM reference is required before adding a quote; application, bag dimensions and throughput are required before issue. This does not create a deal in PAC’s CRM.</p></form></section>`;
}

function contactsForm(deal) {
 return `<h3>Contacts</h3><div class="sw-contact-list">${(deal.contacts||[]).map(c=>`<p><strong>${esc(c.name)}</strong> · ${esc(c.title)}<br>${esc(c.email)} ${esc(c.phone)}</p>`).join('')||'<p class="fine-print">No contacts added.</p>'}</div>${role!=='engineering'?`<details><summary>Add contact</summary><form class="sales-form" data-sales-form="add-contact" ${attrs(deal)}><div class="sales-form-grid">${field('Name','name','',{required:true})}${field('Email','email','',{type:'email'})}${field('Title','title')}${field('Phone','phone')}</div><button class="secondary" type="submit">Save contact</button></form></details>`:''}`;
}
function recordHeader(deal) {
  return `<header class="pac-record-header"><div><div class="sales-actions"><span class="eyebrow">${esc(deal.number)}</span>${status(deal.status)}</div><h1>${esc(deal.title)}</h1><p>${esc(deal.customer)}</p></div><div class="sales-actions"><a class="primary" href="#present/${esc(deal.id)}">Present proposal ↗</a></div></header><dl class="pac-deal-facts"><div><dt>Deal owner</dt><dd>${esc(deal.owner)}</dd></div><div><dt>CRM reference</dt><dd>${esc(deal.crm_id||'Not set')}</dd></div><div><dt>Follow-up</dt><dd>${deal.next_action_date?date(deal.next_action_date):'Not set'}</dd></div><div><dt>Alternatives</dt><dd>${deal.quotes.length} configurations</dd></div></dl>`;
}

const compactMoney = value => Number.isFinite(value) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2}).format(value) : 'Price pending';
function viewHelpers() { return {canManageQuotes:role!=='engineering',money:compactMoney,date,action,status,field,select,titleCase,price:value=>showPrices?compactMoney(value):'<span class="sales-price-hidden">Hidden</span>',conditionHtml,working:q=>quoteEdits.get(q.id)?.working||q.working,dirty:q=>quoteEdits.has(q.id)}; }
function dealView(deal) {
  const requested=deal.quotes.find(q=>(deal.customer_responses||[]).some(r=>r.quote_id===q.id&&['open','in_progress'].includes(r.status)));
  const quote=closedDealInspectors.has(deal.id)?null:quoteById(deal,activeQuoteIds[deal.id]||requested?.id);
  if(quote)activeQuoteIds[deal.id]=quote.id;
  const addForm=showAddAlternative?`<form data-sales-form="add-quote" ${attrs(deal)} class="sales-form mw-add-form"><div class="sales-form-grid">${field('Alternative name','label','',{required:true,placeholder:'e.g. Assisted loading'})}${select('PAC machine','machine_id',catalog.machines.map(m=>[m.machine_id,m.title.text]),'r3200')}</div><button class="primary" type="submit">Create alternative</button></form>`:'';
  const detailsForm=showDealDetails?`<section class="sales-panel"><h2>Deal details</h2><form data-sales-form="deal-details" ${attrs(deal)} class="sales-form"><div class="sales-form-grid">${field('Owner','owner',deal.owner,{required:true})}${select('Stage','status',stages.map(x=>[x,titleCase(x)]),deal.status)}${field('CRM deal reference','crm_id',deal.crm_id,{required:true})}${field('Internal next action','next_action',deal.next_action,{type:'textarea',required:true})}${field('Customer next decision','customer_next_decision',deal.customer_next_decision||'',{type:'textarea',placeholder:'The decision or information to agree with the customer.'})}${field('Decision target (customer-visible)','customer_decision_date',deal.customer_decision_date?.slice(0,10)||'',{type:'date'})}${field('Internal follow-up date','next_action_date',deal.next_action_date?.slice(0,10)||'',{type:'date'})}${field('Last customer contact','last_contact',deal.last_contact?.slice(0,10)||'',{type:'date'})}</div><button class="secondary" type="submit">Save deal details</button></form><p class="fine-print">Customer decision and target date appear in the next published proposal. Internal follow-up remains private. CRM reference is recorded without external synchronization.</p>${contactsForm(deal)}</section>`:'';
  const applicationForm=`<section class="sales-panel"><h2>Application requirements</h2><form data-sales-form="scope" ${attrs(deal)} class="sales-form"><div class="sales-form-grid">${field('Application and desired outcome','application',deal.scope.application,{type:'textarea',required:true,full:true})}${field('Requested bag dimensions','bag_dimensions',deal.scope.bag_dimensions,{required:true})}${field('Target throughput (bags/min)','throughput',deal.scope.throughput,{required:true})}${field('Application notes','notes',deal.scope.notes||'',{type:'textarea',full:true})}</div><button class="secondary" type="submit">Save application scope</button><p class="fine-print">Changed scope requires a fresh review of drafts. Issued revisions retain their original scope.</p></form></section>${role!=='engineering'?`<details class="mw-intake-tool"><summary>Update from a customer message</summary><p class="mw-context">Extract suggestions, review them, then apply the changes to this application.</p>${renderIntake({deal})}</details>`:''}`;
  const discussion=(deal.customer_responses||[]).map(r=>responseCard(deal,r,true)).join('')+deal.comments.filter(c=>c.visibility!=='internal').map(c=>commentCard(deal,c)).join('');
  return renderDealWorkspace({catalog,deal,quote,tab:dealTabs[deal.id]||'quotes',addForm,detailsForm,applicationForm,discussion:discussion||'<p class="sales-empty">Customer questions and change requests will appear here.</p>',activityHTML:activity(deal),evidenceHTML:deal.evidence.map(e=>evidenceCard(deal,e)).join('')||'<p class="mw-context">No inspection references yet.</p>',H:viewHelpers()});
}

function activity(deal) { return `<ol class="sales-timeline">${deal.activity.map(item=>`<li><div class="sales-timeline-dot" aria-hidden="true"></div><div><strong>${esc(item.message || item.description || item.type || item.action)}</strong><span>${esc(new Date(item.at||item.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))}${item.actor ? ` · ${esc(typeof item.actor==='object'?item.actor.name:item.actor)}` : ''}</span>${item.quote_id&&S.findQuote(deal,item.quote_id)?`<a class="text-button" href="#quote/${esc(deal.id)}/${esc(item.quote_id)}${Number.isInteger(item.revision)?`/${item.revision}`:''}">Open quote${Number.isInteger(item.revision)?` · Rev ${item.revision}`:''} →</a>`:''}</div></li>`).join('') || '<li>No activity yet.</li>'}</ol>`; }

function evidenceCard(deal,evidence,readOnly=false) {
  const isPhoto=evidence.type==='photo';
  const title=evidence.title || evidence.part_label || evidence.part_title || evidence.part?.title || 'Saved reference';
  const picture=evidence.reference?.photo;
  const preview=evidence.reference?.preview;
  const safePreview=!isPhoto && typeof preview?.dataUrl==='string' && preview.dataUrl.length<=120000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(preview.dataUrl) && [preview.width,preview.height].every(side=>Number.isInteger(side)&&side>0&&side<=640);
  return `<article class="sales-evidence-card"><span class="eyebrow">${isPhoto?'PAC CATALOG · PHOTO REFERENCE':'3D EXPLORER · REFERENCE ASSEMBLY'}</span>${isPhoto&&picture?.file?`<div class="sales-media"><img src="${esc(`${catalog.baseUrl||'/pac-machinery-demo/source'}/${picture.file}`)}" alt="${esc(title)} reference photograph" loading="lazy"></div>`:''}${safePreview?`<div class="sales-evidence-preview"><img src="${esc(preview.dataUrl)}" width="${preview.width}" height="${preview.height}" alt="Captured ${esc(title)} inspection view" loading="lazy"></div>`:''}<h3>${esc(title)}</h3><p>${esc(evidence.description || evidence.note || (isPhoto?'Source photograph retained with the imported configuration.':'Selected component and inspection context attached to this deal.'))}</p><small>${date(evidence.captured_at || evidence.created_at)} · ${esc(deal.number)}</small>${!readOnly&&!isPhoto ? `<a class="text-button" href="#deal-explorer/${esc(deal.id)}/${esc(evidence.quote_id || '')}">Inspect saved evidence →</a>` : ''}</article>`;
}

function quoteView(deal, quote) {
  if(!quote)return `<section class="sales-panel"><h1>No quote selected</h1><a class="primary" href="#deal/${esc(deal.id)}">Return to deal</a></section>`;
  const w=readWorking(quote),editable=canEdit(quote),tab=quoteTabs[quote.id]||'configuration',dirty=quoteEdits.has(quote.id),blocked=dirty||pendingQuoteForms(deal,quote).length>0;
  const line=w.draft.lines.find(item=>item.quote_line_id===selectedLines[quote.id])||w.draft.lines.find(item=>/spare parts kit/i.test(item.name))||w.draft.lines[0];
  let tabHTML='';
  if(tab==='engineering')tabHTML=engineeringPanel(deal,quote,w,editable);
  if(tab==='special')tabHTML=specialPanel(deal,quote,w,editable&&role!=='engineering');
  if(tab==='terms')tabHTML=`<section class="sales-panel"><h2>Commercial summary</h2><dl class="mw-terms-summary"><div><dt>Estimated lead time</dt><dd>${shortLead(w.draft.terms_snapshot)}</dd></div><div><dt>Quote validity</dt><dd>${esc(textValue(w.draft.terms_snapshot.quote_valid_days)||'To confirm')}</dd></div><div><dt>Payment</dt><dd>${esc(textValue(w.draft.terms_snapshot.payment_terms).split(/\n/)[0]||'To confirm')}</dd></div><div><dt>Delivery</dt><dd>${esc(textValue(w.draft.terms_snapshot.delivery_terms)||'To confirm')}</dd></div></dl><p class="mw-context">Freight and tax are excluded unless explicitly listed. The original conditions below govern this revision.</p><details class="mw-source-terms"><summary>Read full commercial terms</summary><div class="sales-terms">${commercialTerms(w.draft.terms_snapshot,w.draft.lines,!showPrices)}</div></details></section>${discountPanel(deal,quote,w,editable&&role!=='engineering')}`;
  if(tab==='review')tabHTML=`${quoteApplication(deal,quote,w)}${reviewPanel(deal,quote,w,editable)}`;
  if(tab==='history')tabHTML=`<section class="sales-panel"><h2>Revision history</h2><p class="fine-print">Issued snapshots preserve scope, prices, reviews and evidence.</p><div class="sales-controls-group">${select('Revision','revision',[['working',`Rev ${quote.working.revision} · ${quote.working.status==='issued'?'Issued':'Working draft'}`],...quote.revisions.filter(r=>r.revision!==quote.working.revision).map(r=>[r.revision,`Rev ${r.revision} · Issued history`])],selectedRevision[quote.id]??'working',`data-sales-change="revision" ${attrs(deal,quote)}`)}</div><div class="mw-table-wrap"><table class="mw-table"><thead><tr><th>Revision</th><th>Issued</th><th>Amount</th><th></th></tr></thead><tbody>${[...quote.revisions].reverse().map(r=>`<tr><td>Rev ${r.revision}</td><td>${date(r.issued_at)}</td><td>${price(r.totals.total)}</td><td><a class="text-button" href="#quote/${esc(deal.id)}/${esc(quote.id)}/${r.revision}">Open issued revision</a></td></tr>`).join('')}</tbody></table></div></section>`;
  if(tab==='history'&&quote.revisions.some(r=>r.revision<w.revision)&&showPrices)tabHTML+=renderRevisionDiff({deal,quote,fromRevision:quote.revisions.filter(r=>r.revision<w.revision).at(-1).revision,toRevision:w.status==='draft'?'working':w.revision});
  const repricing=service&&editable&&C.refreshStatus(catalog,w.draft).mismatch?`<div class="sales-note warning"><strong>A newer catalog is available.</strong><p>Review the price and scope differences before applying them. Issued revisions remain unchanged.</p>${action('preview-reprice','Review catalog changes',deal,quote,'secondary',blocked?'disabled':'')}</div>`:'';
  const quoteDetails=`<details class="sw-quote-details"><summary>Alternative details</summary><form class="sales-form" data-sales-form="rename-quote" ${attrs(deal,quote)}>${field('Alternative name','label',quote.label,{required:true,disabled:role==='engineering'})}<button class="secondary" type="submit" ${role==='engineering'?'disabled':''}>Save name</button></form>${role!=='engineering'?action('duplicate-quote','Duplicate as a draft',deal,quote,'secondary'):''}</details>`;
  return repricing+renderQuoteWorkspace({catalog,deal,quote,w,editable,tab,quoteDetails,priceForm:line?linePriceForm(deal,quote,w,line,editable,dirty):'',releaseHTML:quoteReadiness(deal,quote,w,editable,blocked),deliveryHTML:quoteDelivery(w),panel:quotePanels[quote.id]||'line',line,dirty,blocked,role,showPrices,optionsHTML:editable?catalogPanel(deal,quote,w):'',tabHTML,H:viewHelpers()});
}
function catalogPanel(deal,quote,w) {
  const rows=C.getSelectableLines(catalog,quote.machine_id).filter(row=>row.line_class!=='catalog_base'&&!C.selectedLine(w.draft,row)).filter(row=>(optionCategory==='all'||(optionCategory==='services'?row.line_class==='service':optionCategory==='options'?row.line_class!=='service':optionGroup(row)===optionCategory))&&row.name.toLowerCase().includes(optionSearch.toLowerCase()));
  return `<h2 class="mw-inspector-title">Catalog options</h2><p class="mw-context">${esc(w.draft.machine_title)}</p><form data-sales-form="option-search" ${attrs(deal,quote)} class="sales-form"><label for="sales-option-search" class="sr-only">Search catalog options</label><div class="sales-search"><input id="sales-option-search" type="search" name="search" value="${esc(optionSearch)}" placeholder="Find options or services"><button class="secondary" type="submit">Search</button></div>${select('Category','category',[['all','All items'],['Loading & handling','Loading & handling'],['Bag handling & sealing','Bag handling & sealing'],['Printing & identification','Printing & identification'],['Machine options','Machine options'],['Support & delivery','Support & delivery'],['services','Services']],optionCategory,'data-sales-change="option-category"')}</form><div class="mw-options-list">${rows.map(row=>{const plan=C.planSelection(catalog,w.draft,row),restrictions=S.catalogRestrictions(catalog,quote.machine_id,row),blocked=plan.blocked||restrictions.length;return `<article class="mw-option-row"><div><h3>${esc(row.name)}</h3><span>${price(row.price_usd)}</span><small>${esc(optionGroup(row))}${row.requires_option_ids?.length?' · Companion required':''}</small>${optionPurpose(catalog,row)?`<p class="mw-option-purpose">${esc(optionPurpose(catalog,row))}</p>`:''}${[...(plan.reviewReasons||[]),...restrictions].map(text=>`<small>${esc(text)}</small>`).join('')}</div>${action('select-option','Add',deal,quote,'secondary',`data-row="${catalog.priceLines.indexOf(row)}" aria-label="Add ${esc(row.name)}" ${blocked?'disabled':''}`)}</article>`;}).join('')||'<p class="mw-context">No unselected options match this search.</p>'}</div>`;
}

function quoteApplication(deal,quote,w) {
  const scope=w.scope_snapshot||deal.scope;
  return `<section class="sales-panel"><div class="sales-sectionhead"><div><h2>Application & evidence</h2><p>Confirm the configuration against the written application.</p></div><a class="secondary" href="#deal-explorer/${esc(deal.id)}/${esc(quote.id)}">Add 3D evidence</a></div><p>${esc(scope.application)}</p><dl class="sales-scope-facts"><div><dt>Bag dimensions</dt><dd>${esc(scope.bag_dimensions)}</dd></div><div><dt>Target throughput</dt><dd>${esc(scope.throughput)}${!/bags|min/i.test(scope.throughput)?' bags/min':''}</dd></div></dl><div class="sales-evidence-grid">${(w.evidence||deal.evidence).filter(e=>!e.quote_id||e.quote_id===quote.id).map(e=>evidenceCard(deal,e)).join('')||'<p class="fine-print">No additional evidence attached.</p>'}</div><a class="text-button" href="#deal/${esc(deal.id)}">Edit deal scope →</a></section>`;
}

function quoteLines(deal,quote,w,editable) {
  return `<div class="sales-table-wrap"><table class="sales-table sales-lines-table"><caption class="sr-only">Selected quote lines</caption><thead><tr><th scope="col">Selected configuration</th><th scope="col">Quantity</th><th scope="col">Amount</th>${editable ? '<th scope="col">Action</th>' : ''}</tr></thead><tbody>${w.draft.lines.map(line=>`<tr><td><strong>${esc(line.name)}</strong><small>${esc(line.line_class==='service' ? 'Service' : ['catalog_base','catalog_base_variant'].includes(line.line_class) ? 'Base machine' : 'Standard option')}</small>${line.requires?.length ? `<small class="sales-requires">Requires ${esc(line.requires.map(r=>r.target).join(', '))}</small>` : ''}${conditionHtml(line,true)}</td><td>${editable && line.price_unit!=='lump_sum' ? `<input class="sales-quantity" type="number" value="${line.quantity}" min="${line.price_unit==='each'?1:0.1}" step="${line.price_unit==='each'?1:0.1}" aria-label="Quantity for ${esc(line.name)}" data-sales-change="quantity" data-line="${esc(line.quote_line_id)}" ${attrs(deal,quote)}>` : line.quantity}</td><td class="numeric">${price(line.price_usd*line.quantity)}</td>${editable ? `<td>${!['catalog_base','catalog_base_variant'].includes(line.line_class) ? action('remove-option','Remove',deal,quote,'text-button',`data-line="${esc(line.quote_line_id)}" aria-label="Remove ${esc(line.name)}"`) : '<span class="fine-print">Required</span>'}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function optionPicker(deal,quote) {
  const rows = C.getSelectableLines(catalog,quote.machine_id).filter(r=>r.line_class!=='catalog_base'&&!C.selectedLine(quote.working.draft,r)).filter(r=>(optionCategory==='all'||(optionCategory==='services'?r.line_class==='service':r.line_class!=='service'))&&r.name.toLowerCase().includes(optionSearch.toLowerCase()));
  return `<details class="sales-option-picker" open><summary>Add catalog options</summary><form class="sales-toolbar" data-sales-form="option-search" ${attrs(deal,quote)}><div class="sales-search"><label class="sr-only" for="sales-option-search">Search catalog options</label><input id="sales-option-search" type="search" name="search" placeholder="Search options, spares or services" value="${esc(optionSearch)}"><button type="submit" class="secondary">Search</button></div>${select('Show','category',[['all','All items'],['Loading & handling','Loading & handling'],['Bag handling & sealing','Bag handling & sealing'],['Printing & identification','Printing & identification'],['Machine options','Machine options'],['Support & delivery','Support & delivery'],['services','Services']],optionCategory,'data-sales-change="option-category"')}</form><div class="sales-options-scroll"><table class="sales-table sales-options-table"><caption class="sr-only">Available catalog options</caption><thead><tr><th scope="col">Option</th><th scope="col">Price</th><th scope="col">Action</th></tr></thead><tbody>${rows.map(row=>{const info=C.describeLine(catalog,row), index=catalog.priceLines.indexOf(row), plan=C.planSelection(catalog,quoteEdits.get(quote.id)?.working.draft||quote.working.draft,row), restrictions=typeof S.catalogRestrictions==='function'?S.catalogRestrictions(catalog,quote.machine_id,row):[], blocked=plan.blocked||restrictions.length>0; return `<tr><td><strong>${esc(row.name)}</strong><small>${row.line_class==='service'?'Service':'Standard option'}${row.requires_option_ids?.length ? ` · Requires ${esc(row.requires_option_ids.map(x=>typeof x==='string'?(C.getOption(catalog,quote.machine_id,x)?.name||x):(x.target||C.getOption(catalog,quote.machine_id,x.option_id)?.name||x.option_id)).join(', '))}` : ''}</small>${[...new Set([...(plan.blocked?plan.reviewReasons:[]),...restrictions])].map(reason=>`<small class="sales-requires">${esc(reason)}</small>`).join('')}</td><td class="numeric">${price(row.price_usd)}</td><td>${action('select-option','Add',deal,quote,'secondary',`data-row="${index}" aria-label="Add ${esc(row.name)}" ${blocked?'disabled':''}`)}</td></tr>`;}).join('')||'<tr><td colspan="3">No unselected items match this search.</td></tr>'}</tbody></table></div></details>`;
}
function engineeringPanel(deal,quote,w,editable) {
  const pricingRole = role === 'engineering' || role === 'manager';
  const triggers = engineeringTriggers(catalog,quote,w);
  const required = S.requiredReviews(catalog,{...quote,working:w}).engineering;
  const review = editable?S.reviewStatus(deal,quote,'engineering'):{status:w.approvals.engineering?'approved':'not_requested'};
  const approved = review.status==='approved';
  const engineeringState=approved?'reviewed':!required?'not required':review.status==='changes_requested'?'changes requested':review.status==='needs_resubmission'?'needs resubmission':review.status==='pending'?'awaiting review':'not submitted';
  return `<section class="sales-panel"><div class="sales-sectionhead"><div><h2>Engineering review</h2><p>${required?'Engineering or a Manager confirms the application conditions before issue.':'No engineering approval is required for this configuration.'}</p></div>${status(engineeringState)}</div>${review.reason?`<div class="sales-note warning"><strong>Requested change</strong><p>${esc(review.reason)}</p><span>${esc(review.reviewer?.name||'Engineering reviewer')}</span></div>`:''}<div class="mw-review-context"><h3>Catalog conditions</h3>${triggers.length?`<ul>${triggers.map(item=>`<li><strong>${esc(item.name)}</strong><p>${esc(item.reason)}</p></li>`).join('')}</ul>`:'<p class="mw-context">No selected catalog item carries an engineering condition.</p>'}${required&&editable?`<p class="mw-context">Quote owner: ${esc(deal.owner)} · Review team: Engineering or Manager</p><a class="text-button" href="#reviews">Open review queue →</a>`:''}</div><div class="sales-sectionhead"><h3>Custom engineering requests</h3><span>${w.engineering.length} ${w.engineering.length===1?'request':'requests'}</span></div>${!w.engineering.length?`<p class="mw-context">${editable?'Add a request when the application requires a change beyond the catalog configuration.':'No custom engineering requests were included in this issued revision.'}</p>`:''}<div class="sales-engineering-list">${w.engineering.map(item=>editable ? engineeringForm(deal,quote,item,pricingRole) : `<article class="sales-engineering-item"><h3>${esc(item.description)}</h3><p>${esc(item.reason)}</p><span>${price((item.hours || 0)*w.labor_rate+(item.materials || 0))}</span></article>`).join('')}</div>${editable ? `${pricingRole?`<details class="mw-rate-settings"><summary>Engineering labor rate</summary><form class="sales-form sales-rate-form" data-sales-form="labor-rate" ${attrs(deal,quote)}>${field('Assumed labor rate (USD/hour)','labor_rate',w.labor_rate,{type:showPrices?'number':'password',min:0,step:0.01,required:true,disabled:!showPrices})}<button class="secondary" type="submit" ${showPrices?'':'disabled'}>Update rate</button><p class="fine-print">One rate for this draft. Demo assumption, pending PAC confirmation.</p></form></details>`:''}<details class="sales-add-engineering"><summary>Add a custom engineering request</summary>${engineeringForm(deal,quote,null,pricingRole)}</details>` : ''}${!pricingRole&&editable ? '<p class="sales-note">Sales records the required change and its purpose. Engineering or a Manager adds hours, materials and pricing in their account.</p>' : ''}</section>`;
}

function engineeringForm(deal,quote,item,pricingRole) {
  return `<form class="sales-form sales-engineering-item" data-sales-form="engineering" ${attrs(deal,quote)} ${item ? `data-item="${esc(item.id)}"` : ''}><div class="sales-form-grid">${field('What needs to change?','description',item?.description || '',{required:true,full:true,placeholder:'e.g. Custom product guide for mixed hardware kits'})}${field('Why is it needed?','reason',item?.reason || '',{type:'textarea',required:true,full:true,placeholder:'Describe the application constraint or customer requirement.'})}${select('Applies to','option_id',[['','Custom add-on / overall machine'],...quote.working.draft.lines.filter(l=>l.option_id).map(l=>[l.option_id,l.name])],item?.option_id || '')}${pricingRole ? field('Labor hours','hours',item?.hours ?? '',{type:showPrices?'number':'password',min:0,step:0.25,disabled:!showPrices})+field('Material cost (USD)','materials',item?.materials ?? '',{type:showPrices?'number':'password',min:0,step:0.01,disabled:!showPrices}) : ''}</div>${item ? `<div class="sales-inline-total"><span>Engineering add-on</span><strong>${item.hours == null || item.materials == null ? 'Pricing pending' : price(item.hours*quote.working.labor_rate+item.materials)}</strong></div>` : ''}<div class="sales-actions"><button class="secondary" type="submit" ${!item&&pricingRole&&!showPrices?'disabled':''}>${item ? 'Save requirement' : 'Add requirement'}</button>${!item&&pricingRole&&!showPrices?'<span class="fine-print">Show prices before adding a new requirement. Unapplied entries are retained.</span>':''}${item&&role!=='engineering' ? action('remove-engineering','Remove',deal,quote,'text-button',`data-item="${esc(item.id)}"`) : ''}</div></form>`;
}
function specialPanel(deal,quote,w,editable) {
  const form=item=>`<form class="sales-form" data-sales-form="special" ${attrs(deal,quote)} ${item?`data-item="${esc(item.id)}"`:''}><div class="sales-form-grid">${field('Description','description',item?.description||'',{required:true,full:true})}${field('Quoted add-on price (USD)','price',item?.price??'',{type:showPrices?'number':'password',min:0,step:0.01,required:true,disabled:!showPrices})}${field('Lead-time condition','lead_time',item?.lead_time||'',{required:true,placeholder:'e.g. Adds 2 weeks after drawing approval'})}</div><button type="submit" class="secondary" ${showPrices||item?'':'disabled'}>${item?'Save special-order item':'Add special-order item'}</button></form>`;
  return `<section class="sales-panel"><h2>Special orders & add-ons</h2><p>${editable?'Record confirmed non-catalog scope with an explicit price and lead-time condition.':w.special.length?'Special-order scope for this revision. Sales or a Manager maintains these items.':w.status==='issued'?'No special-order items were included in this issued revision. Create a revision to add confirmed scope.':'No special-order items. Sales or a Manager can add confirmed scope.'}</p>${w.special.map(item=>`<article class="mw-special-item"><div class="sales-sectionhead"><div><h3>${esc(item.description)}</h3><p>${esc(item.lead_time)}</p></div><strong>${price(item.price)}</strong></div>${editable?`<details><summary>Edit special-order item</summary>${form(item)}</details>${action('remove-special','Remove',deal,quote,'text-button',`data-item="${esc(item.id)}"`)}` : ''}</article>`).join('')}${editable?`<details><summary>Add a special-order item</summary>${form(null)}</details>`:''}</section>`;
}

function discountPanel(deal,quote,w,editable) {
  return `<section class="sales-panel"><div class="sales-sectionhead"><div><h2>Commercial review</h2></div></div>${editable ? `<form data-sales-form="discount" ${attrs(deal,quote)} class="sales-form"><div class="sales-form-grid">${field('Discount amount (USD)','amount',showPrices?w.discount.amount:'',{type:'number',min:0,step:0.01,required:true,disabled:!showPrices})}${field('Reason for discount','reason',showPrices?w.discount.reason:'',{placeholder:showPrices?'Required for any discount':'Show prices to read or edit the reason.',disabled:!showPrices})}</div><button type="submit" class="secondary" ${showPrices?'':'disabled'}>Save discount request</button><p class="fine-print">Any discount needs manager approval. Editing the amount or reason clears the earlier approval.</p></form>` : `<div class="sales-inline-total"><span>Discount</span><strong>${price(w.discount.amount)}</strong></div>`}</section>`;
}
function linePriceForm(deal,quote,w,line,editable,dirty) {
  if(!S.canOverrideLinePrice(line))return '';
  const override=line.selling_price_override,allowed=editable&&['sales','manager'].includes(role);
  const detail=override?`<div class="mw-price-record"><strong>Adjusted selling price</strong><p class="mw-context">Catalog unit price ${price(line.price_usd)} · ${esc(override.actor?.name||titleCase(override.role))} · ${date(override.at)}</p><p>${esc(showPrices?override.reason:'Price-change reason hidden.')}</p></div>`:'';
  if(!allowed)return detail;
  return `${detail}<details class="mw-price-editor"><summary>${override?'Change selling price':'Adjust selling price'}</summary><p class="mw-context">${role==='manager'?'Manager can set a price above or below catalog.':'Sales can set a price at or above catalog. Below-catalog pricing requires Manager.'} Demo policy; PAC approval pending.</p><form class="sales-form" data-sales-form="line-price" ${attrs(deal,quote)} data-item="${esc(line.quote_line_id)}">${field('Selling unit price · USD','price_usd',showPrices?S.lineUnitPrice(line):'',{type:showPrices?'number':'password',required:true,min:role==='manager'?0:line.price_usd,step:'0.01',disabled:!showPrices||dirty})}${field('Reason for price change','reason','',{type:'textarea',required:true,disabled:!showPrices,placeholder:showPrices?'':'Show prices to read or edit the reason.'})}<button class="secondary" type="submit" ${!showPrices||dirty?'disabled':''}>Save selling price</button></form>${override?`<form class="sales-form mw-reset-price" data-sales-form="reset-line-price" ${attrs(deal,quote)} data-item="${esc(line.quote_line_id)}">${field('Reason for restoring catalog price','reason','',{required:true,disabled:!showPrices,placeholder:showPrices?'':'Show prices to read or edit the reason.'})}<button class="text-button" type="submit" ${!showPrices||dirty?'disabled':''}>Restore catalog price</button></form>`:''}<p class="mw-context">${dirty?'Save configuration changes before adjusting a price.':!showPrices?'Show prices to edit the selling price.':'Catalog prices and issued revisions stay unchanged. A change clears the draft reviews.'}</p></details>`;
}
function quoteDelivery(w) {
  const notes=[...new Set(w.draft.lines.flatMap(line=>(line.flags||[]).filter(f=>f.kind==='lead_time').map(f=>f.evidence)).filter(Boolean))];
  const safe=value=>esc(showPrices?value:String(value).replace(/\$[\d,.]+/g,'[price hidden]'));
  return `<section class="mw-delivery" aria-label="Quote delivery conditions"><div><h2>Estimated lead time</h2><strong>${shortLead(w.draft.terms_snapshot)}</strong><p class="mw-context">After receipt of deposit. Confirmed at order; options may affect timing.</p></div>${notes.length||w.special.length?`<div><h3>Delivery conditions</h3><ul>${notes.map(note=>`<li>${safe(note)}</li>`).join('')}${w.special.map(item=>`<li>${safe(item.description)}: ${safe(item.lead_time)}</li>`).join('')}</ul></div>`:''}</section>`;
}
function quoteReadiness(deal,quote,w,editable,blocked) {
  if(!editable)return '';
  const candidate={...quote,working:w},scope={...deal,quotes:deal.quotes.map(q=>q.id===quote.id?candidate:q)};
  const blockers=S.blockers(catalog,scope,candidate);
  const required=S.requiredReviews(catalog,candidate);
  const names={application:'Application',engineering:'Engineering',manager:'Manager'};
  return `<section class="mw-readiness" aria-label="Issue readiness"><div class="mw-section-head"><h2>Before issue</h2><span class="sales-status" data-issue-state>${blocked?'Unsaved work':blockers.length?`${blockers.length} open ${blockers.length===1?'item':'items'}`:'Ready to issue'}</span></div>${blocked?'<p class="mw-context">Save or discard unapplied edits before completing the reviews.</p>':''}<div class="mw-review-summary">${Object.keys(names).filter(key=>required[key]).map(key=>`<span>${names[key]} <strong>${w.approvals[key]?'Reviewed':'Required'}</strong></span>`).join('')}</div>${blockers.length?`<ul>${blockers.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'<p class="mw-context">The saved revision has all required reviews.</p>'}<p class="mw-context">Issue preserves this revision. Publishing a proposal is a separate step from the deal.</p></section>`;
}
function summaryPanel(deal,quote,w,t,editable) {
  return `<section class="sales-panel sales-summary"><div class="eyebrow">REV ${w.revision} · ${editable?'WORKING DRAFT':'ISSUED QUOTE'}</div><h2>Quote summary</h2><dl class="sales-money-breakdown"><div><dt>Catalog configuration</dt><dd>${price(t.catalog)}</dd></div><div><dt>Engineering add-ons</dt><dd>${price(t.engineering)}</dd></div><div><dt>Special orders</dt><dd>${price(t.special)}</dd></div><div><dt>Discount</dt><dd>${showPrices?'−'+money(t.discount):'Hidden'}</dd></div></dl><div class="sales-total"><span>${t.pending?'Preliminary total':'Quote total'} · USD</span><strong>${price(t.total)}</strong></div>${t.pending ? '<p class="sales-note warning">Unpriced requirements remain. This total is not final.</p>' : ''}<div class="sales-leadtime"><strong>Catalog lead time</strong><span>${shortLead(w.draft.terms_snapshot)}</span><p>After receipt of deposit; confirmed at order.</p>${[...new Set(w.draft.lines.flatMap(line=>(line.flags||[]).filter(f=>f.kind==='lead_time').map(f=>f.evidence)))].map(note=>`<p class="sales-requires">${esc(showPrices?note:note.replace(/\$[\d,.]+/g,'[price hidden]'))}</p>`).join('')}${w.special.map(s=>`<p class="sales-requires">${esc(s.description)}: ${esc(s.lead_time)}</p>`).join('')}</div><p class="fine-print">Taxes and freight follow the source commercial terms unless explicitly quoted.</p></section>`;
}
function reviewPanel(deal,quote,w,editable) {
  const blockers = editable ? S.blockers(catalog,deal,quote) : [];
  const unsaved=quoteEdits.has(quote.id)||pendingQuoteForms(deal,quote).length>0;
  if(unsaved)blockers.unshift('Save or discard unapplied changes before review or issue.');
  const requirements=S.requiredReviews(catalog,{...quote,working:w});
  const incomplete=blockers.some(reason=>!(/^(Application review is required|Engineering approval is required|Manager approval is required)/.test(reason)));
  const checks = [['application','Application review','Confirm the machine and options against the written application.'],['engineering','Engineering review','Confirm catalog conditions, custom requests, pricing and delivery.'],['manager','Commercial review','Approve discounts, below-catalog prices and special-order terms.']];
  const gates=checks.map(([kind,label,description])=>{
    const review=editable?S.reviewStatus(deal,quote,kind):{status:w.approvals[kind]?'approved':'not_requested'},approval=editable?(review.status==='approved'?w.approvals[kind]:null):w.approvals[kind];
    const canReview=role==='manager'||kind==='application'||kind==='engineering'&&role==='engineering';
    const returned=['changes_requested','needs_resubmission'].includes(review.status);
    const canSubmit=editable&&role!=='engineering'&&!unsaved;
    const stateLabel=approval?'Approved':!requirements[kind]?'Not required':review.status==='pending'?'Awaiting review':review.status==='changes_requested'?'Changes requested':review.status==='needs_resubmission'?'Changed after submission':'Not submitted';
    return `<div class="sales-review-gate mw-review-gate"><div><div class="mw-section-head"><h3>${label}</h3>${status(stateLabel)}</div><p>${description}</p><p class="mw-context">${requirements[kind]?`Review team: ${kind==='application'?'Sales, Engineering or Manager':kind==='engineering'?'Engineering or Manager':'Manager'} · Quote owner: ${esc(deal.owner)}`:'This configuration does not trigger this review.'}</p>${approval?`<small>${esc(approval.actor?.name||approval.name||approval.by||approval.role||kind)} · ${date(approval.at||approval.created_at)}</small>`:''}${review.reason?`<div class="sales-note warning"><strong>Requested change</strong><p>${esc(review.reason)}</p><span>${esc(review.reviewer?.name||'Reviewer')}</span></div>`:''}${review.note?`<p class="mw-context">Submission note: ${esc(review.note)}</p>`:''}</div>${editable&&requirements[kind]&&!approval?`<div class="mw-review-actions">${review.status!=='pending'&&role!=='engineering'?action('submit-review',returned?'Resubmit for review':'Submit for review',deal,quote,'secondary',`data-review="${kind}" ${canSubmit?'':'disabled'}`):''}${canReview?`${action('review',`Confirm ${kind}`,deal,quote,'secondary',`data-review="${kind}" ${unsaved||incomplete||returned?'disabled':''}`)}${!returned?`<details><summary>Request changes</summary><form class="sales-form" data-sales-form="return-review" ${attrs(deal,quote)} data-item="${kind}">${field('What must be changed?','reason','',{type:'textarea',required:true})}<button class="secondary" type="submit" ${unsaved?'disabled':''}>Return to quote owner</button></form></details>`:''}`:`<span class="mw-context">${kind==='engineering'?'Engineering or Manager':'Manager'} role required</span><a class="text-button" href="#reviews">Track review →</a>`}</div>`:''}</div>`;
  }).join('');
  return `<section class="sales-panel sales-review-panel"><h2>${editable?'Review & issue':'Review record'}</h2><p class="mw-context">Reviews apply to this exact revision. Review teams are role-based; no individual reviewer is assigned automatically.</p>${editable&&blockers.length?`<div class="sales-blockers"><strong>Before issue</strong><ul>${blockers.map(item=>`<li>${esc(typeof item==='string'?item:item.message)}</li>`).join('')}</ul></div>`:''}<div class="sales-review-gates">${gates}</div>${editable?`${!blockers.length?'<p class="sales-note success">All required reviews are complete. This revision is ready to issue.</p>':''}${action('issue',`Issue Rev ${w.revision}`,deal,quote,'primary',blockers.length||role==='engineering'?'disabled':'')}<p class="fine-print">Issue preserves this revision. Publish a proposal version from the deal to make it available for customer review.</p>${role==='engineering'?'<p class="fine-print">Sales or a Manager issues the reviewed quote.</p>':''}`:'<p class="fine-print">Create a new revision to make changes. The issued record is preserved.</p>'}</section>`;
}

function selectionDialog() {
  const {dealId,quoteId,plan,rowIndex} = pendingSelection;
  const deal=dealById(dealId),quote=quoteById(deal,quoteId);
  return `<dialog class="sales-modal" aria-labelledby="sales-selection-title"><div class="eyebrow">REVIEW THE SELECTION</div><h2 id="sales-selection-title">${plan.additions.length>1?'Add the complete configuration?':'Confirm this catalog option?'}</h2><p>${plan.additions.length>1?'The selected option requires these items to work together.':'Review the source conditions before adding this option.'}</p>${plan.reviewReasons.length?`<div class="sales-note warning"><ul>${plan.reviewReasons.map(reason=>`<li>${esc(showPrices?reason:reason.replace(/\$[\d,.]+/g,'[price hidden]'))}</li>`).join('')}</ul></div>`:''}<ul class="sales-confirm-lines">${plan.additions.map(l=>`<li><span>${esc(l.name)}</span><strong>${price(l.price_usd*l.quantity)}</strong></li>`).join('')}</ul><div class="sales-inline-total"><span>Change to quote</span><strong>${price(plan.addedTotal)}</strong></div><div class="sales-actions">${action('cancel-selection','Cancel',deal,quote,'secondary')}${action('confirm-selection',plan.additions.length>1?'Add required items':'Confirm and add',deal,quote,'primary',`data-row="${rowIndex}"`)}</div></dialog>`;
}
function explorerView(deal,quoteId) {
  return `${renderDealExplorer({deal,quoteId:quoteId||null,returnHash:quoteId&&S.findQuote(deal,quoteId)?`#quote/${deal.id}/${quoteId}`:`#deal/${deal.id}`,evidence:deal.evidence})}`;
}

export function afterRender() {
  restoreFormDrafts();
  if(role==='engineering')for(const form of document.querySelectorAll('[data-sales-form="scope"],[data-sales-form="deal-details"],[data-sales-form="response-reply"],[data-sales-form="response-status"],[data-sales-form="comment"]')){for(const control of form.querySelectorAll('input,textarea,select,button'))control.disabled=true;if(!form.querySelector('.mw-role-note'))form.insertAdjacentHTML('afterbegin','<p class="mw-context mw-role-note">Read-only for Engineering. Sales or a Manager maintains this information.</p>');}
  intakeCleanup?.();intakeCleanup=null;
  if(rendered.view==='deal'&&dealTabs[rendered.id]==='application'&&document.querySelector('[data-application-intake]')){
    const deal=dealById(rendered.id);
    intakeCleanup=mountIntake({root:document.querySelector('[data-application-intake]'),deal,onApply:async scope=>{
      if(saving)throw new Error('Wait for the current save to finish.');
      captureFormDrafts();if(pendingForContext().length)throw new Error('Save or discard the application form edits before applying the customer message.');
      const input={...dealById(deal.id).scope,...scope};saving=true;
      try{if(service){const response=await service.command('updateScope',{dealId:deal.id,input});state=S.migrateWorkspace(response.state);}else commit(candidate=>S.updateScope(S.findDeal(candidate,deal.id),input));setTimeout(()=>redraw(),0);}
      finally{saving=false;}
    },notify});
  }
  if(service)for(const control of document.querySelectorAll('[data-sales-change="role"]')){control.disabled=true;control.closest('.sales-field')?.setAttribute('hidden','');}
  const frame = document.getElementById('deal-explorer-frame');
  if (rendered.view === 'deal-explorer' && frame) {
    if (frame && frame !== mountedExplorer) {
      explorerCleanup?.(); mountedExplorer=frame;
      const deal=dealById(rendered.id);
      explorerCleanup = mountDealExplorer({dealId:deal.id,quoteId:rendered.qid||null,evidence:deal.evidence,onEvidence:async input=>{try{let evidence;if(service){const response=await service.command('addEvidence',{dealId:deal.id,input});state=S.migrateWorkspace(response.state);evidence=response.result;}else evidence=commit(candidate=>S.addEvidence(S.findDeal(candidate,deal.id),input));notify('3D evidence saved to this deal.');return evidence;}catch(err){notify(err.message);throw err;}},onError:message=>notify(typeof message==='string'?message:message.message)});
    }
  } else if (explorerCleanup) { explorerCleanup(); explorerCleanup=null; mountedExplorer=null; }
  const reprice=document.querySelector('.sw-reprice');if(reprice&&!reprice.open){reprice.showModal();reprice.addEventListener('cancel',()=>{repricePreview=null;});}
  const dialog=document.querySelector('.sales-modal');
  if(dialog) {
    dialog.addEventListener('cancel',event=>{event.preventDefault();dismissSelection();});
    if(!dialog.open)dialog.showModal();
    dialog.querySelector('button')?.focus();
  }
}


function repriceDialog(){
 const p=repricePreview,deal=dealById(p.dealId),quote=quoteById(deal,p.quoteId);
 const display=value=>value==null?'—':typeof value.price==='number'?`${price(value.price)} × ${value.quantity}`:esc(showPrices?(value.text||value.lead_time?.text||JSON.stringify(value)):String(value.text||value.lead_time?.text||'Conditions changed').replace(/\$[\d,.]+/g,'[price hidden]'));
 return `<dialog class="sw-reprice" aria-labelledby="reprice-title"><div><h2 id="reprice-title">Review catalog changes</h2><p>Catalog version ${p.catalogVersion}. This updates the working draft and resets its reviews.</p><div class="mw-table-wrap"><table class="mw-table"><thead><tr><th>Item</th><th>Saved</th><th>Current catalog</th></tr></thead><tbody>${p.changes.map(c=>`<tr><td>${esc(c.name)}${c.kind==='override_reset'?'<small>Adjusted selling price will be reset to catalog.</small>':''}</td><td>${display(c.before)}</td><td>${display(c.after)}</td></tr>`).join('')||'<tr><td colspan="3">Prices are unchanged. The catalog basis will be refreshed.</td></tr>'}</tbody></table></div><p><strong>${price(p.totalBefore)} → ${price(p.totalAfter)}</strong></p><div class="sales-actions">${action('close-reprice','Cancel',deal,quote,'secondary')}${action('apply-reprice','Apply current catalog',deal,quote,'primary')}</div></div></dialog>`;
}
function composerView(deal) {
  if(!deal)return '';
  const previous=deal.proposals.at(-1);
  return `<section class="sw-composer"><a href="#deal/${esc(deal.id)}" data-sales-action="close-composer" class="text-button">${icon('arrow-left')} Back to deal</a><h1>Prepare customer proposal</h1><p>Choose the alternatives and issued revisions to include. Draft changes stay in the workspace. Previously published proposals keep their original scope and prices.</p><section class="sw-customer-decision-preview"><h2>Customer next decision</h2><p>${esc(deal.customer_next_decision||'Compare the alternatives and confirm the best fit for your application.')}</p><p class="fine-print">${deal.customer_decision_date?`Decision target: ${date(deal.customer_decision_date)} · `:''}This text is visible to the customer. Internal tasks and follow-up dates are excluded.</p><a href="#deal/${esc(deal.id)}" data-sales-action="edit-customer-decision" data-deal="${esc(deal.id)}">Edit in deal details →</a></section><form data-sales-form="compose-proposal" data-deal="${esc(deal.id)}"><div class="sw-compose-list">${deal.quotes.map(quote=>{
    const issued=quote.revisions.at(-1),old=previous?.manifest.find(ref=>ref.quote_id===quote.id);
    return `<div class="sw-compose-row"><input type="checkbox" id="compose-${esc(quote.id)}" name="quote" value="${esc(quote.id)}" ${issued?'checked':'disabled'}><label for="compose-${esc(quote.id)}"><strong>${esc(quote.label)}</strong><p>${esc(quote.number)} · ${issued?`Latest issued Rev ${issued.revision}`:'No issued revision'}${old?` · Last published Rev ${old.revision}`:''}</p></label>${issued?`<select name="revision-${esc(quote.id)}" aria-label="Revision for ${esc(quote.label)}">${[...quote.revisions].reverse().map(revision=>`<option value="${revision.revision}">Rev ${revision.revision} · ${money(revision.totals.total)}</option>`).join('')}</select>`:'<span class="fine-print">Review and issue this quote first.</span>'}</div>`;
  }).join('')}</div><p class="fine-print">Alternatives are separate choices. Their prices are not added together.</p><div class="sw-compose-actions">${action('close-composer','Cancel',deal,null,'secondary')}<button type="submit" class="primary">Publish proposal</button></div></form></section>`;
}
function shareView(deal) {
  if(!deal)return '';
  return `<section class="sw-share">${action('close-share',`${icon('arrow-left')} Back to proposal`,deal,null,'text-button')}<h1>Share customer proposal</h1><p>Create a recipient-specific link to a published version. Customer feedback is saved to this deal. Creating a link does not send an email.</p><form data-sales-form="share-proposal" data-deal="${esc(deal.id)}"><label class="full">Published version<select name="proposalId">${[...deal.proposals].reverse().map(proposal=>`<option value="${esc(proposal.id)}">Proposal V${proposal.version} · ${date(proposal.published_at)}</option>`).join('')}</select></label><label>Reviewer name<input name="recipientName" required maxlength="150" placeholder="e.g. Alex Morgan"></label><label>Reviewer email (optional)<input name="recipientEmail" type="email" maxlength="254" placeholder="alex@company.com"></label><label>Link expires<select name="expiresInDays"><option value="7">In 7 days</option><option value="30" selected>In 30 days</option><option value="90">In 90 days</option></select></label><div class="full"><button type="submit" class="primary">Create review link</button></div></form>
  ${createdShare?`<div class="sw-share-result" role="status"><strong>Review link ready</strong><p>This link opens Proposal V${deal.proposals.find(p=>p.id===createdShare.proposalId)?.version||'—'} for ${esc(createdShare.recipientName||'your reviewer')}. Anyone with the link can review as this recipient. Create a separate link for each reviewer.</p><a href="${esc(createdShare.url)}" target="_blank" rel="noopener">Open customer review ${icon('arrow')}</a><div class="sales-actions">${action('copy-share','Copy link',deal,null,'secondary')}</div><input id="created-review-link" aria-label="Customer review link" readonly value="${esc(new URL(createdShare.url,location.origin).href)}"></div>`:''}
  <h2>Reviewer access</h2><p class="fine-print">Existing links cannot be reopened from this list. Create a new link to share again; revoke the old link when it is no longer needed.</p><table class="sw-share-list"><thead><tr><th>Reviewer</th><th>Proposal</th><th>Expires</th><th>Access</th></tr></thead><tbody>${shareRecords.map(item=>`<tr><td>${esc(item.recipientName||item.recipient_name)}${item.recipientEmail?`<small>${esc(item.recipientEmail)}</small>`:''}</td><td>V${deal.proposals.find(p=>p.id===(item.proposalId||item.proposal_id))?.version||'—'}</td><td>${date(item.expiresAt||item.expires_at)}</td><td><span class="fine-print">${item.revokedAt||item.revoked_at?'Revoked':new Date(item.expiresAt||item.expires_at)<new Date()?'Expired':'Active'}</span><div class="sales-actions">${action('share-again','Create a new link',deal,null,'text-button',`data-item="${esc(item.id)}"`)}${item.revokedAt||item.revoked_at?'':action('revoke-share','Revoke',deal,null,'text-button',`data-item="${esc(item.id)}"`)}</div></td></tr>`).join('')||'<tr><td colspan="4">No recipient links yet.</td></tr>'}</tbody></table></section>`;
}
async function openShare(deal) {
  if(!service){error='Customer links require the workspace service.';redraw();return;}
  shareDealId=deal.id;composeDealId=null;createdShare=null;shareRecords=[];error='';redraw();
  try{const result=await requestJSON(`/pac-machinery-demo/api/shares?dealId=${encodeURIComponent(deal.id)}`);shareRecords=Array.isArray(result)?result:result.shares||[];redraw();}catch(err){error=err.message;redraw();}
}
async function submitShare(form,data,deal) {
  const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Creating link…';
  try{const input={dealId:deal.id,proposalId:data.proposalId,recipientName:data.recipientName,recipientEmail:data.recipientEmail,expiresInDays:Number(data.expiresInDays)};const signature=JSON.stringify(input);if(form.dataset.signature!==signature){form.dataset.signature=signature;form.dataset.request=crypto.randomUUID();}createdShare={...await requestJSON('/pac-machinery-demo/api/shares',{method:'POST',body:{...input,requestId:form.dataset.request}}),...input};const result=await requestJSON(`/pac-machinery-demo/api/shares?dealId=${encodeURIComponent(deal.id)}`);shareRecords=Array.isArray(result)?result:result.shares||[];error='';redraw();}
  catch(err){error=err.message;button.disabled=false;button.textContent='Create review link';const errorBox=document.createElement('p');errorBox.setAttribute('role','alert');errorBox.textContent=err.message;form.append(errorBox);}
}

function dismissSelection() {
  const previous=pendingSelection;
  pendingSelection=null;
  redraw();
  if(previous)document.getElementById(`sales-action-select-option-${previous.dealId}-${previous.quoteId}-${previous.rowIndex}`)?.focus();
}

function revealQuoteInspector() {
  if (!globalThis.matchMedia?.('(max-width: 1000px)').matches) return;
  const panel=document.querySelector('.mw-layout > .mw-inspector');
  if(panel){panel.setAttribute('tabindex','-1');panel.scrollIntoView({block:'start',behavior:'instant'});panel.focus({preventScroll:true});}
}

export function handleClick(event) {
  // A link inside a selectable row owns its navigation.
  if(event.target.closest('a[href]')&&!event.target.closest('a[data-sales-action]')) return false;
  const el=event.target.closest('[data-sales-action]');
  if(!el) return false;
  event.preventDefault();
  const name=el.dataset.salesAction;
  if(name==='close-reprice'){repricePreview=null;redraw();return true;}
  if(name==='close-composer'){composeDealId=null;error='';redraw();return true;}
  if(name==='close-share'){shareDealId=null;createdShare=null;error='';redraw();return true;}
  if(name==='copy-share'){const input=document.getElementById('created-review-link');navigator.clipboard.writeText(input.value).then(()=>notify('Customer review link copied.')).catch(()=>{input.select();notify('Select and copy the review link.');});return true;}
  if(name==='share-again'){const record=shareRecords.find(item=>item.id===el.dataset.item),form=document.querySelector('[data-sales-form="share-proposal"]');if(record&&form){for(const [key,value] of Object.entries({proposalId:record.proposalId||record.proposal_id,recipientName:record.recipientName||record.recipient_name,recipientEmail:record.recipientEmail||record.recipient_email||''}))form.elements.namedItem(key).value=value;form.scrollIntoView({block:'center',behavior:'instant'});form.elements.namedItem('recipientName').focus();notify('Reviewer details restored. Create a new link when ready; the previous link is unchanged.');}return true;}
  if(name==='revoke-share'){void requestJSON(`/pac-machinery-demo/api/shares/${encodeURIComponent(el.dataset.item)}`,{method:'DELETE'}).then(()=>openShare(dealById(el.dataset.deal))).catch(err=>{error=err.message;redraw();});return true;}
  if(name==='hub-view'){captureFormDrafts();hubView=el.dataset.view==='quotes'?'quotes':'deals';error='';redraw();return true;}
  if(name==='discard-form-edits'){discardContextEdits();return true;}
  if(name==='new-demo'){mutate(candidate=>S.createDemoScenario(catalog,candidate),'New demo deal created. Your previous deals are preserved.',d=>`#deal/${d.id}`,d=>{activeQuoteIds[d.id]=d.quotes[1].id;activeDealId=d.id;},{command:'createDemoScenario'});return true;}
  if(name==='new-deal'){catalogIntakeDraft=null;showNewDeal=!showNewDeal;error='';redraw();return true;}
  if(name==='export-browser-backup'){
    const saved={format:'pac-browser-recovery-v1',exportedAt:new Date().toISOString(),workspace:localStorage.getItem(STORE),formEdits:localStorage.getItem(FORM_STORE),quoteEdits:localStorage.getItem(QUOTE_EDIT_STORE),catalogDrafts:localStorage.getItem('pac-machinery-demo.pac.rollbag.drafts.v1'),activeDraft:localStorage.getItem('pac-machinery-demo.pac.rollbag.active.v1')};
    if(!Object.values(saved).slice(2).some(Boolean)){notify('No previous browser data was found in this browser.');return true;}
    const url=URL.createObjectURL(new Blob([JSON.stringify(saved,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='pac-previous-browser-data.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Previous browser data exported unchanged. It has not been imported into the shared workspace.');return true;
  }
  if(name==='export-workspace'){const exported=storageBlocked?{format:'pac-workspace-recovery-v1',original_saved_workspace:originalWorkspaceRaw,original_form_edits:originalFormsRaw,unapplied_forms:[...pendingForms]}:{...state,unapplied_forms:[...pendingForms]};const blob=new Blob([JSON.stringify(exported,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=storageBlocked?'pac-workspace-recovery.json':'pac-sales-workspace.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(storageBlocked?'Original saved data and retained edits exported for recovery.':'Workspace and retained form edits exported.');return true;}
  if(name==='print-proposal'){window.print();return true;}
  if(name==='load-video'){videoLoaded=true;redraw();return true;}
  const deal=dealById(el.dataset.deal),quote=el.dataset.quote?quoteById(deal,el.dataset.quote):null;
  if(name==='edit-customer-decision'){composeDealId=null;shareDealId=null;showDealDetails=true;navigate(`#deal/${deal.id}`);return true;}
  if(name==='share-proposal'){void openShare(deal);return true;}
  if(name==='preview-reprice'){void requestJSON(`/pac-machinery-demo/api/quotes/${encodeURIComponent(deal.id)}/${encodeURIComponent(quote.id)}/reprice`).then(preview=>{repricePreview=preview;redraw();}).catch(err=>{error=err.message;redraw();});return true;}
  if(name==='apply-reprice'&&repricePreview){const acceptedCatalogVersion=repricePreview.catalogVersion;mutateQuote(deal,quote,()=>null,'Current catalog applied. Review this draft again.',null,()=>{repricePreview=null;},{command:'repriceQuote',args:{acceptedCatalogVersion}});return true;}

  if(name==='duplicate-quote'){mutateQuote(deal,quote,(d,q)=>S.duplicateQuote(catalog,d,q,{label:`${q.label} — copy`},role),'Alternative duplicated as an unapproved draft.',q=>`#quote/${deal.id}/${q.id}/working`,null,{command:'duplicateQuote',args:{label:`${quote.label} — copy`}});return true;}
  if(name==='mark-presented'){mutateQuote(deal,null,d=>S.markProposalPresented(d,el.dataset.proposal,{actor:service?.user.name||'Sales',role}),'Presentation recorded.',null,null,{command:'markProposalPresented',args:{proposalId:el.dataset.proposal}});return true;}

  if(name==='deal-tab'){captureFormDrafts();dealTabs[deal.id]=el.dataset.tab;error='';redraw();return true;}
  if(name==='select-quote'){activeQuoteIds[deal.id]=quote.id;closedDealInspectors.delete(deal.id);redraw();return true;}
  if(name==='close-deal-inspector'){closedDealInspectors.add(deal.id);redraw();return true;}
  if(name==='add-alternative'){showAddAlternative=!showAddAlternative;redraw();return true;}
  if(name==='deal-details'){showDealDetails=!showDealDetails;redraw();return true;}
  if(name==='select-line'){selectedLines[quote.id]=el.dataset.line;quotePanels[quote.id]='line';redraw();revealQuoteInspector();return true;}
  if(name==='open-options'){quotePanels[quote.id]='catalog';redraw();revealQuoteInspector();return true;}
  if(name==='close-quote-panel'){const catalogPanel=quotePanels[quote.id]==='catalog',lineId=selectedLines[quote.id];quotePanels[quote.id]='closed';redraw();const source=document.getElementById(`sales-action-${catalogPanel?'open-options':'select-line'}-${deal.id}-${quote.id}-${catalogPanel?'':lineId||quote.working.draft.lines[0]?.quote_line_id}`);source?.focus?.();return true;}
  if(name==='save-quote'){saveQuoteChanges(deal,quote);return true;}
  if(name==='discard-quote-edits'){quoteEdits.delete(quote.id);persistQuoteEdits();error='';redraw();notify('Configuration edits discarded. Saved quote restored.');return true;}
  if(name==='quote-tab'){captureFormDrafts();quoteTabs[quote.id]=el.dataset.tab;error='';redraw();return true;}
  if(name==='proposal-alternative'){captureFormDrafts();proposalAlternatives[deal.id]=el.dataset.alternative;if(S.findQuote(deal,el.dataset.alternative))activeQuoteIds[deal.id]=el.dataset.alternative;error='';redraw();return true;}
  if(name==='scroll-section'){document.getElementById(el.dataset.section)?.scrollIntoView({behavior:'smooth',block:'start'});return true;}
  if(name==='choose-alternative') mutateQuote(deal,quote,(d,q)=>S.chooseAlternative(d,q.id,el.dataset.proposal),'Preference saved for this proposal version.',null,null,{command:'chooseAlternative',args:{proposalId:el.dataset.proposal}});
  if(name==='revise') mutateQuote(deal,quote,(d,q)=>S.reviseQuote(d,q,'Updated after the customer proposal discussion.'),'New working revision created. Published proposals are preserved.',q=>`#quote/${deal.id}/${q.id}/working`,()=>{selectedRevision[quote.id]='working';quoteTabs[quote.id]='configuration';},{command:'reviseQuote',args:{note:'Updated after the customer proposal discussion.'}});
  if(name==='publish-proposal'){composeDealId=deal.id;shareDealId=null;error='';redraw();return true;}
  if(name==='revise-response') mutateQuote(deal,null,d=>S.reviseFromResponse(d,el.dataset.response,el.dataset.targetQuote),'Working revision created from the customer request.',q=>`#quote/${deal.id}/${q.id}`,q=>{selectedRevision[q.id]='working';quoteTabs[q.id]='configuration';},{command:'reviseFromResponse',args:{responseId:el.dataset.response,quoteId:el.dataset.targetQuote}});
  if(name==='select-option'){
    const index=Number(el.dataset.row),row=catalog.priceLines[index];
    try { const plan=C.planSelection(catalog,quoteEdits.get(quote.id)?.working.draft||quote.working.draft,row);if(plan.blocked)throw new Error(plan.reviewReasons.join(' '));if(plan.additions.length>1 || plan.reviewReasons.length){pendingSelection={dealId:deal.id,quoteId:quote.id,plan,rowIndex:index};redraw();}else {const entry=stageChange(deal,quote,(d,q)=>S.selectOption(catalog,d,q,row),null,{render:false});if(entry){selectedLines[quote.id]=entry.working.draft.lines.find(l=>l.name===row.name)?.quote_line_id;quotePanels[quote.id]='line';redraw();notify('Option added to this draft. Save changes when ready.');}} } catch(err){error=err.message;redraw();}
  }
  if(name==='cancel-selection')dismissSelection();
  if(name==='confirm-selection'){const row=catalog.priceLines[Number(el.dataset.row)];const entry=stageChange(deal,quote,(d,q)=>S.selectOption(catalog,d,q,row),null,{render:false});if(entry){pendingSelection=null;selectedLines[quote.id]=entry.working.draft.lines.find(l=>l.name===row.name)?.quote_line_id;quotePanels[quote.id]='line';redraw();notify('Option and required companion added. Save changes when ready.');}}
  if(name==='remove-option') stageChange(deal,quote,(d,q)=>S.removeOption(catalog,d,q,el.dataset.line),'Option removed from the draft. Save changes when ready.');
  if(name==='remove-engineering') mutateQuote(deal,quote,(d,q)=>S.removeEngineering(d,q,el.dataset.item),'Engineering requirement removed.',null,null,{command:'removeEngineering',args:{itemId:el.dataset.item}});
  if(name==='remove-special') mutateQuote(deal,quote,(d,q)=>S.removeSpecial(d,q,el.dataset.item),'Special-order item removed.',null,null,{command:'removeSpecial',args:{itemId:el.dataset.item}});
  if(name==='submit-review'){mutateQuote(deal,quote,(d,q)=>{requireAppliedForms(d,q);return S.submitQuoteReview(catalog,d,q,el.dataset.review,role,service?.user);},'Revision submitted to the review team.',null,null,{command:'submitQuoteReview',args:{kind:el.dataset.review}});return true;}
  if(name==='review') mutateQuote(deal,quote,(d,q)=>{requireAppliedForms(d,q);return S.reviewQuote(catalog,d,q,el.dataset.review,role);},`${titleCase(el.dataset.review)} review recorded for this revision.`,null,null,{command:'reviewQuote',args:{kind:el.dataset.review}});
  if(name==='issue') mutateQuote(deal,quote,(d,q)=>{requireAppliedForms(d,q);return S.issueQuote(catalog,d,q,role);},'Quote revision issued. Publish a new proposal version from the deal to present it.',null,null,{command:'issueQuote'});
  return true;
}

export function handleSubmit(event) {
  const form=event.target.closest('[data-sales-form]');
  if(!form)return false;
  event.preventDefault();
  const name=form.dataset.salesForm, data=Object.fromEntries(new FormData(form));
  const deal=form.dataset.deal?dealById(form.dataset.deal):null, quote=form.dataset.quote?quoteById(deal,form.dataset.quote):null;
  if(quote&&['engineering','labor-rate','special','discount','line-price','reset-line-price'].includes(name)&&quoteEdits.has(quote.id)){error='Save or discard the configuration changes before applying another form.';redraw();return true;}
  if(['line-price','reset-line-price'].includes(name)) {
    if(!showPrices){error='Show prices before applying a selling-price change. Your entries are retained.';redraw();return true;}
    const reset=name==='reset-line-price',command=reset?'clearLinePriceOverride':'setLinePriceOverride',input={reason:data.reason,...(!reset?{price_usd:data.price_usd}:{})};
    submitFormMutation(form,(d,q)=>S[command](catalog,d,q,form.dataset.item,input,role),reset?'Catalog price restored. Review this revision again.':'Selling price saved. Review this revision again.',null,{command,args:{dealId:deal.id,quoteId:quote.id,lineId:form.dataset.item,input}});return true;
  }
  if(name==='compose-proposal'){const values=new FormData(form);const manifest=values.getAll('quote').map(quote_id=>({quote_id,revision:Number(values.get(`revision-${quote_id}`))}));mutateQuote(deal,null,d=>S.publishProposal(d,manifest),'Customer proposal published.',proposal=>`#present/${deal.id}/${proposal.id}`,()=>{composeDealId=null;},{command:'publishProposal',args:{manifest}});return true;}
  if(name==='edit-customer-decision'){composeDealId=null;shareDealId=null;showDealDetails=true;navigate(`#deal/${deal.id}`);return true;}
  if(name==='share-proposal'){void submitShare(form,data,deal);return true;}
  if(name==='return-review'){if(quoteEdits.has(quote.id)){error='Save configuration changes before returning this review.';redraw();return true;}submitFormMutation(form,(d,q)=>S.requestQuoteChanges(catalog,d,q,form.dataset.item,data.reason,role,service?.user),'Review returned to the quote owner with your reason.',null,{command:'requestQuoteChanges',args:{dealId:deal.id,quoteId:quote.id,kind:form.dataset.item,reason:data.reason}});return true;}
  if(name==='response-reply'){const input={body:data.body,author:service?.user.name||titleCase(role),role};submitFormMutation(form,d=>S.replyToResponse(d,form.dataset.response,input),'Reply saved.',null,{command:'replyToResponse',args:{dealId:deal.id,responseId:form.dataset.response,input}});return true;}
  if(name==='response-status'){const input={status:data.status,reason:data.reason,author:service?.user.name||titleCase(role),role};submitFormMutation(form,d=>S.setResponseStatus(d,form.dataset.response,input),'Discussion status updated.',null,{command:'setResponseStatus',args:{dealId:deal.id,responseId:form.dataset.response,status:data.status,reason:data.reason}});return true;}
  if(name==='rename-quote'){submitFormMutation(form,(d,q)=>S.renameQuote(d,q,data.label,role),'Alternative renamed.',null,{command:'renameQuote',args:{dealId:deal.id,quoteId:quote.id,label:data.label}});return true;}
  if(name==='add-contact'){const contacts=[...(deal.contacts||[]),{name:data.name,email:data.email,phone:data.phone,title:data.title}];submitFormMutation(form,d=>S.updateContacts(d,contacts,role),'Contact saved.',null,{command:'updateContacts',args:{dealId:deal.id,contacts}});return true;}

  if(name==='search'){search=data.search;redraw();return true;}
  if(name==='option-search'){optionSearch=data.search;redraw();return true;}
  if(name==='new-deal') submitFormMutation(form,(_d,_q,candidate)=>S.createDeal(candidate,{...data,scope:{application:data.application,bag_dimensions:data.bag_dimensions,throughput:data.throughput}}),'Deal created. Add the first quote alternative.',d=>catalogIntakeDraft?`#catalog-start/${catalogIntakeDraft.machine_id}`:`#deal/${d.id}`,{command:'createDeal',args:{input:{...data,scope:{application:data.application,bag_dimensions:data.bag_dimensions,throughput:data.throughput}}}});
  if(name==='add-quote') submitFormMutation(form,d=>S.addQuote(catalog,d,data),'Quote alternative created.',q=>`#quote/${deal.id}/${q.id}`,{command:'addQuote',args:{dealId:deal.id,input:data}});
  if(name==='scope') submitFormMutation(form,d=>S.updateScope(d,data),'Application scope saved. Open drafts require review again.',null,{command:'updateScope',args:{dealId:deal.id,input:data}});
  if(name==='deal-details') submitFormMutation(form,d=>S.updateDeal(d,data),'Deal details and next action saved.',null,{command:'updateDeal',args:{dealId:deal.id,input:data}});
  if(name==='engineering'){
    if(!form.dataset.item&&role!=='sales'&&!showPrices){error='Show prices before adding a new engineering requirement. Your unapplied entries are retained.';redraw();return true;}
    const input={description:data.description,reason:data.reason,option_id:data.option_id||null,...(form.dataset.item?{id:form.dataset.item}:{})};
    if(role!=='sales'&&showPrices){input.hours=data.hours===''?null:Number(data.hours);input.materials=data.materials===''?null:Number(data.materials);}
    submitFormMutation(form,(d,q)=>S.saveEngineering(d,q,input,role),'Engineering requirement saved.',null,{command:'saveEngineering',args:{dealId:deal.id,quoteId:quote.id,input}});
  }
  if(name==='labor-rate') submitFormMutation(form,(d,q)=>S.setLaborRate(d,q,Number(data.labor_rate),role),'Assumed labor rate updated. Engineering review is required again.',null,{command:'setLaborRate',args:{dealId:deal.id,quoteId:quote.id,rate:Number(data.labor_rate)}});
  if(name==='special'){const previous=quote.working.special.find(item=>item.id===form.dataset.item),input={...(form.dataset.item?{id:form.dataset.item}:{}),description:data.description,price:showPrices?Number(data.price):previous?.price,lead_time:data.lead_time};submitFormMutation(form,(d,q)=>S.saveSpecial(d,q,input),'Special-order scope and lead-time condition saved.',null,{command:'saveSpecial',args:{dealId:deal.id,quoteId:quote.id,input}});}
  if(name==='discount') submitFormMutation(form,(d,q)=>S.updateDiscount(d,q,{amount:Number(data.amount),reason:data.reason}),'Discount request saved.',null,{command:'updateDiscount',args:{dealId:deal.id,quoteId:quote.id,input:{amount:Number(data.amount),reason:data.reason}}});
  if(name==='comment'){const [quote_id,revision]=String(data.quote_ref).split('|');submitFormMutation(form,d=>data.proposal_id?S.recordCustomerResponse(d,{proposal_id:data.proposal_id,kind:data.kind||'question',author:data.author,body:data.body,quote_id:quote_id||undefined}):S.recoverLegacyComment(d,{author:data.author,body:data.body,quote_id,revision:Number(revision)}),'Feedback saved against this proposal version.',null,{command:data.proposal_id?'recordCustomerResponse':'recoverLegacyComment',args:{dealId:deal.id,input:{proposal_id:data.proposal_id,kind:data.kind||'question',body:data.body,quote_id:quote_id||undefined,revision:Number(revision),author:data.author}}});}
  return true;
}

export function handleChange(event) {
  const el=event.target.closest('[data-sales-change]');
  if(!el)return false;
  const name=el.dataset.salesChange;
  if(name==='proposal-version'){captureFormDrafts();error='';navigate(`#present/${el.dataset.deal}/${el.value}`);}
  if(name==='role'){if(!service)role=el.value;error='';redraw();}
  if(name==='prices'){captureFormDrafts();showPrices=el.checked;redraw();}
  if(name==='stage-filter'){stageFilter=el.value;redraw();}
  if(name==='quote-status'){quoteStatusFilter=el.value;redraw();}
  if(name==='option-category'){optionCategory=el.value;redraw();}
  if(name==='quote-switch'){optionSearch='';navigate(`#quote/${el.dataset.deal}/${el.value}`);}
  if(name==='revision'){selectedRevision[el.dataset.quote]=el.value;error='';navigate(`#quote/${rendered.id}/${el.dataset.quote}/${el.value}`);}
  if(name==='quantity'){const deal=dealById(el.dataset.deal),quote=quoteById(deal,el.dataset.quote);stageChange(deal,quote,(d,q)=>S.setQuoteQuantity(catalog,d,q,el.dataset.line,Number(el.value)),'Quantity updated in this draft.');}
  return true;
}

export function handleInput(event) {
  const el=event.target.closest('[data-sales-edit]');
  if(!el)return false;
  if(el.dataset.salesEdit==='revision-note'){
    const deal=dealById(el.dataset.deal),quote=quoteById(deal,el.dataset.quote);
    stageChange(deal,quote,(_d,q)=>{q.working.editor_note=el.value;q.working.approvals={};},null,{render:false});
  }
  return true;
}
export function refreshExternalWorkspace() {
  if(service){if(saving)return;return service.refresh().then(response=>{captureFormDrafts();state=S.migrateWorkspace(response.state);role=service.user.role;redraw();}).catch(err=>{storageWarning=err.message;redraw();});}
  try {const raw=localStorage.getItem(STORE);if(raw&&raw!==lastSavedRaw){state=S.migrateWorkspace(JSON.parse(raw));lastSavedRaw=raw;redraw();}}
  catch {storageWarning='A workspace update could not be read. Your current edits are retained.';redraw();}
}

export function prepareSessionExit(){captureFormDrafts();persistQuoteEdits();}

export function updateCatalog(nextCatalog){catalog=nextCatalog;}

export function acceptExternalState(envelope){state=S.migrateWorkspace(envelope.state);if(service)service.accept(envelope);}
