import { requestJSON } from './workspace-service.js';
import { proposalComparison, conciseLineDescription } from './proposal-comparison.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list = values => new Intl.ListFormat('en-US', {style:'long',type:'conjunction'}).format(values);
const money = value => Number.isFinite(value) ? new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(value) : 'Price pending';
const date = value => {
  // Follow-up dates are calendar dates; published/reply timestamps are instants.
  const parsed=new Date(/^\d{4}-\d{2}-\d{2}$/.test(value||'') ? `${value}T00:00:00` : value);
  return value && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'To confirm';
};
const text = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).filter(Boolean).join('\n\n') : value?.text ? text(value.text) : '';
const arrow = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5"/></svg>';
const commentIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 13H8l-4 3V5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1Z"/></svg>';
const sectionNames = {general:'Overall proposal',application:'Application',recommendation:'Equipment choice',equipment:'Equipment',options:'Configuration item',pricing:'Price',terms:'Terms & lead time'};
const recipientName = envelope => envelope.recipient?.name || envelope.recipient?.recipientName || envelope.recipient?.recipient_name || 'Reviewer';
const photoCaption = a => a.photo?.file ? 'Exact-model photo · Configuration defined by the quoted scope' : 'Model photograph to be confirmed';
const photo = a => a.photo?.file ? `<img src="/source/${esc(a.photo.file)}" alt="${esc(a.machine_title)} — source photograph" loading="lazy">` : '<div class="cr-no-media">Exact-model photograph pending.</div>';
const leadTime = a => a.terms?.lead_time?.min_weeks ? `${a.terms.lead_time.min_weeks}–${a.terms.lead_time.max_weeks ?? a.terms.lead_time.min_weeks} business weeks` : text(a.terms?.lead_time) || a.lead_time || 'Confirm with PAC';
const throughput = value => value ? `${value}${/bags|min/i.test(value) ? '' : ' bags/min'}` : 'To confirm';
const contextButton = (label, section, quoteId='', lineId='', className='cr-text-button') => `<button type="button" class="${className}" data-review="context" data-section="${section}" data-id="${esc(quoteId)}" data-line="${esc(lineId)}">${commentIcon}${esc(label)}</button>`;

/** Only offer anchors that belong to this immutable proposal, never a live draft. */
export function normalizeFeedback(envelope, input={}, selected='compare') {
  const alternatives=envelope.proposal.alternatives;
  const requested=Object.hasOwn(input,'quote_id') ? String(input.quote_id || '') : selected;
  const alternative=alternatives.find(a=>a.quote_id===requested);
  const lines=[...(alternative?.lines || []), ...(alternative?.included || [])];
  return {
    quote_id:alternative?.quote_id || '',
    kind:input.kind==='changes_requested' ? 'changes_requested' : 'question',
    section:Object.hasOwn(sectionNames,input.section) ? input.section : 'general',
    line_id:lines.some(line=>line.quote_line_id && line.quote_line_id===input.line_id) ? input.line_id : '',
    body:typeof input.body==='string' ? input.body : '',
  };
}

function termsMarkup(a) {
  const t=a.terms || {};
  const entries=[['Lead time',text(t.lead_time)],['Quote validity',text(t.quote_valid_days)],['Payment terms',text(t.payment_terms)],['Delivery',text(t.delivery_terms)],['Shipment',text(t.shipment)],['Standard warranty',t.warranty?.standard?.line_text || text(t.warranty?.standard)],['Warranty conditions',text(t.warranty?.terms)],['Application and feasibility',text(t.project_specifications)],['Factory acceptance test',text(t.fat)],['Financing',text(t.financing)]];
  if(a.lines.some(l=>l.line_class==='service')) entries.push(['Start-up and training',text(t.startup)]);
  return entries.filter(([,body])=>body).map(([label,body])=>`<div><h4>${label}</h4><p>${esc(body)}</p></div>`).join('');
}
function configuration(a, {print=false}={}) {
  return `<section class="cr-section cr-configuration"><div class="cr-section-heading"><div><h2>Configuration & pricing</h2><p>${esc(a.number)} · Rev ${esc(a.revision)}</p></div>${print?'':contextButton('Discuss pricing','pricing',a.quote_id)}</div><div class="cr-table-wrap" tabindex="0" role="region" aria-label="${esc(a.label)} configuration table"><table><caption class="cr-sr">${esc(a.label)} configuration in USD</caption><thead><tr><th scope="col">Equipment / service</th><th scope="col" class="num">Qty</th><th scope="col" class="num">Unit price</th><th scope="col" class="num">Amount</th>${print?'':'<th scope="col"><span class="cr-sr">Discuss item</span></th>'}</tr></thead><tbody>${a.lines.map(line=>`<tr><th scope="row"><strong>${esc(line.name)}</strong>${line.description?`<p>${esc(conciseLineDescription(line))}</p>${conciseLineDescription(line)!==line.description?`<details class="cr-source-detail"><summary>Full item specification</summary><p>${esc(line.description)}</p></details>`:''}`:''}${[...(line.conditions||[]),...(line.notes||[])].map(note=>`<p>${esc(note)}</p>`).join('')}</th><td class="num">${esc(line.quantity)}</td><td class="num">${money(line.price_usd)}<small>${esc((line.price_unit||'').replaceAll('_',' '))}</small></td><td class="num">${money(line.total??line.quantity*line.price_usd)}</td>${print?'':`<td class="cr-item-action">${line.quote_line_id?`<button type="button" data-review="context" data-section="options" data-id="${esc(a.quote_id)}" data-line="${esc(line.quote_line_id)}" class="cr-icon-button" aria-label="Ask about ${esc(line.name)}">${commentIcon}</button>`:''}</td>`}</tr>`).join('')}${[...(a.engineering||[]).map(e=>({...e,type:'Engineering requirement'})),...(a.special||[]).map(e=>({...e,type:'Special order'}))].map(line=>`<tr><th scope="row"><strong>${esc(line.description)}</strong><p>${line.type}${line.lead_time?' · '+esc(line.lead_time):''}</p></th><td class="num">1</td><td class="num">${money(line.price)}</td><td class="num">${money(line.price)}</td>${print?'':'<td></td>'}</tr>`).join('')}</tbody><tfoot>${a.totals.discount?`<tr><th colspan="3">Discount</th><td class="num">−${money(a.totals.discount)}</td>${print?'':'<td></td>'}</tr>`:''}<tr><th colspan="3">Quote total · USD</th><td class="num">${money(a.totals.total)}</td>${print?'':'<td></td>'}</tr></tfoot></table></div><p class="cr-muted cr-table-note">Freight and tax are excluded unless explicitly listed. Additional warranty coverage applies only when included in the quoted scope.</p>${(a.included||[]).length?`<details class="cr-details"><summary>Included base features <span>${(a.included||[]).length} items</span></summary><ul>${(a.included||[]).map(line=>`<li>${esc(line.name)}</li>`).join('')}</ul></details>`:''}<details class="cr-details"><summary>Commercial terms & conditions</summary><div class="cr-terms">${termsMarkup(a)}</div>${print?'':contextButton('Ask about terms','terms',a.quote_id)}</details></section>`;
}
function resourcesMarkup(alternatives) {
  const items=alternatives.flatMap(a=>(a.resources||[]).map(item=>({...item,machine_title:a.machine_title})));
  const resources=items.filter((item,index)=>/^https:\/\/(?:www\.)?(?:pacmachinery\.com|youtube\.com)\//.test(item.url||'') && items.findIndex(other=>other.url===item.url)===index);
  if(!resources.length && alternatives.some(a=>a.machine_id==='r3200'))return `<section class="cr-section cr-video"><div><h2>See the equipment at work</h2><p>Official PAC R3200 application example. Shown options may differ from your quoted configuration.</p></div><a class="cr-button" href="https://www.youtube.com/watch?v=nYCpXU1llI4" target="_blank" rel="noopener noreferrer">Watch the R3200 application video ${arrow}</a></section>`;
  if(!resources.length)return '';
  return `<section class="cr-section cr-resources"><div class="cr-section-heading"><div><h2>Equipment references</h2><p>Official resources for the quoted equipment. Current website specifications may differ; this proposal's issued scope governs the offer.</p></div></div>${resources.map(item=>`<div class="cr-resource-row"><div><h3>${esc(item.title)}</h3><p>${esc(item.scope)}</p></div><a class="cr-button" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${item.type==='video'?'Watch video':'Open product resource'} ${arrow}<span class="cr-sr">${esc(item.title)}</span></a></div>`).join('')}</section>`;
}
function optionMediaMarkup(a) {
  const media=(a.media||[]).filter(item=>/^media\/[a-zA-Z0-9_./-]+$/.test(item.file||'') && a.lines.some(line=>line.option_id===item.option_id));
  if(!media.length)return '';
  return `<section class="cr-section cr-option-media"><div class="cr-section-heading"><div><h2>A closer look at the selected options</h2><p>These references explain individual options. The quoted line items define the complete configuration.</p></div></div><div class="cr-option-media-grid">${media.map(item=>`<figure><img src="/source/${esc(item.file)}" alt="${esc(item.title)} — catalog option reference" loading="lazy"><figcaption><strong>${esc(item.title)}</strong><span>${item.scope==='model_option'?'Model option reference':'Generic option reference · Not a photograph of the assembled configuration'}</span></figcaption></figure>`).join('')}</div></section>`;
}
function evidenceMarkup(e) {
  const preview=e.reference?.preview?.dataUrl;
  const safePreview=/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(preview||'') ? preview : null;
  return `<article class="cr-evidence">${safePreview?`<img src="${safePreview}" alt="${esc(e.title)} captured reference">`:''}<div><h3>${esc(e.title)}</h3><p>${esc(e.note)}</p><small>${esc(e.source_label||'Reference assembly — not approved PAC CAD')}</small></div></article>`;
}
function responseContext(p, response) {
  const a=p.alternatives.find(a=>a.quote_id===response.quote_id);
  const line=[...(a?.lines||[]),...(a?.included||[])].find(l=>l.quote_line_id===response.line_id);
  return [`Proposal V${response.proposal_version||p.proposal_version}`,a?`${a.label} · Rev ${response.revision??a.revision}`:'Overall proposal',line?.name || sectionNames[response.section] || 'General'].join(' · ');
}
function discussion(p, envelope, a, feedback, contextOpen=false) {
  const f=normalizeFeedback(envelope,feedback,a?.quote_id);
  const anchored=p.alternatives.find(option=>option.quote_id===f.quote_id);
  const lines=[...(anchored?.lines||[]),...(anchored?.included||[])].filter(line=>line.quote_line_id);
  const responses=[...(p.responses||[]),...(p.comments||[])].sort((left,right)=>(right.at||'').localeCompare(left.at||''));
  const statuses={open:'Open',in_progress:'PAC is preparing a revision',addressed:'Revised proposal available',resolved:'Resolved',declined:'Response from PAC'};
  return `<section class="cr-section cr-discussion" id="review-discussion" tabindex="-1"><div class="cr-section-heading"><div><h2>Keep the conversation moving</h2><p>Your feedback stays with Version ${esc(p.proposal_version)}${anchored?' and '+esc(anchored.label):''}.</p></div><span class="cr-count">${responses.length} ${responses.length===1?'response':'responses'}</span></div><div class="cr-discussion-layout"><div class="cr-compose"><h3>${f.kind==='changes_requested'?'Request a configuration change':'Ask PAC a question'}</h3><form id="customer-feedback"><details class="cr-feedback-context full" ${contextOpen?'open':''}><summary>${esc(anchored?.label||'Overall proposal')}${anchored||f.section!=='general'?` · ${esc(lines.find(line=>line.quote_line_id===f.line_id)?.name||sectionNames[f.section])}`:''}<span>Change context</span></summary><div class="cr-context-fields"><label>About<select name="quote_id"><option value="">Overall proposal</option>${p.alternatives.map(option=>`<option value="${esc(option.quote_id)}" ${f.quote_id===option.quote_id?'selected':''}>${esc(option.label)} · Rev ${esc(option.revision)}</option>`).join('')}</select></label><label>Feedback type<select name="kind"><option value="question" ${f.kind==='question'?'selected':''}>Ask a question</option><option value="changes_requested" ${f.kind==='changes_requested'?'selected':''}>Request a change</option></select></label><label>Section<select name="section">${Object.entries(sectionNames).map(([value,label])=>`<option value="${value}" ${value===f.section?'selected':''}>${label}</option>`).join('')}</select></label><label>Configuration item<select name="line_id" ${lines.length?'':'disabled'}><option value="">${lines.length?'Entire section':'Choose an alternative first'}</option>${lines.map(line=>`<option value="${esc(line.quote_line_id)}" ${f.line_id===line.quote_line_id?'selected':''}>${esc(line.name)}</option>`).join('')}</select></label></div></details><label class="full">Message<textarea name="body" required rows="4" maxlength="10000" placeholder="What would you like PAC to clarify or change?">${esc(f.body)}</textarea></label><p class="cr-attribution full">Feedback from this link is recorded as <strong>${esc(recipientName(envelope))}</strong>. Ask PAC for a separate review link for another team member.</p><div class="full cr-actions"><button type="submit" class="cr-button cr-primary">Send feedback ${arrow}</button><span class="cr-muted">Saved to this proposal</span></div><p id="feedback-error" class="cr-error full" role="alert"></p></form></div><div class="cr-discussion-history"><h3>Conversation on this version</h3>${responses.map(response=>`<article><div class="cr-message-meta"><strong>${esc(response.author)}</strong><time>${date(response.at)}</time></div><p class="cr-message-context">${esc(responseContext(p,response))}</p>${response.kind?`<div class="cr-message-state"><span>${response.kind==='changes_requested'?'Change request':'Question'}</span><span>${esc(statuses[response.status]||'Open')}</span></div>`:''}<p class="cr-message-body">${esc(response.body)}</p>${(response.replies||[]).map(reply=>`<blockquote><div class="cr-message-meta"><strong>${esc(reply.author)}</strong><time>${date(reply.at)}</time></div><p>${esc(reply.body)}</p></blockquote>`).join('')}${response.resolution?`<p class="cr-resolution">${esc(response.resolution.reason)}</p>`:''}${response.addressed_in_proposal_id?'<p class="cr-resolution">PAC has published a revised proposal. Ask your representative for its review link; this version remains unchanged.</p>':''}</article>`).join('')||'<div class="cr-empty-discussion"><h4>No questions yet</h4><p>Discuss application fit, equipment options, pricing or lead time. PAC can respond here against the same published version.</p></div>'}</div></div></section>`;
}
function compare(p) {
  const model=proposalComparison(p);
  const lineAmount=line=>line ? money(line.total ?? line.price ?? line.quantity*line.price_usd) : 'Not included';
  const differenceValue=line=>line ? `<strong>${lineAmount(line)}</strong>${line.quantity>1?`<small>Quantity ${esc(line.quantity)}</small>`:''}${line.lead_time?`<small>${esc(line.lead_time)}</small>`:''}` : '<span class="cr-muted">Not included</span>';
  return `<section class="cr-compare"><div class="cr-section-heading"><div><h2>${esc(model.title)}</h2><p>${esc(model.summary)}</p></div></div>
  ${model.commonPhoto?`<div class="cr-shared-equipment"><figure>${photo(model.commonPhoto)}<figcaption>${photoCaption(model.commonPhoto)}</figcaption></figure><div><h3>${esc(model.commonPhoto.machine_title)}</h3><p>The same base equipment, with the differences below. The photograph identifies the model; the line items define each configuration.</p>${model.shared.length?`<h4>Included in every alternative</h4><ul>${model.shared.map(row=>`<li>${esc(row.label)}${row.values[0].quantity>1?` · Qty ${esc(row.values[0].quantity)}`:''}</li>`).join('')}</ul>`:''}</div></div>`:''}
  <div class="cr-compare-grid">${p.alternatives.map((a,index)=>{const info=model.alternatives[index];return `<article>${!model.commonPhoto?`<figure>${photo(a)}<figcaption>${photoCaption(a)}</figcaption></figure>`:''}<div class="cr-option-heading"><h3>${esc(a.label)}</h3>${p.selected_quote_id===a.quote_id?'<span class="cr-preferred">Preferred</span>':''}</div>${!model.sameMachine?`<p class="cr-model">${esc(a.machine_title)}</p>`:''}<p class="cr-approach">${esc(info.summary)}</p><strong class="cr-compare-price">${money(a.totals.total)}<span>Quoted investment · USD</span></strong>${index?`<p class="cr-price-delta">${info.delta===0?'Same investment':`${info.delta>0?'+':'−'}${money(Math.abs(info.delta))}`} compared with ${esc(info.compared_with)}</p>`:''}<dl><div><dt>Estimated lead time</dt><dd>${esc(leadTime(a))}</dd></div>${(a.special||[]).some(item=>item.lead_time)||a.lead_time_notes?.length?`<div><dt>Schedule conditions</dt><dd>${esc([...(a.lead_time_notes||[]),...(a.special||[]).filter(item=>item.lead_time).map(item=>item.lead_time)].join(' '))}</dd></div>`:''}<div><dt>Configuration</dt><dd>${esc(a.number)} · Rev ${esc(a.revision)}</dd></div></dl><button type="button" data-review="alternative" data-id="${esc(a.quote_id)}" class="cr-button cr-option-open">View configuration ${arrow}</button>${contextButton(`Discuss ${a.label}`,'recommendation',a.quote_id)}</article>`;}).join('')}</div>
  ${model.differences.length?`<div class="cr-comparison-detail"><h3>What changes between the alternatives</h3><div class="cr-table-wrap" tabindex="0" role="region" aria-label="Comparison of published alternatives"><table class="cr-difference-table"><thead><tr><th scope="col">Quoted difference</th>${p.alternatives.map(a=>`<th scope="col">${esc(a.label)}</th>`).join('')}</tr></thead><tbody>${model.differences.map(row=>`<tr><th scope="row"><strong>${esc(row.label)}</strong>${conciseLineDescription(row.values.find(Boolean))?`<p>${esc(conciseLineDescription(row.values.find(Boolean)))}</p>`:''}</th>${row.values.map(line=>`<td>${differenceValue(line)}</td>`).join('')}</tr>`).join('')}${p.alternatives.some(a=>a.totals.discount)?`<tr><th scope="row">Quoted discount</th>${p.alternatives.map(a=>`<td>${money(a.totals.discount)}</td>`).join('')}</tr>`:''}</tbody></table></div></div>`:''}
  ${model.alternatives.slice(1).filter(info=>info.delta!==0).map(info=>`<div class="cr-delta-explanation"><h3>What does the ${money(Math.abs(info.delta))} difference cover?</h3><p>${esc(info.label)} compared with ${esc(info.compared_with)}${info.added.length?` adds ${esc(list(info.added.map(line=>line.name)))}`:''}${info.removed.length?`${info.added.length?'; ':': '}omits ${esc(list(info.removed.map(line=>line.name)))}`:''}${info.changed.length?`${info.added.length||info.removed.length?'; ':': '}changes ${esc(list(info.changed.map(row=>row.label)))}`:''}${info.discount_delta?`${info.added.length||info.removed.length||info.changed.length?'; ':': '}includes a different quoted discount`:''}. Review these scope and commercial differences with PAC against your application.</p></div>`).join('')}
  <p class="cr-comparison-footnote">Freight and tax are excluded unless listed. Confirm application fit, samples, bag material and delivery conditions with PAC before proceeding. Discussing an alternative is not an order or acceptance.</p></section>`;
}
export function renderCustomerReview(envelope,{selected='compare',feedback={},contextOpen=false}={}) {
  const p=envelope.proposal, a=p.alternatives.find(option=>option.quote_id===selected);
  const alternatives=a?[a]:p.alternatives;
  const evidence=(p.evidence||[]).filter(e=>!a||!e.quote_id||e.quote_id===a.quote_id);
  const notes=a?[...(a.lead_time_notes||[]),...(a.special||[]).filter(s=>s.lead_time).map(s=>`${s.description}: ${s.lead_time}`)]:[];
  const tabs=[{quote_id:'compare',label:'Compare alternatives'},...p.alternatives];
  return `<header class="cr-header"><img src="/assets/pac-machinery-logo.png" alt="PAC Machinery" width="184"><div class="cr-document-id"><strong>Equipment proposal</strong><span>${esc(p.number)} · Published V${esc(p.proposal_version)}</span></div><button type="button" data-review="print" class="cr-button">Print / save PDF</button></header><main id="proposal-content" class="cr-main" tabindex="-1"><section class="cr-intro"><div class="cr-intro-copy"><h1>${esc(p.title)}</h1><p class="cr-customer">Prepared for ${esc(p.customer)}</p><p class="cr-scope">${esc(p.scope?.application||'Review the equipment and application with your PAC representative.')}</p>${p.scope?.notes?`<p class="cr-application-notes">${esc(p.scope.notes)}</p>`:''}<dl class="cr-application-facts"><div><dt>Bag dimensions</dt><dd>${esc(p.scope?.bag_dimensions||'To confirm')}</dd></div><div><dt>Target throughput</dt><dd>${esc(throughput(p.scope?.throughput))}</dd></div><div><dt>Published</dt><dd>${date(p.published_at)}</dd></div></dl>${contextButton('Discuss the application','application')}</div><aside class="cr-next-step"><h2>Your next decision</h2><p>${esc(p.customer_next_decision||'Review the alternatives with your PAC representative and confirm the best fit for your application.')}</p><dl><div><dt>Your PAC contact</dt><dd>${esc(p.owner||'PAC sales team')}</dd></div>${p.customer_decision_date?`<div><dt>Decision target</dt><dd>${date(p.customer_decision_date)}</dd></div>`:''}</dl><button type="button" class="cr-button cr-primary" data-review="context" data-section="general">Ask a question ${arrow}</button></aside></section><div class="cr-version-note"><span>Proposal V${esc(p.proposal_version)} · Published configuration</span><span>Review link for ${esc(recipientName(envelope))}</span></div>
  <nav class="cr-tabs" role="tablist" aria-label="Configuration alternatives">${tabs.map(option=>`<button type="button" role="tab" id="review-tab-${esc(option.quote_id)}" aria-controls="review-alternative" data-review="alternative" data-id="${esc(option.quote_id)}" aria-selected="${option.quote_id===(a?.quote_id||'compare')}" tabindex="${option.quote_id===(a?.quote_id||'compare')?'0':'-1'}">${esc(option.label)}</button>`).join('')}</nav><div id="review-alternative" role="tabpanel" aria-labelledby="review-tab-${esc(a?.quote_id||'compare')}">
  ${a?`<section class="cr-solution"><figure>${photo(a)}<figcaption>${photoCaption(a)}</figcaption></figure><div><p class="cr-revision">${esc(a.number)} · Rev ${esc(a.revision)}</p><h2>${esc(a.machine_title)}</h2><p class="cr-model">${esc(a.label)}</p><div class="cr-investment">${money(a.totals.total)}<span>Quoted investment · USD</span></div><dl><div><dt>Bag dimensions</dt><dd>${esc(a.scope?.bag_dimensions||'To confirm')}</dd></div><div><dt>Target throughput</dt><dd>${esc(throughput(a.scope?.throughput))}</dd></div><div><dt>Estimated lead time</dt><dd>${esc(leadTime(a))}</dd></div></dl>${notes.length?`<div class="cr-lead-notes"><strong>Lead-time conditions</strong>${notes.map(note=>`<p>${esc(note)}</p>`).join('')}</div>`:''}<div class="cr-actions"><button type="button" class="cr-button cr-primary" data-review="request" data-id="${esc(a.quote_id)}">Request a change ${arrow}</button><button type="button" class="cr-button" data-review="preference" data-id="${esc(a.quote_id)}" aria-pressed="${p.selected_quote_id===a.quote_id}">${p.selected_quote_id===a.quote_id?'Preferred alternative':'Mark as preferred'}</button></div><p class="cr-muted">Preference records your discussion. It is not an order or acceptance.</p></div></section>${configuration(a)}${optionMediaMarkup(a)}`:compare(p)}</div>
  ${resourcesMarkup(alternatives)}
  ${evidence.length?`<section class="cr-section cr-reference-section"><h2>Application references</h2><p class="cr-muted">Supporting references are separate from the priced equipment scope.</p><div class="cr-evidence-grid">${evidence.map(evidenceMarkup).join('')}</div></section>`:''}
  ${discussion(p,envelope,a,feedback,contextOpen)}<footer class="cr-footer"><span>${esc(p.number)} · Proposal V${esc(p.proposal_version)} · Prepared by ${esc(p.owner)}</span><span>${p.illustrative?'Illustrative customer and commercial proposal.':''}</span></footer><div class="cr-print-all">${p.alternatives.map(option=>`<section><div class="cr-print-option-heading"><h2>${esc(option.label)}</h2><strong>${money(option.totals.total)} USD</strong></div><p>${esc(option.machine_title)} · ${esc(option.number)} · Rev ${esc(option.revision)}</p><p>${esc(option.scope?.application||p.scope?.application)}<br>${esc(option.scope?.bag_dimensions||'')} · ${esc(throughput(option.scope?.throughput))}</p>${configuration(option,{print:true}).replaceAll('<details ', '<section ').replaceAll('</details>', '</section>').replaceAll('<summary>', '<h3>').replaceAll('</summary>', '</h3>')}${(option.evidence||[]).map(evidenceMarkup).join('')}</section>`).join('')}</div></main>`;
}

if(typeof document!=='undefined' && document.getElementById('customer-app')) {
  const app=document.getElementById('customer-app');
  let token=location.hash.slice(1), envelope, selected='compare', feedback={}, requestId=null, pending=false, loadSequence=0, preferenceRequest=null, contextOpen=false;
  const key=()=>`pac.customer.feedback.${token}`;
  const notify=message=>{document.getElementById('review-status').textContent=message;};
  function restore() {
    feedback={};requestId=null;
    try {const saved=JSON.parse(sessionStorage.getItem(key())||'{}');feedback=saved.feedback||saved;requestId=saved.requestId||null;}catch{}
  }
  function persist() {try{sessionStorage.setItem(key(),JSON.stringify({feedback,requestId}));}catch{}}
  function remember() {const form=document.getElementById('customer-feedback');if(form){feedback=normalizeFeedback(envelope,Object.fromEntries(new FormData(form)));persist();}}
  const draw=()=>{app.innerHTML=renderCustomerReview(envelope,{selected,feedback,contextOpen});};
  function focusFeedback() {const form=document.getElementById('customer-feedback');form.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});form.elements.body.focus({preventScroll:true});}
  async function load({preserve=false}={}) {
    const sequence=++loadSequence, expectedToken=token;
    try {
      if(!/^[a-zA-Z0-9_-]{20,200}$/.test(token))throw new Error('This review link is incomplete. Ask your PAC representative for a new link.');
      const received=await requestJSON(`/api/customer/${encodeURIComponent(token)}`);
      if(sequence!==loadSequence||token!==expectedToken)return;
      envelope=received;feedback=normalizeFeedback(envelope,feedback,selected);draw();
    } catch(error) {
      if(sequence!==loadSequence||token!==expectedToken)return;
      if(preserve && envelope && ![401,403,404,410].includes(error.status)){notify('Could not refresh the discussion. Your message is retained; try again when connected.');return;}
      envelope=null;
      app.innerHTML=`<main class="cr-state"><img src="/assets/pac-machinery-logo.png" width="220" alt="PAC Machinery"><h1>This proposal is unavailable</h1><p>${esc(error.message)}</p><p>Ask your PAC representative to confirm access or provide a new review link.</p><button type="button" class="cr-button" data-review="retry">Try again</button></main>`;
    }
  }
  restore();
  document.querySelector('.cr-skip')?.addEventListener('click',event=>{event.preventDefault();const target=document.getElementById('proposal-content');target?.focus();target?.scrollIntoView({block:'start'});});
  app.addEventListener('toggle',event=>{if(event.target.matches('.cr-feedback-context'))contextOpen=event.target.open;},true);
  app.addEventListener('input',event=>{if(event.target.closest('#customer-feedback')){requestId=null;remember();}});
  app.addEventListener('change',event=>{
    if(!event.target.closest('#customer-feedback'))return;
    requestId=null;remember();
    if(event.target.name==='quote_id'){contextOpen=true;feedback.line_id='';persist();draw();document.querySelector('[name="quote_id"]')?.focus();}
    if(event.target.name==='line_id' && feedback.line_id){feedback.section='options';persist();document.querySelector('[name="section"]').value='options';}
    if(event.target.name==='kind')document.querySelector('.cr-compose > h3').textContent=feedback.kind==='changes_requested'?'Request a configuration change':'Ask PAC a question';
  });
  app.addEventListener('keydown',event=>{
    const tab=event.target.closest('[role="tab"]');
    if(!tab || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key) || pending)return;
    event.preventDefault();const tabs=[...document.querySelectorAll('.cr-tabs [role="tab"]')], index=tabs.indexOf(tab);
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length;
    remember();selected=tabs[next].dataset.id;draw();document.getElementById(`review-tab-${selected}`)?.focus();
  });
  app.addEventListener('click',async event=>{
    const button=event.target.closest('[data-review]');if(!button||pending)return;
    const action=button.dataset.review;
    if(action==='print'){window.print();return;}
    if(action==='retry'){void load();return;}
    if(action==='alternative'){remember();selected=button.dataset.id;draw();document.getElementById(`review-tab-${selected}`)?.focus({preventScroll:true});return;}
    if(action==='context'||action==='request'){
      remember();requestId=null;
      feedback=normalizeFeedback(envelope,{...feedback,quote_id:button.dataset.id||'',section:button.dataset.section||'general',line_id:button.dataset.line||'',kind:action==='request'?'changes_requested':'question'});
      persist();draw();focusFeedback();return;
    }
    if(action==='preference'){
      const submittingToken=token;
      pending=true;button.disabled=true;remember();
      if(preferenceRequest?.token!==token || preferenceRequest?.quoteId!==button.dataset.id)preferenceRequest={token,quoteId:button.dataset.id,requestId:crypto.randomUUID()};
      try {
        const received=await requestJSON(`/api/customer/${encodeURIComponent(token)}/preference`,{method:'POST',body:{quoteId:preferenceRequest.quoteId,requestId:preferenceRequest.requestId}});
        if(token!==submittingToken)return;
        envelope=received;preferenceRequest=null;draw();notify('Preference saved for this proposal. It is not an order or acceptance.');
      } catch(error){if(token!==submittingToken)return;if(error.status)preferenceRequest=null;notify(error.message);button.disabled=false;}finally{pending=false;}
    }
  });
  app.addEventListener('submit',async event=>{
    if(event.target.id!=='customer-feedback')return;
    event.preventDefault();if(pending)return;
    remember();requestId ||= crypto.randomUUID();persist();
    const form=event.target, button=form.querySelector('[type="submit"]'), submittingToken=token;
    const enabledControls=[...form.elements].filter(control=>!control.disabled);
    enabledControls.forEach(control=>{control.disabled=true;});button.textContent='Sending…';form.setAttribute('aria-busy','true');pending=true;
    try {
      const received=await requestJSON(`/api/customer/${encodeURIComponent(token)}/responses`,{method:'POST',body:{...feedback,requestId}});
      if(token!==submittingToken)return;
      envelope=received;feedback={};requestId=null;try{sessionStorage.removeItem(key());}catch{}
      draw();notify('Your feedback was saved to this proposal.');
      document.querySelector('.cr-discussion-history')?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    } catch(error) {
      if(token!==submittingToken)return;
      // Retain the same request ID after an ambiguous network failure, including reload.
      if(error.status){requestId=null;persist();}
      document.getElementById('feedback-error').textContent=error.message;
      enabledControls.forEach(control=>{control.disabled=false;});button.innerHTML=`Send feedback ${arrow}`;form.removeAttribute('aria-busy');
    } finally {pending=false;}
  });
  window.addEventListener('focus',()=>{if(envelope&&!pending&&!document.activeElement?.closest('#customer-feedback')){remember();void load({preserve:true});}});
  window.addEventListener('hashchange',()=>{
    const next=location.hash.slice(1);if(next===token)return;
    token=next;envelope=null;selected='compare';preferenceRequest=null;document.getElementById('review-status').textContent='';restore();
    app.innerHTML='<main class="cr-state"><h1>Opening your proposal…</h1><p>Checking your review link.</p></main>';void load();
  });
  void load();
}
