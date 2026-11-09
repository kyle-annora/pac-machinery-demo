const params=new URLSearchParams(location.search),notesOnly=params.get('notes')==='1';
const runId=(params.get('run')||crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
const KEY='pac-guided-host-v1:'+runId;
const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let script,steps,byId,mode='full',preset='product',current=null,busy=false,failedStep=null,writer=false;
let frameMap=new Map(),pending=null,sequence=[],channel;
const origin=location.origin;
const returnURL='../presentation/2026-11-08/index.html?view=present#11-baseline';
const modes={full:['The complete story','Inquiry to proposal, then feedback to revision'],a:['Act A · Inquiry to proposal','Website, configuration, review and the first customer offer'],b:['Act B · Feedback to revision','Customer question, Explorer, engineering and follow-up']};
function sequenceFor(){const a=script.acts[0].steps.map(s=>s.id),b=script.acts[1].steps.map(s=>s.id);return mode==='b'?b:[...(preset==='help'?script.alternatives[0].steps.map(s=>s.id).concat(a.slice(5)):a),...(mode==='a'?[]:b)];}
function saveCursor(id){const raw=JSON.stringify({runId,stepId:id,mode,preset});localStorage.setItem(KEY,raw);if(localStorage.getItem(KEY)!==raw)throw Error('The demonstration cursor could not be saved.');}
function notesMarkup(step){return `<span class="eyebrow">Presenter view · ${esc(step?.id||'Complete')}</span><h1>${esc(step?.title||'Return to the trial discussion')}</h1><div class="presenter-script">${(step?.script||[script.playback.deckReturnTalkTrack]).map(s=>`<p>${esc(s)}</p>`).join('')}</div><div class="presenter-context"><strong>Visible result</strong><p>${esc(step?.visible?.join(' ')||'Review the agreed trial cases and acceptance criteria.')}</p></div><div class="presenter-actions"><button class="quiet" data-note-command="previous">← Previous</button><button class="next" data-note-command="next">Next →</button></div>`;}
function updateNotes(id){const step=byId.get(id);if(notesOnly){$('stage').innerHTML=notesMarkup(step);return;}$('notes-title').textContent=step?.title||'Return to the pitch';$('talk-track').innerHTML=(step?.script||[script.playback.deckReturnTalkTrack]).map(x=>`<p>${esc(x)}</p>`).join('');$('notes-proof').textContent=step?.visible?.join(' ')||'The trial decision belongs to the pitch, not the customer quotation.';}
function updateControls(){const step=byId.get(current),index=sequence.indexOf(current);$('act-label').textContent=current==='complete'?'Walkthrough complete':`${step?.id.startsWith('B')?'Act B · Feedback to revision':'Act A · Inquiry to proposal'} · ${Math.max(0,index)+1} / ${sequence.length}`;$('step-label').textContent=step?.title||'Ready to review with PAC';$('progress').style.width=(current==='complete'?100:100*(index+1)/sequence.length)+'%';$('next').disabled=busy;$('back').disabled=busy||(current!=='complete'&&index<=0);$('next').innerHTML=current==='complete'?'Back to pitch ↗':'Next <span aria-hidden="true">→</span>';$('status').textContent=busy?'Preparing…':failedStep?'Needs attention':'Demo · Local data';updateNotes(current);}
function transition(){return `<section class="transition"><div><img class="brand-lock" src="../application/assets/pac-logo.png" alt="PAC Machinery"><span class="eyebrow">A change of perspective</span><h1>After a conversation<br>with PAC.</h1><p class="lead">Now, the sales team turns the application brief into an offer the customer can understand.</p><div class="context"><strong>Harbor Components · Hardware kits</strong><p class="muted">A separately prepared sales example. Website and Workspace records remain independent.</p></div></div><div class="equipment"><img src="../application/assets/r3200.png" alt="PAC Rollbag R3200 model reference"></div></section>`;}
function complete(){return `<section class="complete"><img class="brand-lock" src="../application/assets/pac-logo.png" alt="PAC Machinery"><span class="eyebrow">${mode==='a'?'The first offer is ready.':'A clear offer. A clear next step.'}</span><h1>${mode==='a'?'A proposal built around the application.':'From the customer’s question to a reviewed revision.'}</h1><p class="lead">${mode==='a'?'The buyer can compare two explained choices, with the documents and equipment context alongside them.':'The current offer, original question and next sales action stay in context. Earlier versions remain intact.'}</p><div class="outcomes"><div><strong>Evaluate with PAC’s cases</strong><p>Check the configuration, review, publication and revision outputs against agreed requirements.</p></div><div><strong>Two weeks free</strong><p>Review the results together. Paid continuation begins only after mutual agreement on scope and terms.</p></div></div><a href="${returnURL}">Return to the trial discussion ↗</a><p class="fine">Illustrative demonstration. No customer acceptance, signature or payment has been recorded.</p></section>`;}
function errorView(error,id){failedStep=id;busy=false;$('status').textContent='Needs attention';const old=$('stage').querySelector('.host-error');old?.remove();const panel=document.createElement('div');panel.className='host-error';panel.innerHTML=`<div><span class="eyebrow">The walkthrough is paused</span><h1>This step has not completed.</h1><p>${esc(error.message||error)}</p><button id="retry-step">Retry this step</button></div>`;$('stage').append(panel);$('retry-step').onclick=()=>goStep(id);updateControls();$('next').disabled=true;}
async function ensureFrame(artifact){let entry=frameMap.get(artifact);if(entry)return entry.ready;
 const frame=document.createElement('iframe');frame.title=artifact==='website'?'PAC Machinery Website':'PAC Machinery Sales Workspace and Customer Proposal';frame.allow='autoplay; fullscreen';frame.hidden=true;
 let resolve;const ready=new Promise(r=>resolve=r);entry={frame,ready,resolve,artifact};frameMap.set(artifact,entry);frame.src=`${artifact}.html?embedded=1&run=${encodeURIComponent(runId)}`;$('stage').append(frame);return ready;
}
async function goStep(id){if(!writer||busy)return;if(id!=='complete'&&!byId.has(id))return;
 if(id.startsWith('H')){preset='help';if(mode==='b')mode='full';sequence=sequenceFor();}
 if(!sequence.includes(id)&&id!=='complete'){mode='full';preset='product';sequence=sequenceFor();}
 busy=true;failedStep=null;updateControls();$('stage').querySelector('.host-error')?.remove();
 try{
  if(id==='complete'){
   for(const x of frameMap.values())x.frame.hidden=true;
   $('stage').querySelector('.host-scene')?.remove();const scene=document.createElement('div');scene.className='host-scene';scene.style.height='100%';scene.innerHTML=complete();$('stage').append(scene);
  }else{
   const artifact=id.startsWith('H')||Number(id.slice(1))<=5&&id.startsWith('A')?'website':'workspace';
   const timeout=new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('The page did not become ready. Retry after it finishes loading.')),15000);pending={stepId:id,timer,requestId:crypto.randomUUID(),reject,resolve:null};});
   const entry=await Promise.race([ensureFrame(artifact),timeout]);
   const done=new Promise((resolve,reject)=>{pending.resolve=resolve;pending.reject=reject;});
   entry.frame.contentWindow.postMessage({type:'pac-demo:step',stepId:id,runId,requestId:pending.requestId},origin);
   await Promise.race([done,timeout]);clearTimeout(pending.timer);pending=null;
   $('stage').querySelector('.host-loading')?.remove();$('stage').querySelector('.host-scene')?.remove();
   for(const x of frameMap.values())x.frame.hidden=x!==entry||id==='A06';
   if(id==='A06'){const scene=document.createElement('div');scene.className='host-scene';scene.style.height='100%';scene.innerHTML=transition();$('stage').append(scene);}
  }
  saveCursor(id);current=id;busy=false;history.replaceState(null,'','#'+id);updateControls();channel?.postMessage({type:'cursor',stepId:id,mode,preset});
 }catch(error){if(pending){clearTimeout(pending.timer);pending=null;}errorView(error,id);}
}
function advance(direction){if(!writer||busy||failedStep)return;if(current==='complete'){if(direction>0)location.href=returnURL;else goStep(sequence.at(-1));return;}const index=sequence.indexOf(current),id=sequence[index+direction];if(id)goStep(id);else if(direction>0)goStep('complete');}
window.addEventListener('message',event=>{if(event.origin!==origin)return;const entry=[...frameMap.values()].find(x=>x.frame.contentWindow===event.source);if(!entry)return;const d=event.data;if(!d||typeof d.type!=='string')return;
 if(d.type==='pac-demo:ready'&&d.artifact===entry.artifact)entry.resolve(entry);
 else if(d.type==='pac-demo:complete'&&pending&&d.requestId===pending.requestId&&d.stepId===pending.stepId)pending.resolve?.();
 else if(d.type==='pac-demo:error'&&pending&&d.requestId===pending.requestId&&d.stepId===pending.stepId)pending.reject?.(Error(d.message||'The page could not complete its action.'));
 else if(d.type==='pac-demo:navigate'&&byId.has(d.stepId))goStep(d.stepId);
 else if(d.type==='pac-demo:next')advance(1);else if(d.type==='pac-demo:previous')advance(-1);
});
document.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey||event.target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)||$('chooser').open)return;if(event.key==='ArrowRight'){event.preventDefault();advance(1);}if(event.key==='ArrowLeft'){event.preventDefault();advance(-1);}});
function startMode(nextMode){if(busy)return;mode=nextMode;preset=$('entry-preset').value;sequence=sequenceFor();$('chooser').close();goStep(sequence[0]);}
window.addEventListener('hashchange',()=>{const id=decodeURIComponent(location.hash.slice(1));if(writer&&!notesOnly&&current!==id&&(id==='complete'||byId?.has(id)))goStep(id);});
async function acquireWriter(){
 if(navigator.locks){await new Promise(resolve=>navigator.locks.request('pac-guided-run-'+runId,{ifAvailable:true},async lock=>{writer=Boolean(lock);resolve();if(lock)await new Promise(()=>{});}));}
 else writer=true;
 if(!writer){$('stage').innerHTML=`<div class="host-error"><div><h1>This run is already open.</h1><p>Continue in the existing tab, or start an independent run.</p><button id="new-run">Start a new run</button></div></div>`;$('new-run').onclick=()=>location.href='?run='+crypto.randomUUID();$('next').disabled=true;$('back').disabled=true;$('status').textContent='Read-only';$('step-label').textContent='Continue in the existing tab';return;}
 const saved=JSON.parse(localStorage.getItem(KEY)||'null');mode=['a','b','full'].includes(params.get('mode'))?params.get('mode'):saved?.mode||'full';preset=params.has('entry')?(params.get('entry')==='help'?'help':'product'):saved?.preset||'product';sequence=sequenceFor();$('entry-preset').value=preset;
 const hash=decodeURIComponent(location.hash.slice(1));await goStep(byId.has(hash)||hash==='complete'?hash:saved?.stepId||sequence[0]);
}
try{
 const response=await fetch('../docs/product/demo-production-2026-11-09/script.json');if(!response.ok)throw Error('The approved script could not be loaded.');script=await response.json();steps=[...script.acts.flatMap(a=>a.steps),...script.alternatives.flatMap(a=>a.steps||[])];byId=new Map(steps.map(s=>[s.id,s]));
 channel=new BroadcastChannel('pac-guided-cursor-'+runId);channel.onmessage=event=>{const d=event.data;if(notesOnly&&d?.type==='cursor')updateNotes(d.stepId);if(!notesOnly&&d?.type==='command')advance(d.command==='previous'?-1:1);};
 if(notesOnly){document.body.classList.add('notes-only');const saved=JSON.parse(localStorage.getItem(KEY)||'null');updateNotes(saved?.stepId||'A01');window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue)updateNotes(JSON.parse(e.newValue).stepId);});document.addEventListener('click',e=>{const cmd=e.target.closest('[data-note-command]');if(cmd)channel.postMessage({type:'command',command:cmd.dataset.noteCommand});});}
 else{
  const url=new URL(location.href);url.searchParams.set('run',runId);history.replaceState(null,'',url);
  $('next').onclick=()=>advance(1);$('back').onclick=()=>advance(-1);$('notes-toggle').onclick=()=>{$('notes').hidden=!$('notes').hidden;};$('close-notes').onclick=()=>$('notes').hidden=true;
  const popout=document.createElement('a');popout.href='?notes=1&run='+encodeURIComponent(runId);popout.target='_blank';popout.rel='noopener';popout.className='popout';popout.textContent='Open separate presenter view ↗';$('notes').append(popout);
  $('menu').onclick=()=>$('chooser').showModal();$('close-menu').onclick=()=>$('chooser').close();$('restart').onclick=()=>startMode(mode);
  $('mode-options').innerHTML=Object.entries(modes).map(([id,[title,detail]])=>`<button class="mode-option" data-mode="${id}"><span><strong>${title}</strong><small>${detail}</small></span><span>→</span></button>`).join('');$('mode-options').onclick=e=>{const b=e.target.closest('[data-mode]');if(b)startMode(b.dataset.mode);};await acquireWriter();
 }
}catch(error){$('stage').innerHTML=`<div class="host-error"><div><h1>Unable to prepare the walkthrough.</h1><p>${esc(error.message)}</p><button onclick="location.reload()">Reload</button></div></div>`;}
