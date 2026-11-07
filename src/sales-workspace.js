import * as C from './catalog.js';
import * as S from './sales-domain.js';
import { renderDealExplorer, mountDealExplorer } from './deal-explorer.js';

const STORE = 'pac.rollbag.sales.v1';
const FORM_STORE = 'pac.rollbag.sales.form-edits.v1';
const CONTEXT_STORE = 'pac.rollbag.sales.context.v1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => Number.isFinite(value) ? new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(value)) : 'Price pending';
const titleCase = value => String(value || '').replace(/_/g,' ').replace(/^./, c => c.toUpperCase());
const date = value => { if(!value)return 'Not recorded'; const normalized=/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00`:value; const parsed=new Date(normalized); return Number.isNaN(parsed.getTime())?'Not recorded':parsed.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); };
const stages = ['discovery','configuring','review','presented','won','lost'];
const roles = ['sales','engineering','manager'];
let catalog, state, callbacks = {}, role = 'sales', showPrices = true;
let search = '', stageFilter = 'all', showNewDeal = false, optionSearch = '', optionCategory = 'all';
let selectedRevision = {}, error = '', storageWarning = '', pendingSelection = null;
let fieldSequence = 0, videoLoaded = false;
let rendered = {}, explorerCleanup = null, mountedExplorer = null;
let hubView = 'deals', quoteStatusFilter = 'all', activeDealId = null;
const activeQuoteIds = {};
const quoteTabs = {}, proposalAlternatives = {};
let pendingForms = new Map();
const formBaselines = new WeakMap();

export function init(sourceCatalog, host = {}) {
  catalog = sourceCatalog;
  callbacks = host;
  try { const forms=JSON.parse(localStorage.getItem(FORM_STORE)||'[]'); pendingForms=new Map(Array.isArray(forms)?forms.filter(entry=>Array.isArray(entry)&&typeof entry[0]==='string'&&entry[1]?.values&&typeof entry[1].values==='object'):[]); } catch { pendingForms=new Map(); }
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && saved.version === 1 && Array.isArray(saved.deals)) state = saved;
    else if (saved) { state = S.seedWorkspace(catalog); storageWarning = 'An older workspace could not be opened. This demonstration uses a fresh sample; the previous saved data has not been overwritten.'; }
    else { state = S.seedWorkspace(catalog); persist(); }
  } catch {
    state = S.seedWorkspace(catalog);
    storageWarning = 'Browser storage is unavailable or the saved workspace could not be read. Export this workspace before closing.';
  }
  try{const context=JSON.parse(localStorage.getItem(CONTEXT_STORE)||'null');if(S.findDeal(state,context?.dealId)){activeDealId=context.dealId;for(const [dealId,quoteId] of Object.entries(context.quoteIds||{})){if(S.findQuote(S.findDeal(state,dealId),quoteId))activeQuoteIds[dealId]=quoteId;}}}catch{}
  pendingForms=new Map([...pendingForms].map(([key,entry])=>{if(entry?.name!=='comment'||!entry.values?.quote_ref)return [key,entry];const [quoteId,revision]=entry.values.quote_ref.split('|');const suffix=`|${quoteId}|${revision}`;const normalized=key.endsWith(suffix)?key.slice(0,-suffix.length)+`|${quoteId}`:key;return [normalized,{...entry,key:normalized}];}));
  const previousCount=pendingForms.size;pendingForms=new Map([...pendingForms].filter(([,entry])=>validPendingEntry(entry)).slice(-64));
  if(previousCount!==pendingForms.size)storageWarning='Some retained form edits no longer match an editable deal revision and were not restored. Saved quotes are unchanged.';
}

export const handles = view => ['demo','present','workspace','deal','quote','deal-explorer'].includes(view);
export const getWorkspace = () => JSON.parse(JSON.stringify(state));
export const firstDealId = () => state?.deals?.[0]?.id;
export const currentDealId = () => S.findDeal(state,activeDealId) ? activeDealId : firstDealId();
export const currentQuoteId = (dealId=currentDealId()) => {const deal=S.findDeal(state,dealId);return S.findQuote(deal,activeQuoteIds[dealId])?.id || deal?.quotes[0]?.id;};
export function attachCatalogDraft(savedDraft, dealId=currentDealId(), label) {
  const deal=dealById(dealId);
  if(!deal){notify('Create a deal before attaching a catalog configuration.');navigate('#workspace');return null;}
  return mutate(()=>S.importDraft(catalog,deal,savedDraft,label || `${savedDraft.machine_title} · Imported configuration`),'Catalog configuration attached as a draft alternative. Complete its application review before issue.',q=>`#quote/${deal.id}/${q.id}`);
}


const RETAINED_FORMS=new Set(['new-deal','add-quote','scope','deal-details','engineering','labor-rate','special','discount','comment']);
function validPendingEntry(entry) {
  if(!entry||!RETAINED_FORMS.has(entry.name)||!entry.values||Array.isArray(entry.values)||typeof entry.values!=='object')return false;
  const fields=Object.entries(entry.values);
  if(fields.length>24||fields.some(([key,value])=>!/^[-a-zA-Z0-9_]+$/.test(key)||['__proto__','constructor','prototype'].includes(key)||typeof value!=='string'||value.length>12000))return false;
  if(entry.name==='new-deal')return !entry.dealId&&!entry.quoteId;
  const deal=S.findDeal(state,entry.dealId);if(!deal)return false;
  if(entry.quoteId){const q=S.findQuote(deal,entry.quoteId);if(!q||q.working.revision!==entry.revision||q.working.status!=='draft')return false;const itemId=entry.itemId||(entry.key?.split('|')[4]!=='new'?entry.key?.split('|')[4]:null);if(entry.name==='engineering'&&itemId&&!q.working.engineering.some(item=>item.id===itemId))return false;}
  if(entry.name==='comment'&&entry.values.quote_ref){const [id,revision]=entry.values.quote_ref.split('|');const q=S.findQuote(deal,id);if(!q?.revisions.some(r=>r.revision===Number(revision)))return false;}
  return true;
}
function persistFormDrafts() {
  try {const entries=[...pendingForms].filter(([,entry])=>validPendingEntry(entry)).slice(-64);const serialized=JSON.stringify(entries);if(serialized.length>750000)throw new Error('Form edit storage limit');localStorage.setItem(FORM_STORE,serialized);}
  catch {storageWarning='Unapplied form edits are retained in this window, but could not be saved for reload. Save or discard them before closing.';}
}
function formIdentity(form) {
  const name=form.dataset.salesForm;if(!RETAINED_FORMS.has(name))return null;
  const dealId=form.dataset.deal||'',quoteId=form.dataset.quote||'';
  const quote=quoteId?S.findQuote(S.findDeal(state,dealId),quoteId):null;
  const revision=quote?.working.revision??null;
  const pricingRole=['engineering','labor-rate'].includes(name)?(form.dataset.retainRole||role):'shared';
  const key=[name,dealId,quoteId,revision??'',form.dataset.item||'new',pricingRole,form.dataset.commentContext||''].join('|');
  return {key,name,dealId,quoteId,revision,itemId:form.dataset.item||null};
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
    if(['demo','present'].includes(rendered.view))return entry.name==='comment';
    if(rendered.view==='quote')return !entry.quoteId||entry.quoteId===rendered.qid;
    return true;
  });
}
function pendingQuoteForms(deal,quote) {return [...pendingForms.values()].filter(entry=>validPendingEntry(entry)&&entry.dealId===deal.id&&((entry.quoteId===quote.id&&entry.revision===quote.working.revision)||(!entry.quoteId&&['scope','deal-details'].includes(entry.name))));}
function requireAppliedForms(deal,quote) {
  captureFormDrafts();
  if(pendingQuoteForms(deal,quote).length)throw new Error('Save or discard the unapplied quote and deal form edits before reviewing or issuing this revision.');
}
function unsavedNote() {
  const count=pendingForContext().length;
  return `<div id="winter-unsaved-note" class="winter-unsaved-note no-print" ${count?'':'hidden'}><div><strong>Unapplied form edits</strong><span data-unsaved-message>${count} form${count===1?'':'s'} retained in this browser. Submit each form to apply its changes.</span></div>${action('discard-form-edits','Discard edits',null,null,'text-button')}</div>`;
}
function updatePendingNotice() {
  const note=document.getElementById('winter-unsaved-note'),count=pendingForContext().length;
  if(note){note.hidden=!count;const message=note.querySelector('[data-unsaved-message]');if(message)message.textContent=`${count} form${count===1?'':'s'} retained in this browser. Submit each form to apply its changes.`;}
  if(rendered.view==='quote'){
    const deal=dealById(rendered.id),quote=deal&&quoteById(deal,rendered.qid);
    if(quote&&quote.working.status==='draft'){
      const blocked=pendingQuoteForms(deal,quote).length>0;
      for(const button of document.querySelectorAll('[data-sales-action="review"]'))button.disabled=blocked;
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
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    const controls=[...list.querySelectorAll('[role="tab"]')];const at=controls.indexOf(event.target);if(at<0)return;
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?controls.length-1:(at+(event.key==='ArrowRight'?1:-1)+controls.length)%controls.length;controls[next].click();
    const fresh=[...document.querySelectorAll(`[role="tablist"][aria-label="${list.getAttribute('aria-label')}"] [role="tab"]`)];fresh[next]?.focus();
  });
  updatePendingNotice();
}
function submitFormMutation(form,fn,message,hash) {
  const info=formIdentity(form);
  return mutate(()=>{const result=fn();if(info){const submitted=formValues(form),previous=pendingForms.get(info.key);const unapplied=previous&&Object.keys(previous.values).some(key=>!Object.prototype.hasOwnProperty.call(submitted,key));if(unapplied)pendingForms.set(info.key,{...previous,values:{...previous.values,...submitted}});else pendingForms.delete(info.key);formBaselines.set(form,submitted);persistFormDrafts();}return result;},message,hash);
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
function notify(text) { callbacks.toast?.(text); }
function redraw() { callbacks.render?.(); }
function navigate(hash) { if (location.hash === hash) redraw(); else location.hash = hash; }
function mutate(fn, message, hash) {
  try { const result = fn(); error = ''; persist(); if (hash) navigate(typeof hash === 'function' ? hash(result) : hash); else redraw(); if (message) notify(message); return result; }
  catch (err) { error = err.message || 'This change could not be saved.'; redraw(); document.querySelector('.sales-error')?.focus(); return null; }
}
function firstDeal() { return state.deals[0]; }
function dealById(id) { return S.findDeal(state, id || firstDeal()?.id); }
function quoteById(deal, id) { return S.findQuote(deal, id || deal.quotes[0]?.id); }
function attrs(deal, quote) { return `data-deal="${esc(deal.id)}"${quote ? ` data-quote="${esc(quote.id)}"` : ''}`; }
function action(name, label, deal, quote, kind = 'secondary', extra = '') { const unique=[...extra.matchAll(/data-(?:row|item|line|review|tab|view|alternative|slot|section)="([^"]+)"/g)].map(match=>match[1]).join('-'); return `<button id="sales-action-${esc([name,deal?.id||'global',quote?.id||'',unique].join('-'))}" type="button" class="${kind}" data-sales-action="${name}" ${deal ? attrs(deal,quote) : ''} ${extra}>${label}</button>`; }
function status(value) { return `<span class="sales-status ${esc(value)}">${esc(titleCase(value))}</span>`; }
function localNote() { return `<div class="sales-demo-note"><span class="sales-demo-dot" aria-hidden="true"></span><strong>Interactive demo</strong><span>Fictional customer · Catalog pricing · Saved in this browser</span></div>`; }
function pageHead(eyebrow, title, description, actions = '') { return `<div class="sales-pagehead"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${description ? `<p>${description}</p>` : ''}</div><div class="sales-actions">${actions}</div></div>`; }
function tabs(deal, selected) { return `<nav class="sales-tabs" aria-label="Deal navigation"><a href="#deal/${esc(deal.id)}" ${selected === 'deal' ? 'aria-current="page"' : ''}>Deal overview</a><a href="#quote/${esc(deal.id)}/${esc(currentQuoteId(deal.id) || '')}" ${selected === 'quote' ? 'aria-current="page"' : ''}>Configure & review</a><a href="#present/${esc(deal.id)}" ${selected === 'present' ? 'aria-current="page"' : ''}>Customer proposal</a><a href="#deal-explorer/${esc(deal.id)}" ${selected === 'deal-explorer' ? 'aria-current="page"' : ''}>3D evidence <span>${deal.evidence.length}</span></a></nav>`; }
function breadcrumbs(deal, last) { return `<div class="sales-breadcrumbs"><a href="#workspace">Sales workspace</a><span>/</span><a href="#deal/${esc(deal.id)}">${esc(deal.number)}</a>${last ? `<span>/</span><span>${esc(last)}</span>` : ''}</div>`; }
function field(label, name, value = '', {type = 'text', required = false, placeholder = '', full = false, min, step, disabled = false} = {}) {
  const id = `sales-${name}-${fieldSequence++}`;
  return `<div class="sales-field${full ? ' full' : ''}"><label for="${id}">${label}${required ? ' <span aria-hidden="true">*</span>' : ''}</label>${type === 'textarea' ? `<textarea id="${id}" name="${name}" rows="3" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''} placeholder="${esc(placeholder)}">${esc(value)}</textarea>` : `<input id="${id}" name="${name}" type="${type}" value="${esc(value)}" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''} placeholder="${esc(placeholder)}" ${min !== undefined ? `min="${min}"` : ''} ${step !== undefined ? `step="${step}"` : ''}>`}</div>`;
}
function select(label, name, choices, selected, extra = '') { const id = `sales-${name}-${fieldSequence++}`; return `<div class="sales-field"><label for="${id}">${label}</label><select id="${id}" name="${name}" ${extra}>${choices.map(([value,text]) => `<option value="${esc(value)}" ${String(selected) === String(value) ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></div>`; }
function price(value) { return showPrices ? money(value) : '<span class="sales-price-hidden">Hidden</span>'; }
function latest(quote) { return quote.revisions[quote.revisions.length - 1]; }
function readWorking(quote) { const chosen = selectedRevision[quote.id]; const current=quote.working.status==='issued' ? latest(quote) || quote.working : quote.working; return chosen === undefined || chosen === 'working' ? current : quote.revisions.find(x => String(x.revision) === String(chosen)) || current; }
function canEdit(quote) { return readWorking(quote) === quote.working && quote.working.status !== 'issued'; }
function modelPhoto(machineId, className = '') { const picture = C.machinePhotos(catalog,machineId)[0]; return picture ? `<img class="${className}" src="${esc(C.mediaUrl(catalog,picture))}" alt="${esc(C.getMachine(catalog,machineId)?.title?.text || machineId)} — PAC source photograph" loading="lazy">` : '<div class="sales-empty">Exact-model photograph pending PAC confirmation.</div>'; }
function snapshotPhoto(alternative) { return alternative.photo?.file ? `<img src="${esc(`${catalog.baseUrl || '/source'}/${alternative.photo.file}`)}" alt="${esc(alternative.machine_title)} — source photograph" loading="lazy">` : '<div class="sales-empty">Exact-model photograph pending.</div>'; }

export function render(view, id, qid) {
  if (!state) return '<main id="main" class="sales-main"><h1>Loading sales workspace…</h1></main>';
  captureFormDrafts();
  rendered = {view,id,qid};
  fieldSequence = 0;
  let content;
  try {
    if (view === 'workspace') content = workspace();
    else {
      const deal = view === 'demo' ? firstDeal() : dealById(id);
      if(deal){activeDealId=deal.id;const selected=quoteById(deal,qid||activeQuoteIds[deal.id]);if(selected&&(view==='quote'||qid))activeQuoteIds[deal.id]=selected.id;if(view==='quote'&&selected)rendered.qid=selected.id;try{localStorage.setItem(CONTEXT_STORE,JSON.stringify({dealId:activeDealId,quoteIds:activeQuoteIds}));}catch{}}
      if (!deal) content = `<div class="sales-empty"><h1>Deal not found</h1><p>This deal is not saved in this browser.</p><a class="primary" href="#workspace">Open sales workspace</a></div>`;
      else if (view === 'demo' || view === 'present') content = presentation(deal);
      else if (view === 'deal') content = dealView(deal);
      else if (view === 'quote') content = quoteView(deal, quoteById(deal,rendered.qid));
      else content = explorerView(deal,qid);
    }
  } catch (err) { content = `<div class="sales-empty"><h1>This workspace view could not be opened.</h1><p>${esc(err.message)}</p><a class="primary" href="#workspace">Return to workspace</a></div>`; }
  return `<main id="main" class="sales-main ${['demo','present'].includes(view) ? 'sales-presentation' : ''}">${storageWarning ? `<div class="sales-note warning">${esc(storageWarning)}</div>` : ''}${error ? `<div class="sales-error" role="alert" tabindex="-1"><strong>Change not saved</strong><p>${esc(error)}</p></div>` : ''}${unsavedNote()}${content}${pendingSelection ? selectionDialog() : ''}</main>`;
}


function presentation(deal) {
  const proposal=S.publicProposal(deal), alternatives=proposal.alternatives;
  let choice=proposalAlternatives[deal.id] || alternatives[0]?.quote_id || 'compare';
  if(choice!=='compare'&&!alternatives.some(a=>a.quote_id===choice))choice=alternatives[0]?.quote_id||'compare';
  const active=alternatives.find(a=>a.quote_id===choice), shown=active?[active]:alternatives;
  const comments=proposal.comments.filter(c=>!active||c.quote_id===active.quote_id);
  const feedback={...proposal,alternatives:shown,comments};
  const evidence=shown.flatMap(a=>a.evidence).filter((e,i,all)=>all.findIndex(other=>other.id===e.id)===i);
  const printHTML=printPresentation(deal).replace(/<form\b[\s\S]*?<\/form>/g,'').replace(/<button\b[\s\S]*?<\/button>/g,'').replace(/<iframe\b[\s\S]*?<\/iframe>/g,'').replace(/\sid="[^"]*"/g,'');
  return `<header class="winter-review-toolbar no-print"><a class="winter-review-brand" href="#demo" aria-label="PAC Machinery proposal"><img src="/assets/pac-machinery-logo.png" alt="PAC Machinery"></a><div class="winter-review-title"><strong>${esc(proposal.title)}</strong><span>${esc(proposal.number)} · ${esc(proposal.customer)}</span></div><div class="sales-actions">${action('print-proposal','Print / save PDF',deal,null,'secondary')}<a class="primary" href="#deal/${esc(deal.id)}">Open sales workspace</a></div></header>
  <div class="winter-review-layout"><div class="winter-document-pane"><div class="winter-review-selection"><nav class="winter-review-tabs" aria-label="Proposal alternative" role="tablist">${alternatives.map((a,index)=>action('proposal-alternative',`${String.fromCharCode(65+index)} · Rev ${a.revision}`,deal,{id:a.quote_id},choice===a.quote_id?'active':'',`data-alternative="${esc(a.quote_id)}" role="tab" aria-selected="${choice===a.quote_id}" tabindex="${choice===a.quote_id?'0':'-1'}"`)).join('')}${action('proposal-alternative','Compare',deal,null,choice==='compare'?'active':'',`data-alternative="compare" role="tab" aria-selected="${choice==='compare'}" tabindex="${choice==='compare'?'0':'-1'}"`)}</nav><span class="winter-review-version">Issued quote ${active?`${esc(active.number)} · Rev ${active.revision}`:'alternatives'}</span></div>
  ${!alternatives.length?`<div class="winter-document sales-empty"><h1>No issued quote</h1><p>Complete the configuration and required reviews, then issue a revision.</p><a class="primary" href="#deal/${esc(deal.id)}">Open deal</a></div>`:active?`<div class="winter-document"><div class="winter-document-identity"><div><span class="eyebrow">PAC MACHINERY · CUSTOMER PROPOSAL</span><h1>${esc(proposal.title)}</h1><p>Prepared for ${esc(active.customer || proposal.customer)}</p></div>${status('issued')}</div><div class="winter-document-photo">${snapshotPhoto(active)}<div><h2>${esc(active.machine_title)}</h2><p>${esc(active.label)}</p><span>${esc(active.number)} · Rev ${active.revision}</span><small>Source photograph. Refer to the selected configuration below.</small></div></div>${quoteDocument(active)}</div>`:`<div class="winter-document winter-comparison-document"><div class="winter-document-identity"><div><span class="eyebrow">PAC MACHINERY · ALTERNATIVES</span><h1>${esc(proposal.title)}</h1><p>Compare the issued configuration, price and delivery conditions.</p></div></div><div class="winter-compare-options">${alternatives.map((a,i)=>`<article><div class="winter-compare-photo">${snapshotPhoto(a)}</div><span class="eyebrow">ALTERNATIVE ${String.fromCharCode(65+i)}</span><h2>${esc(a.label)}</h2><p>${esc(a.machine_title)}</p><strong>${money(a.totals.total)}</strong><small>${esc(a.number)} · Rev ${a.revision}</small>${action('proposal-alternative','Review quote',deal,{id:a.quote_id},'secondary',`data-alternative="${esc(a.quote_id)}" data-slot="compare"`)}</article>`).join('')}</div>${comparison(alternatives)}</div>`}
  <section class="winter-review-evidence"><div class="winter-section-title"><h2>Application references</h2><span>${evidence.length} attached ${evidence.length===1?'reference':'references'}</span></div>${evidence.length?`<div class="sales-evidence-grid">${evidence.map(e=>evidenceCard(deal,e,true)).join('')}</div>`:'<p class="fine-print">The source machine photograph accompanies this quote. No additional inspection reference is attached to the issued revision.</p>'}<p class="fine-print">3D references use an illustrative assembly until PAC confirms a model. They are not PAC CAD or proof of application suitability.</p>${shown.some(a=>a.machine_id==='r3200')?equipmentVideo():''}</section></div>
  <aside class="winter-feedback-rail"><div class="winter-feedback-heading"><h2>Your feedback</h2><p>${esc(proposal.customer)}</p><span>${active?`${esc(active.label)} · Rev ${active.revision}`:'All issued alternatives'}</span></div><div class="winter-preview-note">Interactive demo · Feedback is saved in this browser.</div>${active?`<section class="winter-preference"><h3>Preferred configuration</h3>${action('choose-alternative',proposal.selected_quote_id===active.quote_id?'Preferred alternative':'Mark as preferred',deal,{id:active.quote_id},proposal.selected_quote_id===active.quote_id?'secondary':'primary',`aria-pressed="${proposal.selected_quote_id===active.quote_id}"`)}<p class="fine-print">A preference records the discussion; it is not an order or acceptance.</p></section>`:''}${proposalComments(deal,feedback)}<section class="winter-next-action"><h3>Next action</h3><p>${esc(deal.next_action||'Review the application and select a configuration.')}</p><dl><div><dt>Owner</dt><dd>${esc(deal.owner)}</dd></div><div><dt>Follow-up</dt><dd>${deal.next_action_date?date(deal.next_action_date):'To confirm'}</dd></div></dl></section></aside></div>
  <div class="winter-print-proposal">${printHTML}</div>`;
}

function printPresentation(deal) {
  const proposal = S.publicProposal(deal);
  const alternatives = proposal.alternatives || [];
  return `<div class="sales-topline no-print"><span class="eyebrow">01 · CUSTOMER PROPOSAL</span><div class="sales-actions">${action('print-proposal','Print / save PDF',deal,null,'secondary')}<a class="primary" href="#deal/${esc(deal.id)}">Open sales workspace <span>→</span></a></div></div>
  <section class="sales-proposal-hero"><div><div class="eyebrow">PREPARED FOR ${esc(proposal.customer).toUpperCase()}</div><h1>${esc(proposal.title)}</h1><p>Review the application, configuration and commercial terms together.</p><div class="sales-statline"><span>${esc(proposal.number)}</span><span>${alternatives.length} configuration alternatives</span><span>USD</span></div></div><div class="sales-media">${alternatives[0] ? snapshotPhoto(alternatives[0]) : modelPhoto('r3200')}<span>Exact-model source photograph · Selected options listed below</span></div></section>
  ${localNote()}
  <section class="sales-panel sales-understanding"><div class="eyebrow">WHAT WE UNDERSTOOD</div><h2>Application requirements</h2><p>${esc(proposal.scope?.application || 'Complete the application scope before a quote can be issued.')}</p><dl class="sales-scope-facts"><div><dt>Requested bag size</dt><dd>${esc(proposal.scope?.bag_dimensions || 'To confirm')}</dd></div><div><dt>Target throughput</dt><dd>${esc(proposal.scope?.throughput || 'To confirm')}${proposal.scope?.throughput && !/bags|min/i.test(proposal.scope.throughput) ? ' bags/min' : ''}</dd></div><div><dt>Application review</dt><dd>${alternatives.length ? 'Demonstration review recorded' : 'Review pending'}</dd></div></dl><p class="fine-print">Targets describe this illustrative application. PAC must confirm performance with the actual product, bags and operator workflow.</p></section>
  <section class="sales-proposal-options"><div class="sales-sectionhead"><div><div class="eyebrow">CHOOSE THE RIGHT APPROACH</div><h2>Compare the configurations.</h2></div><p>Compare the scope and investment together.</p></div>
  ${alternatives.length ? `<div class="sales-alternatives">${alternatives.map((alternative,index) => proposalAlternative(deal,proposal,alternative,index)).join('')}</div>` : '<div class="sales-empty"><h3>No issued quotes yet</h3><p>Configure an alternative, complete its reviews, and issue a revision to present it here.</p><a class="primary" href="#deal/' + esc(deal.id) + '">Prepare a quote</a></div>'}</section>
  ${alternatives.length > 1 ? comparison(alternatives) : ''}
  <section class="sales-panel sales-proposal-evidence"><div class="sales-sectionhead"><div><div class="eyebrow">EVIDENCE BEHIND THE PROPOSAL</div><h2>Application references</h2></div></div><p>Machine and option references help everyone discuss the same configuration.</p><div class="sales-evidence-grid">${alternatives.slice(0,2).map(a => `<figure><div class="sales-media">${snapshotPhoto(a)}</div><figcaption><strong>${esc(a.machine_title)}</strong><span>${esc(a.label)} · Rev ${a.revision}</span><small>Machine photograph; refer to the quote for included options.</small></figcaption></figure>`).join('')}${(proposal.evidence || []).map(e => evidenceCard(deal,e,true)).join('')}</div><p class="fine-print">3D views, when attached, use a reference assembly to illustrate the workflow. A verified PAC model and configuration-specific video can be added after PAC confirms the media.</p></section>
  ${alternatives.some(a=>a.machine_id==='r3200') ? equipmentVideo() : ''}
  ${proposalComments(deal,proposal)}
  <section class="sales-nextstep"><div><div class="eyebrow">AGREE THE NEXT STEP</div><h2>Which approach fits your operation?</h2><p>${esc(deal.next_action || 'Review the application and choose a configuration to develop with PAC.')}</p></div><div><strong>${esc(deal.owner)}</strong><span>Deal owner</span>${deal.next_action_date ? `<span>Follow-up · ${date(deal.next_action_date)}</span>` : ''}</div></section>
  <section class="sales-proposal-detail"><div class="sales-sectionhead"><div><div class="eyebrow">QUOTE DETAIL</div><h2>The scope behind each alternative.</h2></div><span>Issued revisions · USD</span></div>${alternatives.map(a => quoteDocument(a)).join('')}</section>
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
function commercialTerms(terms, lines) {
  const entries=[['Lead time',textValue(terms.lead_time)],['Quote validity',textValue(terms.quote_valid_days)],['Payment terms',textValue(terms.payment_terms)],['Delivery',textValue(terms.delivery_terms)],['Shipment',textValue(terms.shipment)],['Standard warranty',terms.warranty?.standard?.line_text || textValue(terms.warranty?.standard)],['Warranty conditions',textValue(terms.warranty?.terms)],['Application & feasibility',textValue(terms.project_specifications)],['Factory acceptance test',textValue(terms.fat)],['Financing',textValue(terms.financing)]];
  if(lines.some(l=>l.line_class==='service'))entries.push(['Start-up & training conditions',textValue(terms.startup)]);
  return entries.filter(([,value])=>value).map(([label,value])=>`<div><strong>${label}</strong><p>${esc(value)}</p></div>`).join('');
}
function quoteDocument(a) {
  const terms = a.terms || {};
  return `<article class="sales-panel sales-quote-document"><div class="sales-sectionhead"><div><h3>${esc(a.label)}</h3><p>${esc(a.number)} · Rev ${a.revision} · Issued ${date(a.issued_at)}</p></div><strong>${money(a.totals.total)}</strong></div><div class="sales-quote-scope"><strong>Application for this revision</strong><p>${esc(a.scope?.application)}</p><small>${esc(a.scope?.bag_dimensions)} · ${esc(a.scope?.throughput)}</small></div><div class="sales-table-wrap"><table class="sales-table"><caption class="sr-only">${esc(a.label)} priced line items</caption><thead><tr><th scope="col">Description</th><th scope="col">Qty</th><th scope="col">Unit price</th><th scope="col">Amount</th></tr></thead><tbody>${a.lines.map(l=>`<tr><td><strong>${esc(l.name)}</strong><small>${esc(C.unitLabel(l.price_unit))}</small>${conditionHtml(l)}</td><td>${l.quantity}</td><td class="numeric">${money(l.price_usd)}</td><td class="numeric">${money(l.total ?? l.quantity*l.price_usd)}</td></tr>`).join('')}${a.engineering.map(l=>`<tr><td><strong>${esc(l.description)}</strong><small>Engineering requirement</small></td><td>1</td><td class="numeric">${money(l.price)}</td><td class="numeric">${money(l.price)}</td></tr>`).join('')}${a.special.map(l=>`<tr><td><strong>${esc(l.description)}</strong><small>Special order · ${esc(l.lead_time)}</small></td><td>1</td><td class="numeric">${money(l.price)}</td><td class="numeric">${money(l.price)}</td></tr>`).join('')}</tbody><tfoot>${a.totals.discount ? `<tr><th colspan="3">Discount</th><td class="numeric">−${money(a.totals.discount)}</td></tr>` : ''}<tr><th colspan="3">Quote total · USD</th><td class="numeric"><strong>${money(a.totals.total)}</strong></td></tr></tfoot></table></div><details class="sales-included-details"><summary>Included in the base configuration</summary><ul>${a.included.map(l=>`<li>${esc(l.name)}</li>`).join('')}</ul></details><div class="sales-terms"><h4>Commercial terms</h4>${commercialTerms(terms,a.lines)}</div><p class="fine-print">Demonstration quote only. The review actions shown in this workspace are illustrative, not PAC authorization to purchase.</p></article>`;
}
function proposalComments(deal, proposal) {
  return `<section class="sales-panel sales-comment-section" id="proposal-discussion"><div class="sales-sectionhead"><div><div class="eyebrow">CUSTOMER DISCUSSION</div><h2>Questions and feedback</h2></div><span>${proposal.comments.length} ${proposal.comments.length===1?'comment':'comments'}</span></div><div class="sales-comment-list">${proposal.comments.length ? proposal.comments.map(comment => commentCard(deal,comment)).join('') : '<p class="sales-empty">Add the first question about fit, price or lead time.</p>'}</div><form class="sales-form no-print" data-sales-form="comment" data-comment-context="${proposal.alternatives.length===1?esc(proposal.alternatives[0].quote_id):'compare'}" ${attrs(deal)}><div class="sales-form-grid">${field('Your name','author','Customer reviewer',{required:true})}${select('Quote revision','quote_ref',proposal.alternatives.flatMap(a=>[...(S.findQuote(deal,a.quote_id)?.revisions||[])].reverse().map(revision=>[`${a.quote_id}|${revision.revision}`,`${revision.label||a.label} · Rev ${revision.revision}${revision.revision!==a.revision?' (previous)':''}`])),proposal.alternatives[0] ? `${proposal.alternatives[0].quote_id}|${proposal.alternatives[0].revision}` : '')}${field('Question or feedback','body','',{type:'textarea',required:true,full:true,placeholder:'What should PAC clarify before you choose a configuration?'})}</div><div class="sales-actions"><button class="primary" type="submit" ${proposal.alternatives.length ? '' : 'disabled'}>Add comment</button><span class="fine-print">Local preview · Feedback stays with the selected revision in this browser.</span></div></form></section>`;
}
function commentCard(deal, comment) { const q=deal.quotes.find(q=>q.id===comment.quote_id); return `<article class="sales-comment"><div><strong>${esc(comment.author)}</strong><time>${date(comment.created_at || comment.at)}</time></div><p>${esc(comment.body)}</p><small>${esc(q?.label || 'Deal discussion')}${comment.revision !== undefined ? ` · Rev ${comment.revision}` : ''}</small></article>`; }

function workspace() {
  const needle=search.toLowerCase();
  const deals=state.deals.filter(d=>(stageFilter==='all'||d.status===stageFilter)&&[d.title,d.customer,d.owner,d.number,d.crm_id].join(' ').toLowerCase().includes(needle));
  const allQuotes=state.deals.flatMap(deal=>deal.quotes.map(quote=>({deal,quote})));
  const quotes=allQuotes.filter(({deal,quote})=>(stageFilter==='all'||deal.status===stageFilter)&&(quoteStatusFilter==='all'||quote.working.status===quoteStatusFilter)&&[deal.title,deal.customer,deal.owner,deal.number,quote.number,quote.label,quote.working.draft.machine_title].join(' ').toLowerCase().includes(needle));
  return `<div class="winter-hub-header"><div><h1>Sales hub</h1><div class="winter-inline-counts"><span>${state.deals.length} ${state.deals.length===1?'deal':'deals'}</span><span>${allQuotes.length} ${allQuotes.length===1?'quote':'quotes'}</span><span>${allQuotes.filter(({quote})=>quote.working.status==='draft').length} ${allQuotes.filter(({quote})=>quote.working.status==='draft').length===1?'draft':'drafts'}</span></div></div><div class="sales-actions">${action('export-workspace','Export workspace',null,null,'secondary')}${action('new-deal',showNewDeal?'Close new deal':'New deal',null,null,'primary')}</div></div><nav class="winter-hub-tabs" aria-label="Sales hub view" role="tablist">${[['deals','Deals'],['quotes','Quotes']].map(([view,label])=>action('hub-view',label,null,null,hubView===view?'active':'',`data-view="${view}" role="tab" aria-selected="${hubView===view}" tabindex="${hubView===view?'0':'-1'}"`)).join('')}</nav>${showNewDeal?newDealForm():''}
  <section class="sales-panel winter-hub-table"><div class="sales-toolbar"><form data-sales-form="search" class="sales-search"><label for="sales-deal-search" class="sr-only">Search deals and quotes</label><input id="sales-deal-search" type="search" name="search" value="${esc(search)}" placeholder="Search ${hubView==='deals'?'deals, customers or owners':'quotes, customers or machines'}"><button class="secondary" type="submit">Search</button></form><div class="sales-filter">${select('Deal stage','stage_filter',[['all','All stages'],...stages.map(x=>[x,titleCase(x)])],stageFilter,'data-sales-change="stage-filter"')}</div>${hubView==='quotes'?`<div class="sales-filter">${select('Quote status','quote_status',[['all','All quotes'],['draft','Draft'],['issued','Issued']],quoteStatusFilter,'data-sales-change="quote-status"')}</div>`:''}<span class="winter-result-count">${hubView==='deals'?deals.length:quotes.length} ${(hubView==='deals'?deals.length:quotes.length)===1?'result':'results'}</span></div><div class="sales-table-wrap">${hubView==='deals'?`<table class="sales-table sales-deals-table"><caption class="sr-only">Sales deals</caption><thead><tr><th scope="col">Deal</th><th scope="col">Customer</th><th scope="col">Stage</th><th scope="col">Quotes</th><th scope="col">Owner</th><th scope="col">Next action</th><th scope="col">Last contact</th></tr></thead><tbody>${deals.map(d=>`<tr><td><a class="sales-table-link" href="#deal/${esc(d.id)}">${esc(d.title)}</a><small>${esc(d.number)}</small></td><td>${esc(d.customer)}</td><td>${status(d.status)}</td><td>${d.quotes.length}</td><td>${esc(d.owner)}</td><td>${esc(d.next_action||'Not set')}<small>${d.next_action_date?date(d.next_action_date):'No date set'}</small></td><td>${date(d.last_contact)}</td></tr>`).join('')||'<tr><td colspan="7"><div class="sales-empty">No deals match this search.</div></td></tr>'}</tbody></table>`:`<table class="sales-table winter-quotes-table"><caption class="sr-only">All quote alternatives</caption><thead><tr><th scope="col">Quote</th><th scope="col">Deal / customer</th><th scope="col">Machine</th><th scope="col">Status</th><th scope="col">Revision</th><th scope="col">Total</th><th scope="col">Owner</th><th scope="col">Updated</th></tr></thead><tbody>${quotes.map(({deal:d,quote:q})=>`<tr><td><a class="sales-table-link" href="#quote/${esc(d.id)}/${esc(q.id)}">${esc(q.label)}</a><small>${esc(q.number)}</small></td><td><a href="#deal/${esc(d.id)}">${esc(d.title)}</a><small>${esc(d.customer)}</small></td><td>${esc(q.working.draft.machine_title)}</td><td>${status(q.working.status)}</td><td>Rev ${q.working.revision}</td><td class="numeric">${money(S.totals(q).total)}${S.totals(q).pending?'<small>Preliminary</small>':''}</td><td>${esc(d.owner)}</td><td>${date(q.working.updated_at||q.working.created_at)}</td></tr>`).join('')||'<tr><td colspan="8"><div class="sales-empty">No quotes match these filters.</div></td></tr>'}</tbody></table>`}</div></section><div class="winter-hub-footnote"><span>Local demo · Catalog-backed pricing</span><span>CRM references are illustrative. No external synchronization is active.</span></div>`;
}

function newDealForm() {
  return `<section class="sales-panel"><h2>Start with the deal</h2><p>Link the opportunity before assigning a quote number.</p><form class="sales-form" data-sales-form="new-deal"><div class="sales-form-grid">${field('Deal title','title','',{required:true,placeholder:'Packaging line upgrade'})}${field('Customer / company','customer','',{required:true})}${field('Deal owner','owner','Demo sales rep',{required:true})}${field('CRM deal reference','crm_id','',{required:true,placeholder:'e.g. CRM-DEMO-102'})}${field('Application scope','application','',{type:'textarea',required:true,full:true,placeholder:'What is being packed, how is it loaded, and what should improve?'})}${field('Requested bag dimensions','bag_dimensions','',{required:true,placeholder:'Width × length in inches'})}${field('Target throughput (bags/min)','throughput','',{required:true})}</div><button class="primary" type="submit">Create deal</button><p class="fine-print">A reference is recorded locally; this does not create a deal in PAC’s CRM.</p></form></section>`;
}

function recordHeader(deal) {
  return `<div class="winter-record-header"><div><div class="winter-record-label">${esc(deal.number)} ${status(deal.status)}</div><h1>${esc(deal.title)}</h1><p>${esc(deal.customer)}</p></div><div class="sales-actions"><a class="primary" href="#present/${esc(deal.id)}">Present proposal</a></div></div><div class="winter-record-meta"><span><strong>Owner</strong>${esc(deal.owner)}</span><span><strong>CRM reference</strong>${esc(deal.crm_id||'Not set')}</span><span><strong>Follow-up</strong>${deal.next_action_date?date(deal.next_action_date):'Not set'}</span><span><strong>Quotes</strong>${deal.quotes.length} ${deal.quotes.length===1?'alternative':'alternatives'}</span></div>`;
}
function dealWorkflow(deal) {
  return `<nav class="winter-workflow-steps" aria-label="Deal workflow">${[['1','Application','winter-deal-scope'],['2','Quotes','winter-deal-quotes'],['3','Evidence','winter-deal-evidence']].map(([n,label,id])=>action('scroll-section',`<span>${n}</span>${label}`,deal,null,'',`data-section="${id}"`)).join('')}<a href="#quote/${esc(deal.id)}/${esc(currentQuoteId(deal.id)||'')}"><span>4</span>Review & issue</a></nav>`;
}

function dealView(deal) {
  return `${breadcrumbs(deal)}${recordHeader(deal)}${tabs(deal,'deal')}${dealWorkflow(deal)}<div class="sales-layout"><div class="sales-content"><section id="winter-deal-quotes" class="sales-panel"><div class="sales-sectionhead"><div><div class="eyebrow">CONFIGURATION ALTERNATIVES</div><h2>Quote alternatives</h2></div><span>${deal.quotes.length} quotes</span></div><div class="sales-table-wrap"><table class="sales-table"><caption class="sr-only">Alternative quotes for this deal</caption><thead><tr><th scope="col">Alternative</th><th scope="col">Latest work</th><th scope="col">Investment</th><th scope="col">Customer version</th><th scope="col"></th></tr></thead><tbody>${deal.quotes.map(q=>`<tr><td><a class="sales-table-link" href="#quote/${esc(deal.id)}/${esc(q.id)}">${esc(q.label)}</a><small>${esc(q.number)} · ${esc(q.working.draft.machine_title)}</small></td><td>${status(q.working.status)}<small>Rev ${q.working.revision}</small></td><td class="numeric">${money(S.totals(q).total)}${S.totals(q).pending ? '<small>Preliminary</small>' : ''}</td><td>${latest(q) ? `Rev ${latest(q).revision} · ${date(latest(q).issued_at)}` : 'Not issued'}</td><td><a class="text-button" href="#quote/${esc(deal.id)}/${esc(q.id)}">Open →</a></td></tr>`).join('') || '<tr><td colspan="5">Add a machine to start the first quote.</td></tr>'}</tbody></table></div><details class="sales-add-alternative"><summary>Add a quote alternative</summary><form data-sales-form="add-quote" ${attrs(deal)} class="sales-form"><div class="sales-form-grid">${field('Alternative name','label','',{required:true,placeholder:'e.g. Operator-assisted loading'})}${select('PAC machine','machine_id',catalog.machines.map(m=>[m.machine_id,m.title.text]),'r3200')}</div><button class="primary" type="submit">Create alternative quote</button></form></details></section>
  <section id="winter-deal-scope" class="sales-panel"><div class="sales-sectionhead"><div><div class="eyebrow">APPLICATION SCOPE</div><h2>Application scope</h2></div></div><form data-sales-form="scope" ${attrs(deal)} class="sales-form"><div class="sales-form-grid">${field('Application and desired outcome','application',deal.scope.application,{type:'textarea',required:true,full:true})}${field('Requested bag dimensions','bag_dimensions',deal.scope.bag_dimensions,{required:true})}${field('Target throughput (bags/min)','throughput',deal.scope.throughput,{required:true})}</div><div class="sales-actions"><button class="secondary" type="submit">Save application scope</button><span class="fine-print">Changed scope requires a fresh review of open drafts. Issued revisions retain their original scope.</span></div></form></section>
  <section id="winter-deal-evidence" class="sales-panel"><div class="sales-sectionhead"><div><div class="eyebrow">DISCOVERY & EVIDENCE</div><h2>Application evidence</h2></div><a class="secondary" href="#deal-explorer/${esc(deal.id)}">Open 3D Explorer ↗</a></div><p>Inspect a component and attach its saved view to this opportunity. The same evidence can support the engineering review and issued proposal.</p><div class="sales-evidence-grid">${deal.evidence.length ? deal.evidence.map(e=>evidenceCard(deal,e)).join('') : '<div class="sales-empty"><strong>No 3D evidence attached yet.</strong><p>Capture a selected component, camera view and motion state without creating a separate deal.</p></div>'}</div></section>
  <section class="sales-panel"><div class="sales-sectionhead"><div><div class="eyebrow">CUSTOMER DISCUSSION</div><h2>Customer feedback</h2></div><a class="text-button" href="#present/${esc(deal.id)}">Open proposal →</a></div><div class="sales-comment-list">${deal.comments.filter(c=>c.visibility!=='internal').map(c=>commentCard(deal,c)).join('') || '<p class="sales-empty">No customer feedback yet. Present the proposal and capture the next question.</p>'}</div></section>
  <section class="sales-panel"><div class="sales-sectionhead"><div><div class="eyebrow">DEAL HISTORY</div><h2>Activity</h2></div></div>${activity(deal)}</section></div>
  <aside class="sales-rail"><section class="sales-panel"><div class="sales-sectionhead"><h2>Deal details</h2>${status(deal.status)}</div><form data-sales-form="deal-details" ${attrs(deal)} class="sales-form">${field('Owner','owner',deal.owner,{required:true})}${select('Stage','status',stages.map(x=>[x,titleCase(x)]),deal.status)}${field('CRM deal reference','crm_id',deal.crm_id,{required:true})}${field('Next action','next_action',deal.next_action,{type:'textarea',required:true})}${field('Follow-up date','next_action_date',deal.next_action_date?.slice(0,10)||'',{type:'date'})}${field('Last customer contact','last_contact',deal.last_contact?.slice(0,10)||'',{type:'date'})}<button class="primary" type="submit">Save deal details</button></form><p class="fine-print">Demo CRM reference · No external synchronization</p></section><section class="sales-panel sales-review-note"><h3>Demo workflow</h3><ol><li>Present the two alternatives.</li><li>Capture the customer’s question.</li><li>Revise a quote and add an engineering requirement.</li><li>Attach 3D evidence to this same deal.</li><li>Review, issue and return to the proposal.</li></ol></section></aside></div>`;
}
function activity(deal) { return `<ol class="sales-timeline">${deal.activity.map(item=>`<li><div class="sales-timeline-dot" aria-hidden="true"></div><div><strong>${esc(item.message || item.description || item.type || item.action)}</strong><span>${date(item.at || item.created_at)}${item.actor ? ` · ${esc(item.actor)}` : ''}</span></div></li>`).join('') || '<li>No activity yet.</li>'}</ol>`; }
function evidenceCard(deal,evidence,readOnly=false) {
  const isPhoto=evidence.type==='photo';
  const title=evidence.title || evidence.part_label || evidence.part_title || evidence.part?.title || 'Saved reference';
  const picture=evidence.reference?.photo;
  const preview=evidence.reference?.preview;
  const safePreview=!isPhoto && typeof preview?.dataUrl==='string' && preview.dataUrl.length<=120000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(preview.dataUrl) && [preview.width,preview.height].every(side=>Number.isInteger(side)&&side>0&&side<=640);
  return `<article class="sales-evidence-card"><span class="eyebrow">${isPhoto?'PAC CATALOG · PHOTO REFERENCE':'3D EXPLORER · REFERENCE ASSEMBLY'}</span>${isPhoto&&picture?.file?`<div class="sales-media"><img src="${esc(`${catalog.baseUrl||'/source'}/${picture.file}`)}" alt="${esc(title)} reference photograph" loading="lazy"></div>`:''}${safePreview?`<div class="sales-evidence-preview"><img src="${esc(preview.dataUrl)}" width="${preview.width}" height="${preview.height}" alt="Captured ${esc(title)} inspection view" loading="lazy"></div>`:''}<h3>${esc(title)}</h3><p>${esc(evidence.description || evidence.note || (isPhoto?'Source photograph retained with the imported configuration.':'Selected component and inspection context attached to this deal.'))}</p><small>${date(evidence.captured_at || evidence.created_at)} · ${esc(deal.number)}</small>${!readOnly&&!isPhoto ? `<a class="text-button" href="#deal-explorer/${esc(deal.id)}/${esc(evidence.quote_id || '')}">Inspect saved evidence →</a>` : ''}</article>`;
}

function quoteView(deal, quote) {
  if(!quote)return `${breadcrumbs(deal)}<section class="sales-panel sales-empty"><h1>No quote selected</h1><p>Create a quote alternative from the deal.</p><a class="primary" href="#deal/${esc(deal.id)}">Return to deal</a></section>`;
  const w=readWorking(quote),editable=canEdit(quote),t=S.totals(w),isHistory=w.revision!==quote.working.revision;
  const active=quoteTabs[quote.id]||'configuration';
  let panel='';
  if(active==='configuration')panel=`<section class="sales-panel"><div class="sales-sectionhead"><div><h2>Standard configuration</h2><p>Select the base machine, options and services.</p></div>${status(w.status||'issued')}</div><div class="sales-machine-strip">${modelPhoto(quote.machine_id)}<div><h3>${esc(w.draft.machine_title)}</h3><p>${esc(w.draft.machine_snapshot?.subtitle||'')}</p><span>Source catalog · November 6, 2026</span></div></div>${quoteLines(deal,quote,w,editable)}${editable?optionPicker(deal,quote):''}<details class="sales-included-details"><summary>Base system features · ${(w.draft.included_snapshot||[]).length}</summary><ul>${(w.draft.included_snapshot||[]).map(l=>`<li>${esc(l.name)} <span>Included</span></li>`).join('')}</ul></details></section>`;
  if(active==='engineering')panel=engineeringPanel(deal,quote,w,editable);
  if(active==='special')panel=specialPanel(deal,quote,w,editable);
  if(active==='review')panel=`${discountPanel(deal,quote,w,editable)}${quoteApplication(deal,quote,w)}${reviewPanel(deal,quote,w,editable)}`;
  return `${breadcrumbs(deal,quote.number)}<section class="winter-quote-context"><div class="winter-quote-identity"><span class="winter-record-label">${esc(deal.customer)}</span><h1>${esc(quote.label)}</h1><div class="winter-quote-identifiers"><a href="#deal/${esc(deal.id)}">${esc(deal.number)}</a><span>${esc(quote.number)}</span><span>Rev ${w.revision}</span>${status(w.status||'issued')}</div></div><div class="winter-quote-value"><span>${t.pending?'Preliminary total':'Quote total'} · USD</span><strong>${price(t.total)}</strong></div><div class="sales-actions"><a class="secondary" href="#present/${esc(deal.id)}">Customer proposal</a>${!editable&&!isHistory?action('revise','Create next revision',deal,quote,'primary'):''}</div></section>
  <div class="winter-context-controls"><div class="sales-controls-group">${select('Alternative','quote_switch',deal.quotes.map(q=>[q.id,q.label]),quote.id,`data-sales-change="quote-switch" ${attrs(deal)}`)}${select('Revision','revision',[['working',`Rev ${quote.working.revision} · ${quote.working.status==='issued'?'Issued':'Working draft'}`],...quote.revisions.filter(r=>r.revision!==quote.working.revision).map(r=>[r.revision,`Rev ${r.revision} · Issued history`])],selectedRevision[quote.id]??'working',`data-sales-change="revision" ${attrs(deal,quote)}`)}</div><div class="sales-controls-group">${select('Demo role','role',roles.map(r=>[r,titleCase(r)]),role,'data-sales-change="role"')}<label class="sales-price-toggle"><input type="checkbox" data-sales-change="prices" ${showPrices?'checked':''}> Show prices</label></div></div><div class="winter-revision-notice">${editable?`Working Rev ${w.revision}. Save each form, then complete the required reviews.`:`Issued Rev ${w.revision} is preserved. ${isHistory?'Historical scope and prices are shown.':'Create a new revision to make changes.'}`}<span>Demo roles · No authenticated access control</span></div>
  <nav class="winter-config-tabs" aria-label="Quote configuration category" role="tablist">${[['configuration','Configuration'],['engineering','Engineering'],['special','Special orders'],['review','Review & issue']].map(([key,label])=>action('quote-tab',label,deal,quote,active===key?'active':'',`data-tab="${key}" role="tab" aria-selected="${active===key}" tabindex="${active===key?'0':'-1'}"`)).join('')}<a href="#present/${esc(deal.id)}">Proposal ↗</a></nav><div class="sales-layout winter-quote-layout"><div class="sales-content winter-config-panel" role="tabpanel" aria-label="${esc({configuration:'Configuration',engineering:'Engineering',special:'Special orders',review:'Review and issue'}[active])}">${panel}</div><aside class="sales-rail">${summaryPanel(deal,quote,w,t,editable)}<section class="sales-panel winter-review-progress"><h3>Review status</h3><ol class="winter-numbered-reviews">${[['application','Application'],['engineering','Engineering'],['manager','Commercial']].map(([key,label],index)=>`<li><span>${index+1}</span><strong>${label}</strong>${w.approvals[key]?status('reviewed'):'<small>Review if required</small>'}</li>`).join('')}</ol>${active!=='review'?action('quote-tab','Open review & issue',deal,quote,'secondary','data-tab="review" data-slot="rail"'):''}</section><section class="sales-panel"><h3>Revision history</h3><ul class="sales-revision-list">${quote.revisions.map(r=>`<li><strong>Rev ${r.revision}</strong><span>${date(r.issued_at)}</span><span>${showPrices?money(r.totals.total):'Price hidden'}</span></li>`).join('')||'<li>No issued revisions.</li>'}</ul><p class="fine-print">Issued snapshots preserve scope, prices, reviews and evidence.</p></section></aside></div>`;
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
  return `<details class="sales-option-picker" open><summary>Add catalog options</summary><form class="sales-toolbar" data-sales-form="option-search" ${attrs(deal,quote)}><div class="sales-search"><label class="sr-only" for="sales-option-search">Search catalog options</label><input id="sales-option-search" type="search" name="search" placeholder="Search options, spares or services" value="${esc(optionSearch)}"><button type="submit" class="secondary">Search</button></div>${select('Show','category',[['all','All items'],['options','Options & equipment'],['services','Services']],optionCategory,'data-sales-change="option-category"')}</form><div class="sales-options-scroll"><table class="sales-table sales-options-table"><caption class="sr-only">Available catalog options</caption><thead><tr><th scope="col">Option</th><th scope="col">Price</th><th scope="col">Action</th></tr></thead><tbody>${rows.map(row=>{const info=C.describeLine(catalog,row), index=catalog.priceLines.indexOf(row), plan=C.planSelection(catalog,quote.working.draft,row), restrictions=typeof S.catalogRestrictions==='function'?S.catalogRestrictions(catalog,quote.machine_id,row):[], blocked=plan.blocked||restrictions.length>0; return `<tr><td><strong>${esc(row.name)}</strong><small>${row.line_class==='service'?'Service':'Standard option'}${row.requires_option_ids?.length ? ` · Requires ${esc(row.requires_option_ids.map(x=>typeof x==='string'?(C.getOption(catalog,quote.machine_id,x)?.name||x):(x.target||C.getOption(catalog,quote.machine_id,x.option_id)?.name||x.option_id)).join(', '))}` : ''}</small>${[...new Set([...(plan.blocked?plan.reviewReasons:[]),...restrictions])].map(reason=>`<small class="sales-requires">${esc(reason)}</small>`).join('')}</td><td class="numeric">${price(row.price_usd)}</td><td>${action('select-option','Add',deal,quote,'secondary',`data-row="${index}" aria-label="Add ${esc(row.name)}" ${blocked?'disabled':''}`)}</td></tr>`;}).join('')||'<tr><td colspan="3">No unselected items match this search.</td></tr>'}</tbody></table></div></details>`;
}
function engineeringPanel(deal,quote,w,editable) {
  const pricingRole = role === 'engineering' || role === 'manager';
  return `<section class="sales-panel"><div class="sales-sectionhead"><div><div class="eyebrow">02 · ENGINEERING REQUIREMENTS</div><h2>Engineering requirements</h2></div><span>${w.engineering.length} ${w.engineering.length===1?'requirement':'requirements'}</span></div><p>Describe what must change and why. Engineering adds labor and materials before the quote can be finalized.</p><div class="sales-engineering-list">${w.engineering.map(item=>editable ? engineeringForm(deal,quote,item,pricingRole) : `<article class="sales-engineering-item"><h3>${esc(item.description)}</h3><p>${esc(item.reason)}</p><span>${price((item.hours || 0)*w.labor_rate+(item.materials || 0))}</span></article>`).join('')}</div>${editable ? `<form class="sales-form sales-rate-form" data-sales-form="labor-rate" ${attrs(deal,quote)}>${field('Assumed labor rate (USD/hour)','labor_rate',w.labor_rate,{type:showPrices?'number':'password',min:0,step:0.01,required:true,disabled:!pricingRole||!showPrices})}<button class="secondary" type="submit" ${pricingRole&&showPrices?'':'disabled'}>Update rate</button><p class="fine-print">One rate for this draft. Demo assumption, pending PAC confirmation.</p></form><details class="sales-add-engineering"><summary>Add an engineering requirement</summary>${engineeringForm(deal,quote,null,pricingRole)}</details>` : ''}${!pricingRole&&editable ? '<p class="sales-note">Sales describes the request. Switch the demo role to Engineering to enter hours, materials and pricing.</p>' : ''}</section>`;
}
function engineeringForm(deal,quote,item,pricingRole) {
  return `<form class="sales-form sales-engineering-item" data-sales-form="engineering" ${attrs(deal,quote)} ${item ? `data-item="${esc(item.id)}"` : ''}><div class="sales-form-grid">${field('What needs to change?','description',item?.description || '',{required:true,full:true,placeholder:'e.g. Custom product guide for mixed hardware kits'})}${field('Why is it needed?','reason',item?.reason || '',{type:'textarea',required:true,full:true,placeholder:'Describe the application constraint or customer requirement.'})}${select('Applies to','option_id',[['','Custom add-on / overall machine'],...quote.working.draft.lines.filter(l=>l.option_id).map(l=>[l.option_id,l.name])],item?.option_id || '')}${pricingRole ? field('Labor hours','hours',item?.hours ?? '',{type:showPrices?'number':'password',min:0,step:0.25,disabled:!showPrices})+field('Material cost (USD)','materials',item?.materials ?? '',{type:showPrices?'number':'password',min:0,step:0.01,disabled:!showPrices}) : ''}</div>${item ? `<div class="sales-inline-total"><span>Engineering add-on</span><strong>${item.hours == null || item.materials == null ? 'Pricing pending' : price(item.hours*quote.working.labor_rate+item.materials)}</strong></div>` : ''}<div class="sales-actions"><button class="secondary" type="submit" ${!item&&pricingRole&&!showPrices?'disabled':''}>${item ? 'Save requirement' : 'Add requirement'}</button>${!item&&pricingRole&&!showPrices?'<span class="fine-print">Show prices before adding a new requirement. Unapplied entries are retained.</span>':''}${item ? action('remove-engineering','Remove',deal,quote,'text-button',`data-item="${esc(item.id)}"`) : ''}</div></form>`;
}
function specialPanel(deal,quote,w,editable) {
  return `<section class="sales-panel"><div class="sales-sectionhead"><div><div class="eyebrow">03 · SPECIAL ORDERS & ADD-ONS</div><h2>Special orders & add-ons</h2></div></div><p>Add confirmed special-order scope, shipping or other non-catalog items with an explicit price and lead-time condition.</p>${w.special.map(item=>`<article class="sales-special-item"><div><strong>${esc(item.description)}</strong><p>${esc(item.lead_time)}</p></div><strong>${price(item.price)}</strong>${editable?action('remove-special','Remove',deal,quote,'text-button',`data-item="${esc(item.id)}"`):''}</article>`).join('')}${editable ? `<details><summary>Add a special-order item</summary><form class="sales-form" data-sales-form="special" ${attrs(deal,quote)}><div class="sales-form-grid">${field('Description','description','',{required:true,full:true})}${field('Quoted add-on price (USD)','price','',{type:'number',min:0,step:0.01,required:true,disabled:!showPrices})}${field('Lead-time condition','lead_time','',{required:true,placeholder:'e.g. Adds 2 weeks after drawing approval'})}</div><button type="submit" class="secondary" ${showPrices?'':'disabled'}>Add special-order item</button></form></details>` : ''}</section>`;
}
function discountPanel(deal,quote,w,editable) {
  return `<section class="sales-panel"><div class="sales-sectionhead"><div><div class="eyebrow">04 · COMMERCIAL REVIEW</div><h2>Commercial review</h2></div></div>${editable ? `<form data-sales-form="discount" ${attrs(deal,quote)} class="sales-form"><div class="sales-form-grid">${field('Discount amount (USD)','amount',showPrices?w.discount.amount:'',{type:'number',min:0,step:0.01,required:true,disabled:!showPrices})}${field('Reason for discount','reason',w.discount.reason,{placeholder:'Required for any discount'})}</div><button type="submit" class="secondary" ${showPrices?'':'disabled'}>Save discount request</button><p class="fine-print">Any discount needs manager approval. Editing the amount or reason clears the earlier approval.</p></form>` : `<div class="sales-inline-total"><span>Discount</span><strong>${price(w.discount.amount)}</strong></div>`}</section>`;
}
function summaryPanel(deal,quote,w,t,editable) {
  return `<section class="sales-panel sales-summary"><div class="eyebrow">REV ${w.revision} · ${editable?'WORKING DRAFT':'ISSUED QUOTE'}</div><h2>Quote summary</h2><dl class="sales-money-breakdown"><div><dt>Catalog configuration</dt><dd>${price(t.catalog)}</dd></div><div><dt>Engineering add-ons</dt><dd>${price(t.engineering)}</dd></div><div><dt>Special orders</dt><dd>${price(t.special)}</dd></div><div><dt>Discount</dt><dd>${showPrices?'−'+money(t.discount):'Hidden'}</dd></div></dl><div class="sales-total"><span>${t.pending?'Preliminary total':'Quote total'} · USD</span><strong>${price(t.total)}</strong></div>${t.pending ? '<p class="sales-note warning">Unpriced requirements remain. This total is not final.</p>' : ''}<div class="sales-leadtime"><strong>Catalog lead time</strong><span>${shortLead(w.draft.terms_snapshot)}</span><p>After receipt of deposit; confirmed at order.</p>${[...new Set(w.draft.lines.flatMap(line=>(line.flags||[]).filter(f=>f.kind==='lead_time').map(f=>f.evidence)))].map(note=>`<p class="sales-requires">${esc(showPrices?note:note.replace(/\$[\d,.]+/g,'[price hidden]'))}</p>`).join('')}${w.special.map(s=>`<p class="sales-requires">${esc(s.description)}: ${esc(s.lead_time)}</p>`).join('')}</div><p class="fine-print">Taxes and freight follow the source commercial terms unless explicitly quoted.</p></section>`;
}
function reviewPanel(deal,quote,w,editable) {
  const blockers = editable ? S.blockers(catalog,deal,quote) : [];
  if(editable&&pendingQuoteForms(deal,quote).length)blockers.unshift('Save or discard unapplied form edits before review or issue.');
  const checks = [['application','Application review','Confirm the machine and options against the written application.'],['engineering','Engineering review','Confirm engineering requirements, pricing and delivery conditions.'],['manager','Manager review','Approve commercial exceptions and discounts.']];
  return `<section class="sales-panel sales-review-panel"><div class="eyebrow">REVIEW BEFORE ISSUE</div><h2>${editable?'Review & issue':'Review record'}</h2><div class="sales-review-gates">${checks.map(([key,label,description])=>{const approval=w.approvals[key]; return `<div class="sales-review-gate"><div><strong>${approval?'✓ ':''}${label}</strong><p>${description}</p>${approval?`<small>${esc(approval.role || approval.by || approval.reviewer || key)} · ${date(approval.at || approval.created_at)}</small>`:''}</div>${editable&&!approval?action('review',`Confirm ${key}`,deal,quote,'secondary',`data-review="${key}"`):approval?status('reviewed'):status('not required')}</div>`;}).join('')}</div>${editable ? `${blockers.length ? `<div class="sales-blockers"><strong>Before this quote can be issued</strong><ul>${blockers.map(x=>`<li>${esc(typeof x==='string'?x:x.message)}</li>`).join('')}</ul></div>` : '<p class="sales-note success">All required reviews are complete. This revision is ready to issue.</p>'}${action('issue',`Issue Rev ${w.revision}`,deal,quote,'primary',blockers.length||role==='engineering'?'disabled':'')}${role==='engineering'&&!blockers.length?'<p class="fine-print">Switch the demo role to Sales or Manager to issue this revision.</p>':''}<p class="fine-print">Issues a preserved local snapshot and updates the customer proposal. No email is sent.</p>` : `<p class="fine-print">Reviews belong to this exact revision. Create a new revision to make changes.</p>`}</section>`;
}
function selectionDialog() {
  const {dealId,quoteId,plan,rowIndex} = pendingSelection;
  const deal=dealById(dealId),quote=quoteById(deal,quoteId);
  return `<dialog class="sales-modal" aria-labelledby="sales-selection-title"><div class="eyebrow">REVIEW THE SELECTION</div><h2 id="sales-selection-title">${plan.additions.length>1?'Add the complete configuration?':'Confirm this catalog option?'}</h2><p>${plan.additions.length>1?'The selected option requires these items to work together.':'Review the source conditions before adding this option.'}</p>${plan.reviewReasons.length?`<div class="sales-note warning"><ul>${plan.reviewReasons.map(reason=>`<li>${esc(showPrices?reason:reason.replace(/\$[\d,.]+/g,'[price hidden]'))}</li>`).join('')}</ul></div>`:''}<ul class="sales-confirm-lines">${plan.additions.map(l=>`<li><span>${esc(l.name)}</span><strong>${price(l.price_usd*l.quantity)}</strong></li>`).join('')}</ul><div class="sales-inline-total"><span>Change to quote</span><strong>${price(plan.addedTotal)}</strong></div><div class="sales-actions">${action('cancel-selection','Cancel',deal,quote,'secondary')}${action('confirm-selection',plan.additions.length>1?'Add required items':'Confirm and add',deal,quote,'primary',`data-row="${rowIndex}"`)}</div></dialog>`;
}
function explorerView(deal,quoteId) {
  return `${breadcrumbs(deal,'3D evidence')}${tabs(deal,'deal-explorer')}${renderDealExplorer({deal,quoteId:quoteId||null,returnHash:quoteId&&S.findQuote(deal,quoteId)?`#quote/${deal.id}/${quoteId}`:`#deal/${deal.id}`,evidence:deal.evidence})}`;
}

export function afterRender() {
  restoreFormDrafts();
  const frame = document.getElementById('deal-explorer-frame');
  if (rendered.view === 'deal-explorer' && frame) {
    if (frame && frame !== mountedExplorer) {
      explorerCleanup?.(); mountedExplorer=frame;
      const deal=dealById(rendered.id);
      explorerCleanup = mountDealExplorer({dealId:deal.id,quoteId:rendered.qid||null,evidence:deal.evidence,onEvidence:input=>{try{const evidence=S.addEvidence(deal,input);persist();notify('3D evidence attached to this deal.');return evidence;}catch(err){notify(err.message);throw err;}},onError:message=>notify(typeof message==='string'?message:message.message)});
    }
  } else if (explorerCleanup) { explorerCleanup(); explorerCleanup=null; mountedExplorer=null; }
  const dialog=document.querySelector('.sales-modal');
  if(dialog) {
    dialog.addEventListener('cancel',event=>{event.preventDefault();dismissSelection();});
    if(!dialog.open)dialog.showModal();
    dialog.querySelector('button')?.focus();
  }
}

function dismissSelection() {
  const previous=pendingSelection;
  pendingSelection=null;
  redraw();
  if(previous)document.getElementById(`sales-action-select-option-${previous.dealId}-${previous.quoteId}-${previous.rowIndex}`)?.focus();
}

export function handleClick(event) {
  const el=event.target.closest('[data-sales-action]');
  if(!el) return false;
  event.preventDefault();
  const name=el.dataset.salesAction;
  if(name==='hub-view'){captureFormDrafts();hubView=el.dataset.view==='quotes'?'quotes':'deals';error='';redraw();return true;}
  if(name==='discard-form-edits'){discardContextEdits();return true;}
  if(name==='new-deal'){showNewDeal=!showNewDeal;error='';redraw();return true;}
  if(name==='export-workspace'){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='pac-sales-workspace.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Workspace exported with its deals, revisions and evidence.');return true;}
  if(name==='print-proposal'){window.print();return true;}
  if(name==='load-video'){videoLoaded=true;redraw();return true;}
  const deal=dealById(el.dataset.deal),quote=el.dataset.quote?quoteById(deal,el.dataset.quote):null;
  if(name==='quote-tab'){captureFormDrafts();quoteTabs[quote.id]=el.dataset.tab;error='';redraw();return true;}
  if(name==='proposal-alternative'){captureFormDrafts();proposalAlternatives[deal.id]=el.dataset.alternative;error='';redraw();return true;}
  if(name==='scroll-section'){document.getElementById(el.dataset.section)?.scrollIntoView({behavior:'smooth',block:'start'});return true;}
  if(name==='choose-alternative') mutate(()=>S.chooseAlternative(deal,quote.id),'Preferred alternative recorded for this deal.');
  if(name==='revise') mutate(()=>{selectedRevision[quote.id]='working';quoteTabs[quote.id]='configuration';return S.reviseQuote(deal,quote,'Updated after the customer proposal discussion.');},'New working revision created. The issued proposal is preserved.');
  if(name==='select-option'){
    const index=Number(el.dataset.row),row=catalog.priceLines[index];
    try { const plan=C.planSelection(catalog,quote.working.draft,row);if(plan.blocked)throw new Error(plan.reviewReasons.join(' '));if(plan.additions.length>1 || plan.reviewReasons.length){pendingSelection={dealId:deal.id,quoteId:quote.id,plan,rowIndex:index};redraw();}else mutate(()=>S.selectOption(catalog,deal,quote,row),'Catalog option added. Required reviews refreshed.'); } catch(err){error=err.message;redraw();}
  }
  if(name==='cancel-selection')dismissSelection();
  if(name==='confirm-selection'){const row=catalog.priceLines[Number(el.dataset.row)];pendingSelection=null;mutate(()=>S.selectOption(catalog,deal,quote,row),'Option and required companion items added.');}
  if(name==='remove-option') mutate(()=>S.removeOption(catalog,deal,quote,el.dataset.line),'Option removed.');
  if(name==='remove-engineering') mutate(()=>S.removeEngineering(deal,quote,el.dataset.item),'Engineering requirement removed.');
  if(name==='remove-special') mutate(()=>S.removeSpecial(deal,quote,el.dataset.item),'Special-order item removed.');
  if(name==='review') mutate(()=>{requireAppliedForms(deal,quote);return S.reviewQuote(catalog,deal,quote,el.dataset.review,role);},`${titleCase(el.dataset.review)} review recorded for this revision.`);
  if(name==='issue') mutate(()=>{requireAppliedForms(deal,quote);return S.issueQuote(catalog,deal,quote,role);},'Revision issued. The customer proposal now shows this snapshot.');
  return true;
}

export function handleSubmit(event) {
  const form=event.target.closest('[data-sales-form]');
  if(!form)return false;
  event.preventDefault();
  const name=form.dataset.salesForm, data=Object.fromEntries(new FormData(form));
  const deal=form.dataset.deal?dealById(form.dataset.deal):null, quote=form.dataset.quote?quoteById(deal,form.dataset.quote):null;
  if(name==='search'){search=data.search;redraw();return true;}
  if(name==='option-search'){optionSearch=data.search;redraw();return true;}
  if(name==='new-deal') submitFormMutation(form,()=>{const d=S.createDeal(state,{...data,scope:{application:data.application,bag_dimensions:data.bag_dimensions,throughput:data.throughput}});showNewDeal=false;return d;},'Deal created. Add the first quote alternative.',d=>`#deal/${d.id}`);
  if(name==='add-quote') submitFormMutation(form,()=>S.addQuote(catalog,deal,data),'Quote alternative created.',q=>`#quote/${deal.id}/${q.id}`);
  if(name==='scope') submitFormMutation(form,()=>S.updateScope(deal,data),'Application scope saved. Open drafts require review again.');
  if(name==='deal-details') submitFormMutation(form,()=>S.updateDeal(deal,data),'Deal details and next action saved.');
  if(name==='engineering'){
    if(!form.dataset.item&&role!=='sales'&&!showPrices){error='Show prices before adding a new engineering requirement. Your unapplied entries are retained.';redraw();return true;}
    const input={description:data.description,reason:data.reason,option_id:data.option_id||null,...(form.dataset.item?{id:form.dataset.item}:{})};
    if(role!=='sales'&&showPrices){input.hours=data.hours===''?null:Number(data.hours);input.materials=data.materials===''?null:Number(data.materials);}
    submitFormMutation(form,()=>S.saveEngineering(deal,quote,input,role),'Engineering requirement saved.');
  }
  if(name==='labor-rate') submitFormMutation(form,()=>S.setLaborRate(deal,quote,Number(data.labor_rate),role),'Assumed labor rate updated. Engineering review is required again.');
  if(name==='special') submitFormMutation(form,()=>S.saveSpecial(deal,quote,{description:data.description,price:Number(data.price),lead_time:data.lead_time}),'Special-order item and lead-time condition added.');
  if(name==='discount') submitFormMutation(form,()=>S.updateDiscount(deal,quote,{amount:Number(data.amount),reason:data.reason}),'Discount request saved.');
  if(name==='comment'){const [quote_id,revision]=String(data.quote_ref).split('|');submitFormMutation(form,()=>S.addComment(deal,{author:data.author,body:data.body,quote_id,revision:Number(revision),visibility:'customer'}),'Comment saved against the displayed quote revision.');}
  return true;
}

export function handleChange(event) {
  const el=event.target.closest('[data-sales-change]');
  if(!el)return false;
  const name=el.dataset.salesChange;
  if(name==='role'){role=el.value;error='';redraw();}
  if(name==='prices'){showPrices=el.checked;redraw();}
  if(name==='stage-filter'){stageFilter=el.value;redraw();}
  if(name==='quote-status'){quoteStatusFilter=el.value;redraw();}
  if(name==='option-category'){optionCategory=el.value;redraw();}
  if(name==='quote-switch'){optionSearch='';navigate(`#quote/${el.dataset.deal}/${el.value}`);}
  if(name==='revision'){selectedRevision[el.dataset.quote]=el.value;error='';redraw();}
  if(name==='quantity'){const deal=dealById(el.dataset.deal),quote=quoteById(deal,el.dataset.quote);mutate(()=>S.setQuoteQuantity(catalog,deal,quote,el.dataset.line,Number(el.value)),'Quantity updated.');}
  return true;
}
