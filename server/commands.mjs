import * as S from '../src/sales-domain.js';
import * as C from '../src/catalog.js';
import { applyQuoteEdit, quoteBasis } from '../src/quote-edit-session.js';

const copy = value => JSON.parse(JSON.stringify(value));
const fail = (message, status = 400, code = 'INVALID_COMMAND') => { throw Object.assign(new Error(message), { status, code }); };
const salesCommands = new Set(['createDeal','createDemoScenario','updateDeal','updateScope','addQuote','importDraft','selectOption','repriceQuote','removeOption','setQuoteQuantity','setLinePriceOverride','clearLinePriceOverride','saveQuoteEdit','removeEngineering','saveSpecial','removeSpecial','updateDiscount','issueQuote','reviseQuote','chooseAlternative','publishProposal','recordCustomerResponse','reviseFromResponse','renameQuote','duplicateQuote','updateContacts','markProposalPresented','replyToResponse','setResponseStatus','submitQuoteReview']);

function rowFor(catalog, machineId, line) {
  return C.getSelectableLines(catalog, machineId).find(row => row.line_class === line.line_class && (line.option_id ? row.option_id === line.option_id : !row.option_id && row.name === line.name));
}
function lineKey(line) { return `${line.line_class}|${line.option_id || line.name}`; }

/** Only the configuration editor is accepted here; all protected fields and prices
 * come from saved data/catalog. Domain operations handle engineering and discounts. */
export function saveQuoteEdit(catalog, state, entry) {
  if (!entry || entry.version !== 1) fail('The quote editor payload is invalid.');
  const deal = S.findDeal(state, entry.dealId), quote = S.findQuote(deal, entry.quoteId);
  if (!quote || quote.working.status !== 'draft' || entry.base !== quoteBasis(quote.working)) fail('This quote changed. Reload before reconciling your retained edits.', 409, 'QUOTE_CONFLICT');
  const original = quote.working;
  if (entry.working?.status !== 'draft' || entry.working.revision !== original.revision || entry.working.draft?.machine_id !== quote.machine_id) fail('The quote editor identity does not match.');
  for (const key of ['engineering','special','labor_rate','labor_rate_assumption','discount','created_at','revision_note','customer_response_id','source_proposal_id']) {
    if (JSON.stringify(entry.working[key]) !== JSON.stringify(original[key])) fail(`Use the authorized ${key} operation instead of changing it through the configuration editor.`);
  }
  const selected = entry.working.draft.lines;
  if (!Array.isArray(selected) || selected.length > 200 || selected.filter(line => ['catalog_base','catalog_base_variant'].includes(line.line_class)).length !== 1) fail('Choose exactly one base configuration.');
  if (new Set(selected.map(lineKey)).size !== selected.length) fail('Duplicate configuration lines are not allowed.');
  if (C.refreshStatus(catalog, original.draft).mismatch) fail('The saved catalog basis differs. Reconcile pricing before changing this configuration.');
  const tempDeal = copy(deal), tempQuote = S.findQuote(tempDeal, quote.id);
  tempQuote.working.draft = C.newDraft(catalog, quote.machine_id);
  tempQuote.working.engineering = [];
  // The supplied line data only identifies catalog choices and quantities.
  for (const line of [...selected].sort((a,b) => Number(!['catalog_base','catalog_base_variant'].includes(a.line_class))-Number(!['catalog_base','catalog_base_variant'].includes(b.line_class)))) {
    const row = rowFor(catalog, quote.machine_id, line);
    if (!row || row.price_usd !== line.price_usd || (row.price_unit || 'lump_sum') !== line.price_unit || line.machine_id !== quote.machine_id) fail('A quote line does not match the authoritative catalog.');
    const saved = original.draft.lines.find(item => lineKey(item) === lineKey(line));
    for (const field of ['selling_price_override', 'selling_price_history']) {
      if (JSON.stringify(line[field]) !== JSON.stringify(saved?.[field])) fail('Use the authorized selling-price operation instead of changing pricing through the configuration editor.');
    }
    S.selectOption(catalog, tempDeal, tempQuote, row, { quantity: line.quantity });
    const normalized = tempQuote.working.draft.lines.find(item => lineKey(item) === lineKey(line));
    if (!normalized) fail('The selected catalog line could not be configured.');
    S.setQuoteQuantity(catalog, tempDeal, tempQuote, normalized.quote_line_id, line.quantity);
  }
  const rebuilt = tempQuote.working.draft.lines;
  if (rebuilt.length !== selected.length || rebuilt.some(line => !selected.some(target => lineKey(target) === lineKey(line)))) fail('Required companion options are missing from this configuration.');
  for (const requirement of original.engineering) if (requirement.option_id && !rebuilt.some(line => line.option_id === requirement.option_id)) fail('Remove the engineering requirement before removing its option.');
  const usedIds = new Set();
  const normalizedLines = rebuilt.map(line => {
    const target = selected.find(item => lineKey(item) === lineKey(line));
    const safeId = typeof target.quote_line_id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(target.quote_line_id) ? target.quote_line_id : line.quote_line_id;
    if (usedIds.has(safeId)) fail('Quote line identities must be unique.');
    usedIds.add(safeId);
    const saved = original.draft.lines.find(item => lineKey(item) === lineKey(line));
    return { ...line, quote_line_id: safeId,
      ...(saved?.selling_price_override ? { selling_price_override: copy(saved.selling_price_override) } : {}),
      ...(saved?.selling_price_history ? { selling_price_history: copy(saved.selling_price_history) } : {}) };
  });
  if (entry.working.editor_note != null && (typeof entry.working.editor_note !== 'string' || entry.working.editor_note.length > 10000)) fail('Keep the revision note under 10,000 characters.');
  const working = { ...copy(original), draft: { ...copy(original.draft), lines: normalizedLines, updated_at: new Date().toISOString() }, approvals: {} };
  if (entry.working.editor_note != null) working.editor_note = entry.working.editor_note;
  return applyQuoteEdit(state, { version: 1, dealId: deal.id, quoteId: quote.id, base: entry.base, working });
}


function importCatalogDraft(catalog, deal, serialized, label) {
  const imported=C.deserializeDraft(serialized);
  if(C.refreshStatus(catalog,imported).mismatch)fail('Reconcile the imported configuration with the current catalog first.');
  if(imported.pending_requests?.length)fail('Resolve pending catalog requests before importing.');
  const tempDeal=copy(deal),tempState={version:1,deals:[tempDeal]};
  const tempQuote=S.addQuote(catalog,tempDeal,{machine_id:imported.machine_id,label:label||'Imported configuration'});
  const entry={version:1,dealId:tempDeal.id,quoteId:tempQuote.id,base:quoteBasis(tempQuote.working),working:{...copy(tempQuote.working),draft:{...copy(tempQuote.working.draft),lines:imported.lines}}};
  const normalized=saveQuoteEdit(catalog,tempState,entry).working.draft;
  normalized.requirements={};
  for(const [key,value] of Object.entries(imported.requirements||{}))if(['company','contact','application','bag_width','bag_length','bag_dimensions','throughput','notes','project'].includes(key)&&typeof value==='string'&&value.length<=10000)normalized.requirements[key]=value;
  normalized.requirements.illustrative=Boolean(imported.requirements?.illustrative);
  if(imported.reference)normalized.reference=imported.reference;
  if(['complete_system','option_review','application_review'].includes(imported.request_scope))normalized.request_scope=imported.request_scope;
  return S.importDraft(catalog,deal,JSON.stringify(normalized),label);
}

export function previewReprice(catalog, state, dealId, quoteId, catalogVersion) {
  const deal=S.findDeal(state,dealId),quote=S.findQuote(deal,quoteId);
  if(!quote)fail('Quote not found.',404,'NOT_FOUND');
  if(quote.working.status!=='draft')fail('Create a draft revision before repricing.');
  const original=quote.working, tempDeal=copy(deal), tempQuote=S.findQuote(tempDeal,quoteId);
  const fresh=C.newDraft(catalog,quote.machine_id);
  tempQuote.working.draft=fresh;
  tempQuote.working.engineering=[];
  for(const old of [...original.draft.lines].sort((a,b)=>Number(!['catalog_base','catalog_base_variant'].includes(a.line_class))-Number(!['catalog_base','catalog_base_variant'].includes(b.line_class)))) {
    const row=rowFor(catalog,quote.machine_id,old);
    if(!row)fail(`${old.name} is no longer in the current catalog. Resolve this selection before repricing.`);
    S.selectOption(catalog,tempDeal,tempQuote,row,{quantity:old.quantity});
    const line=tempQuote.working.draft.lines.find(item=>lineKey(item)===lineKey(old));
    if(line)S.setQuoteQuantity(catalog,tempDeal,tempQuote,line.quote_line_id,old.quantity);
  }
  const lines=tempQuote.working.draft.lines.map(line=>{
    const old=original.draft.lines.find(item=>lineKey(item)===lineKey(line));
    const history=copy(old?.selling_price_history||[]);
    // Reconciliation deliberately restores the new catalog price. Carrying an old
    // override could silently introduce a markdown against the new catalog basis.
    if(old?.selling_price_override)history.push({action:'reprice_reset',price_usd:line.price_usd,catalog_price_usd:line.price_usd,catalog_price_unit:line.price_unit,previous_price_usd:S.lineUnitPrice(old),reason:'Selling price reset when the current catalog basis was accepted.',at:new Date().toISOString()});
    return {...line,quote_line_id:old?.quote_line_id||line.quote_line_id,...(history.length?{selling_price_history:history}:{})};
  });
  for(const requirement of original.engineering)if(requirement.option_id&&!lines.some(line=>line.option_id===requirement.option_id))fail('An engineering requirement refers to an option unavailable after repricing.');
  const draft={...copy(original.draft),...fresh,draft_id:original.draft.draft_id,created_at:original.draft.created_at,requirements:copy(original.draft.requirements||{}),lines};
  for(const field of ['request_scope','reference','inquiry','pending_requests'])if(original.draft[field]!==undefined)draft[field]=copy(original.draft[field]);
  const working={...copy(original),draft,approvals:{}};
  const changes=[];
  for(const line of lines){const before=original.draft.lines.find(item=>lineKey(item)===lineKey(line));if(!before||before.selling_price_override||before.price_usd!==line.price_usd||before.quantity!==line.quantity)changes.push({lineId:line.quote_line_id,name:line.name,kind:before?.selling_price_override?'override_reset':before?'price_changed':'added',before:before?{price:S.lineUnitPrice(before),quantity:before.quantity}:null,after:{price:line.price_usd,quantity:line.quantity}});}
  for(const before of original.draft.lines)if(!lines.some(line=>lineKey(line)===lineKey(before)))changes.push({lineId:before.quote_line_id,name:before.name,kind:'removed',before:{price:S.lineUnitPrice(before),quantity:before.quantity},after:null});
  if(JSON.stringify(original.draft.terms_snapshot)!==JSON.stringify(draft.terms_snapshot))changes.push({kind:'terms_changed',name:'Commercial terms and lead time',before:original.draft.terms_snapshot,after:draft.terms_snapshot});
  return {dealId,quoteId,revision:original.revision,catalogVersion,catalogHash:catalog.manifest.catalog_sha256,previousCatalogHash:original.draft.catalog_hash,changes,totalBefore:S.totals(original).total,totalAfter:S.totals(working).total,approvalsWillReset:true,working};
}

export function runCommand(catalog, state, command, args, user, context = {}) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) fail('Command args must be an object.');
  if (salesCommands.has(command) && !['sales','manager'].includes(user.role)) fail('This action requires Sales or Manager access.',403,'FORBIDDEN');
  const role = user.role, identity = { id: user.id, name: user.name };
  if(command==='setLaborRate'&&!['engineering','manager'].includes(role))fail('Engineering or Manager access is required.',403,'FORBIDDEN');
  if(['reviewQuote','requestQuoteChanges'].includes(command)&&((args.kind==='manager'&&role!=='manager')||(args.kind==='engineering'&&!['engineering','manager'].includes(role))))fail('Your role cannot perform this review.',403,'FORBIDDEN');
  if(command==='saveEngineering'&&role==='sales'&&['hours','materials'].some(k=>args.input?.[k]!=null&&args.input[k]!==''))fail('Engineering or Manager access is required to price an engineering requirement.',403,'FORBIDDEN');
  const deal = args.dealId ? S.findDeal(state,args.dealId) : null;
  const quote = args.quoteId ? S.findQuote(deal,args.quoteId) : null;
  if (args.dealId && !deal) fail('Deal not found.',404,'NOT_FOUND');
  if (args.quoteId && !quote) fail('Quote not found in this deal.',404,'NOT_FOUND');
  const requireDeal = () => { if (!deal) fail('Choose a deal.');return deal; };
  const requireQuote = () => { requireDeal();if(!quote) fail('Choose a quote.');return quote; };
  const input = args.input || {};
  const row = () => { const r=catalog.priceLines[args.rowIndex];if(!Number.isInteger(args.rowIndex)||!r||r.machine_id!==requireQuote().machine_id)fail('Choose a catalog option for this machine.');return r; };
  switch (command) {
    case 'createDeal': return S.createDeal(state,input);
    case 'createDemoScenario': return S.createDemoScenario(catalog,state);
    case 'updateDeal': return S.updateDeal(requireDeal(),args.input||args.patch||{});
    case 'updateScope': return S.updateScope(requireDeal(),args.input||args.scope||{});
    case 'addQuote': return S.addQuote(catalog,requireDeal(),input);
    case 'importDraft': return importCatalogDraft(catalog,requireDeal(),args.savedDraft,args.label);
    case 'repriceQuote': {
      if(!Number.isInteger(args.acceptedCatalogVersion)||args.acceptedCatalogVersion!==context.catalogVersion)fail('Review the current catalog price changes before applying them.',409,'CATALOG_CONFLICT');
      const preview=previewReprice(catalog,state,requireDeal().id,requireQuote().id,context.catalogVersion);
      return applyQuoteEdit(state,{version:1,dealId:deal.id,quoteId:quote.id,base:quoteBasis(quote.working),working:preview.working});
    }
    case 'selectOption': return S.selectOption(catalog,requireDeal(),requireQuote(),row(),args.options||{});
    case 'removeOption': return S.removeOption(catalog,requireDeal(),requireQuote(),args.lineId);
    case 'setQuoteQuantity': return S.setQuoteQuantity(catalog,requireDeal(),requireQuote(),args.lineId,args.quantity);
    case 'setLinePriceOverride': return S.setLinePriceOverride(catalog,requireDeal(),requireQuote(),args.lineId,input,role,identity);
    case 'clearLinePriceOverride': return S.clearLinePriceOverride(catalog,requireDeal(),requireQuote(),args.lineId,input,role,identity);
    case 'saveQuoteEdit': return saveQuoteEdit(catalog,state,args.entry);
    case 'saveEngineering': return S.saveEngineering(requireDeal(),requireQuote(),input,role);
    case 'removeEngineering': return S.removeEngineering(requireDeal(),requireQuote(),args.itemId);
    case 'setLaborRate': return S.setLaborRate(requireDeal(),requireQuote(),args.rate,role);
    case 'saveSpecial': return S.saveSpecial(requireDeal(),requireQuote(),input);
    case 'removeSpecial': return S.removeSpecial(requireDeal(),requireQuote(),args.itemId);
    case 'updateDiscount': return S.updateDiscount(requireDeal(),requireQuote(),input);
    case 'submitQuoteReview': return S.submitQuoteReview(catalog,requireDeal(),requireQuote(),args.kind,role,identity,args.note);
    case 'requestQuoteChanges': return S.requestQuoteChanges(catalog,requireDeal(),requireQuote(),args.kind,args.reason,role,identity);
    case 'reviewQuote': return S.reviewQuote(catalog,requireDeal(),requireQuote(),args.kind,role,identity);
    case 'issueQuote': return S.issueQuote(catalog,requireDeal(),requireQuote(),role,identity);
    case 'reviseQuote': return S.reviseQuote(requireDeal(),requireQuote(),args.note);
    case 'addEvidence': return S.addEvidence(requireDeal(),input);
    case 'addComment': return S.addComment(requireDeal(),{...input,author:user.name});
    case 'recoverLegacyComment': return S.recoverLegacyComment(requireDeal(),{...input,author:user.name});
    case 'chooseAlternative': return S.chooseAlternative(requireDeal(),requireQuote().id,args.proposalId);
    case 'publishProposal': return S.publishProposal(requireDeal(),args.manifest);
    case 'recordCustomerResponse': return S.recordCustomerResponse(requireDeal(),{...input,author:`${user.name} (seller preview)`});
    case 'reviseFromResponse': return S.reviseFromResponse(requireDeal(),args.responseId,args.quoteId);
    case 'renameQuote': if(S.renameQuote)return S.renameQuote(requireDeal(),requireQuote(),args.label,role); break;
    case 'duplicateQuote': if(S.duplicateQuote)return S.duplicateQuote(catalog,requireDeal(),requireQuote(),{label:args.label},role); break;
    case 'updateContacts': if(S.updateContacts)return S.updateContacts(requireDeal(),args.contacts,role); break;
    case 'markProposalPresented': if(S.markProposalPresented)return S.markProposalPresented(requireDeal(),args.proposalId,{actor:user.name,role}); break;
    case 'replyToResponse': if(S.replyToResponse)return S.replyToResponse(requireDeal(),args.responseId,{...input,author:user.name,actor:user.name,role}); break;
    case 'setResponseStatus': if(S.setResponseStatus)return S.setResponseStatus(requireDeal(),args.responseId,{status:args.status,reason:args.reason,author:user.name,role}); break;
  }
  fail('This workspace operation is not supported.');
}
