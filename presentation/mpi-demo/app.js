import {BEATS,TOTAL,QUESTION,DemoClock,validReturnURL,sameView} from './sequence.mjs';

const $=id=>document.getElementById(id),clock=new DemoClock();
const params=new URLSearchParams(location.search);
$('stage').dataset.capture=params.get('capture')==='1'?'true':'false';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let model=null,recorded=params.get('recorded')==='1',saved=null,savedAt=null,restored=false,ending=false,last=0,initFailed=false,lastUI='';
let sample={question:QUESTION,machine:'MPI 35 Series',authority:'illustrative-study',view:null};
const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`;
const fallbackReturn=new URL(location.pathname.includes('/pac-machinery-demo/')?'../?view=present#02-proof':'../2026-11-08/?view=present#02-proof',location.href).href;
const returnURL=validReturnURL(params.get('return'),location.href)||fallbackReturn;
document.querySelectorAll('.return-link').forEach(a=>a.href=returnURL);
$('questionText').textContent=QUESTION;
$('progress').innerHTML=BEATS.map(b=>`<div class="segment" title="${b.title}"><span></span></div>`).join('');
function scale(){document.documentElement.style.setProperty('--scale',Math.min(innerWidth/1920,innerHeight/1080));}
scale();addEventListener('resize',scale);

function setRecorded(value){
  recorded=value;$('recorded').hidden=!value;$('model').hidden=value;$('recordedLabel').hidden=!value;
  $('modelHint').textContent=value?'Captured from the interactive MPI study':'Guided 3D · Prepared example';
  if(value){model?.setPaused(true);$('viewLabel').hidden=true;}
}
function ready(){
  $('primary').hidden=false;$('primary').disabled=false;$('primary').textContent='Start guided example';$('primary').dataset.action='start';
  $('status').textContent=recorded?'Recorded views · Same six-scene story':reduced?'Reduced motion · Automatic scene changes':'Press start. The scenes advance automatically.';
  $('stage').dataset.status='ready';
  if(params.get('autostart')==='1')primary();
}
function paintRecorded(index){$('recorded').src=`assets/recorded-${String(index+1).padStart(2,'0')}.jpg`;}
function enter(){
  const b=BEATS[clock.index];$('stage').dataset.beat=b.id;$('stage').dataset.ending='false';
  $('stepLabel').textContent=`${String(clock.index+1).padStart(2,'0')} / 06`;
  $('beatTitle').textContent=b.title;$('beatDetail').textContent=b.detail;$('viewLabel').textContent=b.area;
  $('question').hidden=clock.index<4;$('pacValue').hidden=true;$('savedState').textContent='';
  $('live').textContent=`Scene ${clock.index+1}. ${b.title}`;ending=false;
  if(recorded){paintRecorded(clock.index);return;}
  const duration=reduced?0:1.6;
  if(clock.index===0){model.reset();model.setOpening(.22);}
  if(clock.index===1)model.frame('tooling',{duration});
  if(clock.index===2)model.setOpening(.22);
  if(clock.index===3)model.frame('controls',{duration});
  if(clock.index===4)model.frame('tooling',{duration});
  if(clock.index===5)model.frame('whole',{duration});
}
function saveView(){
  if(saved)return;
  saved=model.capture();sample={...sample,view:saved};savedAt=new Date().toISOString();
  try{sessionStorage.setItem('pac-pitch-mpi-example-v1',JSON.stringify({...sample,savedAt}));}catch{/* In-memory restoration still works when storage is unavailable. */}
  $('savedState').textContent='View saved · Tooling area';$('stage').dataset.saved='true';
}
function stepActions(dt){
  const t=clock.elapsed,i=clock.index;
  if(!recorded){
    if(i===0&&!reduced&&t<5)model.orbit(dt*.045);
    if(i===2){const x=Math.min(1,Math.max(0,(t-1.5)/3));model.setOpening(reduced?(t<1.5?.22:1):.22+.78*(x*x*(3-2*x)));}
    if(i===4&&t>=5&&model.isSettled())saveView();
    if(i===5&&t>=5&&!restored&&saved){
      model.restore(saved);restored=sameView(saved,model.capture());
      if(!restored){fail(new Error('The saved view could not be restored.'));return;}
      $('savedState').textContent='Same view restored · Question retained';$('stage').dataset.restored='true';$('stage').dataset.restorationVerified='true';
    }
  }else{
    if(i===4&&t>=5)$('savedState').textContent='Recorded example · Saved tooling view';
    if(i===5&&t>=5){$('savedState').textContent='Recorded example · Same view restored';paintRecorded(4);}
  }
  if(i===5&&t>=12&&!ending){
    ending=true;$('stage').dataset.ending='true';$('beatTitle').textContent='Bring the conversation into focus.';
    $('pacValue').hidden=false;$('viewLabel').textContent='Same view. Same question.';
  }
}
function updateUI(){
  $('stage').dataset.status=clock.status;$('stage').dataset.scene=String(clock.index+1);
  $('stage').dataset.elapsed=clock.totalElapsed.toFixed(2);
  $('timing').textContent=`${time(clock.totalElapsed)} / ${time(TOTAL)}`;
  document.querySelectorAll('.segment span').forEach((el,i)=>el.style.width=`${i<clock.index?100:i===clock.index?100*clock.elapsed/BEATS[i].duration:0}%`);
  const key=`${clock.status}/${clock.index}`;if(lastUI===key)return;lastUI=key;
  $('primary').dataset.action=clock.status==='running'?'pause':clock.status==='paused'?'resume':clock.status==='completed'?'return':'start';
  if(clock.status==='running'){$('primary').textContent='Pause';$('status').textContent='Scenes advance automatically.';$('playback').textContent=`Playing · Scene ${clock.index+1} of 6`;}
  if(clock.status==='paused'){$('primary').textContent='Resume';$('status').textContent='Paused. Continue when the conversation is ready.';$('playback').textContent=`Paused · Scene ${clock.index+1} of 6`;}
  if(clock.status==='completed'){$('primary').textContent='Continue to customer outcomes';$('status').textContent='The example is complete. Return when you are ready.';$('playback').textContent='Example complete';}
  $('restart').hidden=!['paused','completed'].includes(clock.status);
}
function pause(){clock.pause();model?.setPaused(true);updateUI();}
function primary(){
  if($('primary').hidden||$('primary').disabled||(initFailed&&!recorded))return;
  if(clock.status==='ready'){clock.start();model?.setPaused(false);enter();}
  else if(clock.status==='running'){pause();return;}
  else if(clock.status==='paused'){clock.resume();model?.setPaused(false);}
  else if(clock.status==='completed'){location.href=returnURL;return;}
  updateUI();
}
$('primary').addEventListener('click',primary);
$('restart').addEventListener('click',()=>{
  clock.reset();saved=null;savedAt=null;restored=false;ending=false;
  sample={question:QUESTION,machine:'MPI 35 Series',authority:'illustrative-study',view:null};
  try{sessionStorage.removeItem('pac-pitch-mpi-example-v1');}catch{}
  delete $('stage').dataset.saved;delete $('stage').dataset.restored;delete $('stage').dataset.restorationVerified;clock.start();
  model?.setPaused(false);enter();updateUI();
});
$('fallback').addEventListener('click',()=>{
  model?.destroy();model=null;setRecorded(true);clock.reset();saved=null;restored=false;ending=false;lastUI='';paintRecorded(0);
  for(const key of ['saved','restored','restorationVerified','beat','scene','elapsed'])delete $('stage').dataset[key];
  $('stage').dataset.ending='false';$('question').hidden=true;$('pacValue').hidden=true;
  $('stepLabel').textContent='Six scenes · About 80 seconds';$('beatTitle').textContent='Make the machine easier to understand.';
  $('beatDetail').textContent='A guided look at the working area, movement and customer conversation.';
  $('playback').textContent='Ready when you are.';$('timing').textContent='00:00 / 01:20';
  document.querySelectorAll('.segment span').forEach(el=>el.style.width='0%');
  $('fallback').hidden=true;$('restart').hidden=true;ready();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&clock.status==='running')pause();});
addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='Space'&&!['BUTTON','A','INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();primary();}if(e.code==='Escape'&&clock.status==='running')pause();});
function fail(error){
  if(initFailed)return;initFailed=true;if(clock.status==='running')pause();
  $('status').textContent='The live 3D view is unavailable. You can watch the recorded example.';
  $('primary').hidden=true;$('primary').disabled=true;$('fallback').hidden=false;$('restart').hidden=true;
  $('stage').dataset.status='unavailable';console.warn('MPI example unavailable:',error?.message||'WebGL unavailable');
}
async function boot(){
  if(recorded){setRecorded(true);ready();return;}
  try{
    const {createDemoModel}=await import('./model.js');
    model=await createDemoModel($('model'),{onInteraction:()=>{if(clock.status==='running')pause();},onError:fail});
    if(initFailed){model.destroy();model=null;return;}
    model.setOpening(.22);model.update(0);ready();
  }catch(error){fail(error);}
}
function render(now){
  const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
  if(clock.status==='running'){
    stepActions(dt);
    if(!initFailed||recorded){
      if(!recorded)model?.update(dt);
      const changed=clock.tick(dt,recorded||model?.isSettled());if(changed)enter();
      if(clock.status==='completed')model?.setPaused(true);updateUI();
    }
  }else if(model&&!recorded)model.update(0);
  requestAnimationFrame(render);
}
setRecorded(recorded);boot();requestAnimationFrame(render);
