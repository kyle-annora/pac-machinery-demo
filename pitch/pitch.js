const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const escape = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7"/></svg>';
const external = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
const local = ['localhost','127.0.0.1','::1','[::1]'].includes(location.hostname);
const runtime = window.PAC_PITCH_RUNTIME || {};
function productLink(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value, location.href);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    if (!local && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)) return '';
    return value;
  } catch { return ''; }
}
let content, active = 0, mode = new URLSearchParams(location.search).get('view') || (matchMedia('(max-width:700px)').matches ? 'read' : 'present');
let observer, notificationTimer;
const e = escape;
const imageButton = (src, caption, alt) => `<button class="image-button" data-image="${e(src)}" data-caption="${e(caption)}" aria-label="Enlarge captured view: ${e(alt)}"><img src="${e(src)}" alt="${e(alt)}" decoding="async"><span class="expand-hint">Inspect capture ${external}</span></button>`;
const head = c => `<div class="chapter-head"><h2 tabindex="-1">${e(c.title)}</h2><p class="intro">${e(c.intro)}</p></div>`;
const footer = c => `<p class="takeaway">${e(c.takeaway)}</p>`;
const list = a => `<ul class="check-list">${a.map(v=>`<li>${e(v)}</li>`).join('')}</ul>`;
function proof(c) {
  const isWeb = c.id === 'buyer-experience';
  const live = productLink(isWeb ? runtime.websiteUrl : runtime.workspaceUrl);
  return `${head(c)}<div class="proof-layout"><div class="proof-copy"><div class="proof-tabs" role="tablist" aria-label="${isWeb?'Website':'Workspace'} captured walkthrough" aria-orientation="vertical">${c.proof.map((s,i)=>`<button role="tab" id="${c.id}-tab-${i}" aria-controls="${c.id}-panel-${i}" aria-selected="${i===0}" tabindex="${i===0?'0':'-1'}" data-proof="${c.id}" data-index="${i}"><span>${i+1}</span>${e(s.label)}</button>`).join('')}</div>${c.proof.map((s,i)=>`<div class="proof-text" data-copy="${c.id}-${i}" ${i?'hidden':''}><h3>${e(s.title)}</h3><p>${e(s.body)}</p></div>`).join('')}${live?`<div class="demo-link"><a href="${e(live)}" target="_blank" rel="noopener" class="quiet-link">Open ${local?'local ':''}${isWeb?'Website':'Sales Workspace'} ${external}</a></div><p class="local-caption">${runtime.staticPreview?'Browser-local preview · Shared customer review requires a server':local?'Presenter’s computer only · Separate product tab':isWeb?'Separate buyer experience':'Separate sales experience · Workspace sign-in required'}</p>`:''}</div><div class="proof-stage">${c.proof.map((s,i)=>`<figure class="proof-panel" id="${c.id}-panel-${i}" role="tabpanel" aria-labelledby="${c.id}-tab-${i}" ${i?'hidden':''}>${imageButton(s.image,s.caption,s.label)}<figcaption>${e(s.caption)}</figcaption></figure>`).join('')}</div></div><p class="reading-only subcopy">${e(c.detail)}</p>${footer(c)}`;
}
function chapter(c) {
  let body;
  switch(c.id) {
    case 'opportunity': body=`<div class="cover artifact-cover"><div class="cover-copy"><h1 tabindex="-1">${e(c.title)}</h1><p class="intro">${e(c.intro)}</p><p class="subcopy">${e(c.detail)}</p><a class="primary-link" href="#priorities">See the two experiences ${arrow}</a></div><div class="cover-art"><div class="cover-tabs" role="tablist" aria-label="Two independent artifacts">${c.proof.map((s,i)=>`<button role="tab" id="${c.id}-tab-${i}" aria-controls="${c.id}-panel-${i}" aria-selected="${i===0}" tabindex="${i===0?'0':'-1'}" data-proof="${c.id}" data-index="${i}">${e(s.label)}</button>`).join('')}</div>${c.proof.map((s,i)=>`<div class="cover-proof-copy" data-copy="${c.id}-${i}" ${i?'hidden':''}><h3>${e(s.title)}</h3><p>${e(s.body)}</p></div><figure id="${c.id}-panel-${i}" role="tabpanel" aria-labelledby="${c.id}-tab-${i}" ${i?'hidden':''}>${imageButton(s.image,s.caption,s.label==='Website'?'Current Website buyer view':'Current published proposal alternatives')}<figcaption>${e(s.caption)}</figcaption></figure>`).join('')}</div></div>${footer(c)}`;break;
    case 'priorities':body=`${head(c)}<div class="artifact-pair">${c.artifacts.map((a,i)=>`<section class="artifact-summary ${i?'website-summary':'workspace-summary'}"><div class="artifact-heading"><h3>${e(a.name)}</h3><span>${e(a.role)}</span></div>${imageButton(a.image,i?'Captured Website buyer view · AI-assisted homepage studio image; original product photos available.':'Captured Sales Workspace · Published V1, two issued alternatives. Illustrative customer.',a.name)}<div class="artifact-explanation"><h4>${e(a.title)}</h4><p>${e(a.body)}</p></div><a href="#${e(a.target)}" class="quiet-link">${e(a.action)} ${arrow}</a></section>`).join('')}</div><div class="baseline-strip"><p>${e(c.detail)}</p><div class="baseline">${c.baseline.map(v=>`<div><strong>${e(v.value)}</strong><span>${e(v.label)}</span></div>`).join('')}</div></div><p class="source-note">${e(c.caption)}</p>${footer(c)}`;break;
    case 'buyer-experience': case 'sales-workspace':body=proof(c);break;
    case 'trial-scope':body=`${head(c)}<p class="scope-intro">${e(c.detail)}</p><div class="trial-layout"><ul class="scope-list">${c.scope.map(s=>`<li><strong>${e(s.value)}</strong><p>${e(s.body)}</p></li>`).join('')}</ul><div><div class="deliverables"><h3>What PAC gets</h3>${list(c.deliverables)}</div><p class="boundary">${e(c.boundary)}</p></div></div>${footer(c)}`;break;
    case 'evaluation':body=`${head(c)}<div class="timeline">${c.timeline.map(s=>`<section><p class="period">${e(s.period)}</p><h3>${e(s.title)}</h3><p>${e(s.body)}</p></section>`).join('')}</div><table class="scorecard"><caption class="sr-only">Proposed trial scorecard</caption><thead><tr><th scope="col">What we evaluate</th><th scope="col">Evidence to review</th><th scope="col">Role in the decision</th></tr></thead><tbody>${c.scorecard.map(s=>`<tr><td>${e(s.name)}</td><td>${e(s.check)}</td><td>${e(s.type)}</td></tr>`).join('')}</tbody></table>${footer(c)}`;break;
    case 'continuation':body=`${head({...c,intro:c.detail})}<div class="decision-layout"><section class="trial-evidence"><h3>What we review after two weeks</h3><p class="trial-proposed">${e(c.scope)}</p><table class="trial-outcomes"><thead><tr><th scope="col">PAC completes</th><th scope="col">We accept it when</th></tr></thead><tbody>${c.trialRows.map(r=>`<tr><th scope="row"><strong>${e(r.title)}</strong><span>${e(r.output)}</span></th><td>${e(r.accept)}</td></tr>`).join('')}</tbody></table><p class="trial-result">${e(c.trialResult)}</p></section><section class="ongoing-value"><h3>Why keep using it?</h3>${c.value.map(v=>`<div><h4>${e(v.title)}</h4><p>${e(v.body)}</p></div>`).join('')}</section></div><div class="trial-offer-bar"><div><h3>${e(c.offerTitle)}</h3><p>${e(c.offerTerms)} <strong>${e(c.offerAssurance)}</strong></p></div><button class="primary-button" id="discuss-trial" aria-expanded="false" aria-controls="discussion">Agree the trial brief ${arrow}</button></div><section class="discussion decision-agenda" id="discussion" tabindex="-1" hidden><h3>Agree the scope before Day 1</h3><ol>${c.decisions.map(v=>`<li>${e(v)}</li>`).join('')}</ol><p class="boundary">${e(c.boundary)}</p><a class="quiet-link" href="downloads/pac-trial-brief.pdf" download>Download trial brief ${external}</a><button class="quiet-link" id="copy-discussion">Copy discussion agenda</button><p class="next-step-note" id="discussion-status">This opens the discussion agenda. No trial has started and no payment is authorized.</p></section>${footer(c)}`;break;
  }
  return `<section class="chapter" id="${c.id}" aria-label="${e(c.label)}">${body}</section>`;
}
function currentFromHash(){const i=content.chapters.findIndex(c=>`#${c.id}`===location.hash);return i<0?0:i;}
function notify(message){$('#notice').textContent=message;$('#notice').classList.add('visible');clearTimeout(notificationTimer);notificationTimer=setTimeout(()=>$('#notice').classList.remove('visible'),3500);}
function syncNavigation(){
  const c=content.chapters[active];
  $('#chapter-label').textContent=c.label;$('#page-count').textContent=`${String(active+1).padStart(2,'0')} / 07`;
  $('#previous').disabled=active===0;$('#next').disabled=active===6;
  $$('#contents a,#progress a').forEach(a=>a.setAttribute('aria-current',a.hash===`#${c.id}`?'page':'false'));
}
function go(i,{focus=false,scroll=true}={}){
  active=Math.max(0,Math.min(content.chapters.length-1,i));
  if(mode==='present') $$('.chapter').forEach((s,j)=>s.hidden=j!==active);
  syncNavigation();
  const section=$(`#${content.chapters[active].id}`);
  if(scroll){if(mode==='read')section.scrollIntoView({block:'start'});else window.scrollTo({top:0,behavior:'instant'});}
  if(focus&&mode==='present')section.querySelector('h1,h2').focus({preventScroll:true});
}
function navigate(i){const id=content.chapters[Math.max(0,Math.min(6,i))].id;if(location.hash!==`#${id}`)location.hash=id;else go(i,{focus:true});}
function setMode(value){
  mode=value==='read'?'read':'present';document.body.classList.toggle('reading',mode==='read');
  const u=new URL(location);u.searchParams.set('view',mode);history.replaceState(null,'',u);
  $('#mode-toggle').textContent=mode==='read'?'Present':'Reading view';$('#mode-toggle').setAttribute('aria-label',mode==='read'?'Switch to presentation view':'Switch to reading view');
  $$('.chapter').forEach((s,i)=>s.hidden=mode==='present'&&i!==active);observer?.disconnect();
  if(mode==='read'){observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){active=content.chapters.findIndex(c=>c.id===entry.target.id);syncNavigation();}}},{rootMargin:'-15% 0px -60% 0px',threshold:0});$$('.chapter').forEach(s=>observer.observe(s));}
  go(active);
}
function selectProof(button,focus=false){
  const id=button.dataset.proof,index=Number(button.dataset.index);
  $$(`[data-proof="${id}"]`).forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;});
  content.chapters.find(c=>c.id===id).proof.forEach((s,i)=>{$(`#${id}-panel-${i}`).hidden=i!==index;$(`[data-copy="${id}-${i}"]`).hidden=i!==index;});
  if(focus)button.focus();
}
async function init(){
  const response=await fetch('content.json');if(!response.ok)throw Error('The proposal content could not be loaded.');content=await response.json();
  $('#story').innerHTML=content.chapters.map(chapter).join('');
  $('#contents').innerHTML=content.chapters.map((c,i)=>`<a href="#${c.id}"><span>${String(i+1).padStart(2,'0')}</span>${e(c.label)}</a>`).join('');
  $('#progress').innerHTML=content.chapters.map((c,i)=>`<a href="#${c.id}" aria-label="Chapter ${i+1}: ${e(c.label)}"></a>`).join('');
  active=currentFromHash();setMode(mode);
  $('#mode-toggle').onclick=()=>setMode(mode==='read'?'present':'read');
  $('#contents-toggle').onclick=()=>{const open=$('#contents').hidden;$('#contents').hidden=!open;$('#contents-toggle').setAttribute('aria-expanded',String(open));};
  $('#contents').onclick=event=>{if(event.target.closest('a')){$('#contents').hidden=true;$('#contents-toggle').setAttribute('aria-expanded','false');}};
  document.addEventListener('click',event=>{if(!event.target.closest('#contents,#contents-toggle')){$('#contents').hidden=true;$('#contents-toggle').setAttribute('aria-expanded','false');}});
  $('#previous').onclick=()=>navigate(active-1);$('#next').onclick=()=>navigate(active+1);
  window.addEventListener('hashchange',()=>go(currentFromHash(),{focus:true}));
  $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('Full screen is unavailable here. Use your browser’s full-screen command.');}};
  document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit full screen':'Enter full screen'));
  $$('[data-proof]').forEach(b=>b.onclick=()=>selectProof(b));
  $$('[data-image]').forEach(b=>b.onclick=()=>{$('#viewer-image').src=b.dataset.image;$('#viewer-image').alt=b.getAttribute('aria-label').replace('Enlarge captured view: ','');$('#viewer-caption').textContent=b.dataset.caption;$('#image-viewer').showModal();$('#image-viewer').scrollTop=0;});
  $('#close-viewer').onclick=()=>$('#image-viewer').close();
  $('#image-viewer').onclick=event=>{if(event.target===$('#image-viewer'))$('#image-viewer').close();};
  $('#discuss-trial').onclick=()=>{const d=$('#discussion');d.hidden=!d.hidden;$('#discuss-trial').setAttribute('aria-expanded',String(!d.hidden));if(d.hidden)return;d.focus();d.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});};
  $('#copy-discussion').onclick=async()=>{const c=content.chapters[6];const text=`Annora for PAC Machinery — trial discussion\n\n${c.intro}\n\nItems to agree:\n${c.decisions.map(v=>`- ${v}`).join('\n')}\n\n${c.boundary}`;try{await navigator.clipboard.writeText(text);notify('Discussion agenda copied. No trial has started.');}catch{notify('Clipboard unavailable. Download the trial brief instead.');}};
  document.addEventListener('keydown',event=>{
    if($('#image-viewer').open)return;
    if(event.key==='Escape'){$('#contents').hidden=true;$('#contents-toggle').setAttribute('aria-expanded','false');return;}
    if(event.target.matches('[role=tab]')&&['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const b=event.target;let n=Number(b.dataset.index);const count=content.chapters.find(c=>c.id===b.dataset.proof).proof.length;n=event.key==='Home'?0:event.key==='End'?count-1:(n+(['ArrowRight','ArrowDown'].includes(event.key)?1:count-1))%count;selectProof($(`[data-proof="${b.dataset.proof}"][data-index="${n}"]`),true);return;}
    if(mode!=='present'||event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(['ArrowRight','PageDown','ArrowLeft','PageUp','Home','End'].includes(event.key)){event.preventDefault();navigate(event.key==='Home'?0:event.key==='End'?6:active+(['ArrowRight','PageDown'].includes(event.key)?1:-1));}
  });
}
init().catch(error=>{$('#story').innerHTML=`<p class="loading">${e(error.message)} <a href="downloads/annora-for-pac.pdf">Open the PDF backup</a>, or reload this page.</p>`;});
