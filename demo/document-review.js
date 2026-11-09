import {renderPdfPreview} from './pdf-preview.mjs?v=20261109-comments-1';
import {createReviewStore, sanitizeReviewStore, ensureSampleThread, addThread, replyToThread, setThreadResolved, threadsForVersion} from './document-review-domain.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const glyph = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${({comment:'M4 4h16v12H9l-5 4z M8 8h8 M8 12h5',expand:'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5',close:'m6 6 12 12 M6 18 18 6',download:'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',check:'m5 12 4 4L19 6',plus:'M12 5v14 M5 12h14'})[name]}"/></svg>`;
export function documentReviewMarkup(version, references) {
  return `<section class="dr-reader" id="document-review" aria-label="Quote document review">
    <header class="dr-toolbar"><div class="dr-file"><strong>Quote V${version}.pdf</strong><span>Read-only quote · Proposal V${version}</span></div><div class="dr-tools">
    <button type="button" data-dr="new" disabled>${glyph('plus')}<span>Add comment</span></button>
    <button type="button" data-dr="comments" aria-expanded="true" aria-controls="dr-sidebar">${glyph('comment')}<span>Comments <b id="dr-count">0</b></span></button>
    <a id="pdf-download" download="PAC-Harbor-Quote-V${version}.pdf" aria-disabled="true" aria-label="Download quote PDF" title="Download PDF">${glyph('download')}<span class="dr-download-label">Download</span></a>
    <button type="button" data-dr="fullscreen" disabled aria-label="Enter full screen" title="Full screen">${glyph('expand')}<span class="dr-fullscreen-label">Full screen</span></button></div></header>
    <div class="dr-body"><div class="dr-document"><div id="pdf-viewer"><div class="initial-loading">Preparing the saved quotation…</div></div><button class="dr-selection-action" type="button" data-dr="selection" hidden>${glyph('comment')} Add comment</button></div>
    <aside class="dr-sidebar" id="dr-sidebar" aria-label="Document comments"><div class="dr-sidebar-heading"><div><h2>Comments</h2><span>Attached to Proposal V${version}</span></div><button type="button" data-dr="comments" aria-label="Hide comments">${glyph('close')}</button></div>
    <div class="dr-filters" role="group" aria-label="Filter comments"><button type="button" data-dr="filter" data-filter="open" aria-pressed="true">Open</button><button type="button" data-dr="filter" data-filter="resolved" aria-pressed="false">Resolved</button><button type="button" data-dr="filter" data-filter="all" aria-pressed="false">All</button></div>
    <div class="dr-discussion"><div id="dr-composer"></div><div id="dr-threads"></div><details class="dr-references"><summary>Supporting references</summary>${references}</details></div>
    <footer class="dr-local"><span class="dr-local-dot"></span>Demo comments · saved in this browser</footer></aside></div><div class="dr-notice" role="status" aria-live="polite"></div>
  </section>`;
}

export async function mountDocumentReview(root, {bytes,version,runId}) {
  const abort = new AbortController(), options = {signal:abort.signal};
  const find = s => root.querySelector(s);
  const key = `pac-guided-document-review-v1:${runId}`;
  let store = createReviewStore(), raw = null, writable = true, filter = 'open', activeId = null;
  let pending = null, composerAnchor = null, replyId = null, viewer, toastTimer, destroyed = false;
  let expanded = false, originalScroll = 0, priorFocus = null, bodyOverflow = '';
  const draft = {text:'', replies:{}};
  function notice(message, error=false) { clearTimeout(toastTimer);const el=find('.dr-notice');if(!el)return;el.textContent=message;el.classList.toggle('is-error',error);el.classList.add('visible');toastTimer=setTimeout(()=>el.classList.remove('visible'),6000); }
  try {
    raw = localStorage.getItem(key);
    store = raw ? sanitizeReviewStore(JSON.parse(raw)) : createReviewStore();
    if(version===1){const seeded=ensureSampleThread(store,1);const nextRaw=JSON.stringify(seeded);if(nextRaw!==raw){localStorage.setItem(key,nextRaw);raw=nextRaw;}store=seeded;}
  } catch { writable=false;find('.dr-local').textContent='Browser storage unavailable · comments not saved';notice('Comments could not be loaded or saved. Check browser storage and reload. The PDF is still available.',true); }
  function commit(operation) {
    if(!writable){notice('Comments are unavailable until browser storage is restored and this page is reloaded.',true);return false;}
    try {
      // Merge the latest local threads before an edit, rather than overwriting another tab.
      const latestRaw=localStorage.getItem(key);
      const latestStore=latestRaw?sanitizeReviewStore(JSON.parse(latestRaw)):createReviewStore();
      const next=operation(latestStore);const nextRaw=JSON.stringify(next);
      localStorage.setItem(key,nextRaw);store=next;raw=nextRaw;return true;
    }catch(error){notice(error.message||'The comment could not be saved. Your draft is still here.',true);return false;}
  }
  function openSidebar(){root.classList.remove('dr-comments-hidden');find('[data-dr="comments"]').setAttribute('aria-expanded','true');}
  function updateAnnotations(){if(!viewer)return;const notes=threadsForVersion(store,version).map(t=>({id:t.id,page:t.page,rects:t.rects,quote:t.quote,active:t.id===activeId,resolved:t.resolved}));if(composerAnchor?.rects?.length)notes.push({id:'draft',...composerAnchor,active:true});viewer.setAnnotations(notes,id=>selectThread(id));}
  const label = t => `Option ${t.page===1?'A':'B'} · Page ${t.page}`;
  function selectThread(id){const t=store.threads.find(t=>t.id===id&&t.version===version);if(!t)return;openSidebar();activeId=id;filter=t.resolved?'resolved':'open';renderThreads();viewer?.focusAnchor(t);const thread=find(`[data-thread="${CSS.escape(id)}"]`);thread?.scrollIntoView({block:'nearest',behavior:'smooth'});thread?.querySelector('[data-dr=anchor]')?.focus({preventScroll:true});}
  function renderThreads(){
    find('#dr-count').textContent=threadsForVersion(store,version,{status:'open'}).length;
    root.querySelectorAll('[data-dr="filter"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
    const threads=threadsForVersion(store,version,{status:filter});
    find('#dr-threads').innerHTML=threads.length?threads.map(t=>`<article class="dr-thread ${t.id===activeId?'is-active':''}" data-thread="${esc(t.id)}">
      <div class="dr-thread-top"><span class="dr-avatar">${t.sample?'AM':'DR'}</span><div><strong>${esc(t.author)}</strong><span>${t.sample?'Sample thread':'Demo reviewer · saved locally'}</span></div><button class="dr-resolve" data-dr="resolve" data-id="${esc(t.id)}" aria-label="${t.resolved?'Reopen':'Resolve'} comment" title="${t.resolved?'Reopen':'Resolve'} comment">${t.resolved?'Reopen':glyph('check')}</button></div>
      <button class="dr-anchor" data-dr="anchor" data-id="${esc(t.id)}"><span>${label(t)}</span>${t.quote?`<q>${esc(t.quote)}</q>`:''}</button>
      <p class="dr-comment-text">${esc(t.text)}</p>${t.replies.map(r=>`<div class="dr-reply"><strong>${esc(r.author)}</strong><span>${t.sample&&r.sample!==false?'Sample reply':'Saved locally'}</span><p>${esc(r.text)}</p></div>`).join('')}
      ${t.resolved?'<div class="dr-resolved-label">✓ Resolved</div>':replyId===t.id?`<form class="dr-reply-form" data-reply="${esc(t.id)}"><label for="reply-${esc(t.id)}">Reply as Demo reviewer</label><textarea id="reply-${esc(t.id)}" name="reply" maxlength="4000" required placeholder="Write a reply…">${esc(draft.replies[t.id]||'')}</textarea><div class="dr-form-actions"><button type="button" data-dr="cancel-reply">Cancel</button><button type="submit" class="dr-primary">Reply</button></div></form>`:`<button class="dr-reply-action" data-dr="reply" data-id="${esc(t.id)}">Reply</button>`}</article>`).join(''):`<div class="dr-empty">${glyph('comment')}<h3>${filter==='resolved'?'No resolved comments':'No comments yet'}</h3><p>${filter==='resolved'?'Resolved discussions will stay here for reference.':'Select text in the quote, or add a comment to the current page.'}</p></div>`;
    updateAnnotations();
  }
  function renderComposer(){
    const container=find('#dr-composer');
    if(!composerAnchor){container.replaceChildren();updateAnnotations();return;}
    container.innerHTML=`<form class="dr-compose-form"><div class="dr-compose-title"><strong>New comment</strong><span>Demo reviewer</span></div><div class="dr-compose-anchor"><span>${label(composerAnchor)}</span>${composerAnchor.quote?`<q>${esc(composerAnchor.quote)}</q>`:'<span>Comment on this page</span>'}</div><label class="dr-sr-only" for="dr-comment-text">Comment</label><textarea id="dr-comment-text" name="comment" maxlength="4000" required placeholder="What would you like to discuss?">${esc(draft.text)}</textarea><div class="dr-form-actions"><button type="button" data-dr="cancel">Cancel</button><button type="submit" class="dr-primary">Comment</button></div></form>`;updateAnnotations();
  }
  function beginComment(){openSidebar();composerAnchor=pending&&pending.page===viewer.getPage()?{...pending}:{page:viewer.getPage(),quote:'',rects:[]};find('.dr-selection-action').hidden=true;renderComposer();find('#dr-comment-text')?.focus();}
  function selectionChanged(selection){
    const button=find('.dr-selection-action');if(!button)return;
    if(!selection){button.hidden=true;return;}
    pending=selection;
    const area=find('.dr-document').getBoundingClientRect();
    const point=selection.clientRect;
    button.hidden=false;button.style.left=`${Math.max(8,Math.min(area.width-160,(point?.left??area.left)-area.left))}px`;
    button.style.top=`${Math.max(8,Math.min(area.height-48,(point?.bottom??area.top+60)-area.top+8))}px`;
  }
  function setExpanded(value){
    expanded=value;root.classList.toggle('dr-expanded',value);if(window.parent!==window)window.parent.postMessage({type:'pac-demo:document-focus',expanded:value},location.origin);
    if(value){originalScroll=window.scrollY;bodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';priorFocus=document.activeElement;document.body.classList.add('dr-document-open');}
    else{document.body.style.overflow=bodyOverflow;document.body.classList.remove('dr-document-open');window.scrollTo(0,originalScroll);if(priorFocus?.isConnected)priorFocus.focus();}
    const b=find('[data-dr="fullscreen"]');b.setAttribute('aria-label',value?'Exit full screen':'Enter full screen');b.title=value?'Exit full screen (Esc)':'Full screen';b.querySelector('span').textContent=value?'Exit full screen':'Full screen';
    if(value)b.focus();
  }
  async function toggleFullscreen(){
    if(expanded){if(document.fullscreenElement===root)await document.exitFullscreen().catch(()=>{});if(expanded)setExpanded(false);return;}
    setExpanded(true);
    try{if(root.requestFullscreen&&document.fullscreenEnabled)await root.requestFullscreen();}
    catch{notice('Expanded reader. Press Esc or Exit full screen to return.');}
  }
  root.addEventListener('click',event=>{
    const b=event.target.closest('[data-dr]');if(!b)return;event.stopPropagation();
    const action=b.dataset.dr;
    if(action==='new'||action==='selection')beginComment();
    if(action==='comments'){const hidden=root.classList.toggle('dr-comments-hidden');const toggle=find('[data-dr="comments"]');toggle.setAttribute('aria-expanded',String(!hidden));if(hidden)toggle.focus();}
    if(action==='filter'){filter=b.dataset.filter;renderThreads();}
    if(action==='anchor')selectThread(b.dataset.id);
    if(action==='cancel'){composerAnchor=null;draft.text='';pending=null;renderComposer();find('[data-dr="new"]').focus();}
    if(action==='reply'){replyId=b.dataset.id;renderThreads();find('.dr-reply-form textarea')?.focus();}
    if(action==='cancel-reply'){const id=replyId;replyId=null;renderThreads();find(`[data-dr="reply"][data-id="${CSS.escape(id)}"]`)?.focus();}
    if(action==='resolve'){const t=store.threads.find(t=>t.id===b.dataset.id);if(t&&commit(s=>setThreadResolved(s,t.id,!t.resolved))){renderThreads();find(`[data-dr="filter"][data-filter="${filter}"]`)?.focus();notice(t.resolved?'Comment reopened.':'Comment resolved. Find it in Resolved.');}}
    if(action==='fullscreen')toggleFullscreen();
  },options);
  root.addEventListener('input',event=>{if(event.target.name==='comment')draft.text=event.target.value;const form=event.target.closest('[data-reply]');if(form)draft.replies[form.dataset.reply]=event.target.value;},options);
  root.addEventListener('submit',event=>{
    const form=event.target;if(!form.matches('.dr-compose-form,.dr-reply-form'))return;event.preventDefault();event.stopPropagation();
    if(form.matches('.dr-compose-form')){
      if(commit(s=>addThread(s,{version,...composerAnchor,text:draft.text,author:'Demo reviewer'}))){activeId=store.threads.at(-1).id;composerAnchor=null;pending=null;draft.text='';filter='open';renderComposer();renderThreads();find(`[data-dr="anchor"][data-id="${CSS.escape(activeId)}"]`)?.focus();notice('Comment saved to this browser.');}
    }else{const id=form.dataset.reply;if(commit(s=>replyToThread(s,id,{text:draft.replies[id],author:'Demo reviewer',sample:false}))){replyId=null;delete draft.replies[id];renderThreads();find(`[data-dr="reply"][data-id="${CSS.escape(id)}"]`)?.focus();notice('Reply saved to this browser.');}}
  },options);
  root.addEventListener('keydown',event=>{if(expanded&&['ArrowLeft','ArrowRight'].includes(event.key))event.stopPropagation();if(event.key==='Escape'&&expanded){event.preventDefault();event.stopPropagation();toggleFullscreen();}if(event.key==='Tab'&&expanded){const focusable=[...root.querySelectorAll('button,a[href],textarea,select,summary,[tabindex="0"]')].filter(e=>!e.disabled&&e.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}},options);
  document.addEventListener('fullscreenchange',()=>{if(expanded&&!document.fullscreenElement)setExpanded(false);},options);
  window.addEventListener('storage',event=>{if(event.key!==key)return;try{store=event.newValue?sanitizeReviewStore(JSON.parse(event.newValue)):createReviewStore();raw=event.newValue;const focus=document.activeElement,focusId=focus?.id,start=focus?.selectionStart,end=focus?.selectionEnd;renderThreads();if(focusId){const next=find(`#${CSS.escape(focusId)}`);next?.focus({preventScroll:true});if(next?.setSelectionRange&&start!=null)next.setSelectionRange(start,end);}}catch{notice('Another tab changed the comment data. Reload to continue safely.',true);writable=false;}},options);
  find('.dr-document').addEventListener('scroll',()=>{find('.dr-selection-action').hidden=true;}, {...options,capture:true});
  renderThreads();
  try { viewer=await renderPdfPreview(find('#pdf-viewer'),bytes,{version,onSelection:selectionChanged,onPageChange:()=>{pending=null;find('.dr-selection-action').hidden=true;}}); }
  catch(error){abort.abort();clearTimeout(toastTimer);if(expanded){if(document.fullscreenElement===root)document.exitFullscreen().catch(()=>{});setExpanded(false);}throw error;}
  if(destroyed){await viewer.destroy();return {destroy(){}};}
  find('[data-dr="new"]').disabled=!writable;find('[data-dr="fullscreen"]').disabled=false;
  // A prepared, labelled example makes the capability visible without another presenter click.
  const sample=threadsForVersion(store,version).find(t=>t.sample&&!t.resolved);
  if(sample){viewer.selectPage(sample.page);activeId=sample.id;}
  renderThreads();
  return {destroy(){destroyed=true;abort.abort();clearTimeout(toastTimer);if(expanded){if(document.fullscreenElement===root)document.exitFullscreen().catch(()=>{});setExpanded(false);}viewer?.destroy();}};
}
