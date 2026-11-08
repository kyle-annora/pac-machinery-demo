import test from 'node:test';
import assert from 'node:assert/strict';
import { homeInquiryReference, renderHomeExplorer, mountHomeExplorer } from '../website/home-explorer.js';
import { inquiryPayload } from '../website/model.js';

const product = { id:'r3200', model:'R3200', name:'Rollbag R3200', photoNote:'Source equipment photograph.', photos:[{url:'/source/media/877f3a8a815e.jpg',width:600,height:600}] };
const captured = {title:'Crank drive', preview:'data:image/jpeg;base64,view',inspection:{model:{id:'kinetic-01'},preview:{dataUrl:'data:image/jpeg;base64,view'}}};

test('homepage inquiry handoff keeps photo and reference assembly provenance distinct', () => {
  const photo = homeInquiryReference(product, {question:'  Confirm loading clearance.  '});
  assert.equal(photo.source, product.photoNote);
  assert.equal(photo.photo, product.photos[0].url);
  assert.equal(photo.inspection, undefined);
  assert.equal(photo.note, 'Confirm loading clearance.');
  const ref = homeInquiryReference(product, {capture:captured, question:'A'.repeat(2010)});
  assert.equal(ref.source, 'Reference assembly — not PAC CAD');
  assert.equal(ref.photo, undefined);
  assert.equal(ref.inspection, captured.inspection);
  assert.equal(ref.note.length,2000);
  assert.equal(homeInquiryReference(product, {capture:{...captured,preview:null}}).preview, undefined, 'missing captured previews must not be replaced with a machine photo');
  const payload=inquiryPayload({productId:product.id, message:ref.note}, 'stable-id', ref);
  assert.equal(payload.reference.productId,'r3200');
  assert.equal(payload.reference.inspection.model.id,'kinetic-01');
  assert.equal(payload.reference.preview,undefined,'one capture image in the API body');
  assert.equal(payload.dealId,undefined);
});

test('homepage scene removes the redundant toolbar and keeps qualified reference identity', () => {
  const html=renderHomeExplorer({...product,name:'<script>no</script>'});
  assert.match(html,/Explore the details/);
  assert.match(html,/Reference assembly · Not PAC CAD/);
  assert.match(html,/&lt;script&gt;no&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<iframe[^>]*src=|reference-component|reference-frame-button|reference-capture|home-reference-tools/);
  assert.equal((html.match(/<iframe/g)||[]).length,1);
});

class Element {
  constructor(dataset={}) { this.dataset=dataset;this.attrs={};this.listeners={};this.hidden=false;this.value='';this.textContent='';this.classList={toggle(){}}; }
  addEventListener(name,fn) { (this.listeners[name] ||= new Set()).add(fn); }
  removeEventListener(name,fn) { this.listeners[name]?.delete(fn); }
  dispatch(name='click') { for(const fn of this.listeners[name]||[])fn({currentTarget:this}); }
  setAttribute(k,v){this.attrs[k]=v;}
  getAttribute(k){return this.attrs[k];}
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({lazy=false, capture=async()=>captured}={}){
 const ids=new Map();
 for(const id of ['home-question','home-view-note','reference-frame','home-scene-status','home-selected-part','home-scene-title'])ids.set(id,new Element());
 const steps=[0,1,2].map(i=>{const n=new Element({homeStep:String(i)});n.attrs['aria-controls']=`home-chapter-${i}`;ids.set(`home-chapter-${i}`,new Element());return n;});
 const buttons=Object.fromEntries(['inquiry','motion','overview','without-view','retry'].map(key=>[key,new Element()]));
 const host=new Element();
 host.querySelectorAll=s=>s==='[data-home-step]'?steps:[];
 host.querySelector=s=>buttons[s.replace('[data-home-','').replace(']','')]||null;
 ids.set('home-explorer',host);
 const f={document:{getElementById:id=>ids.get(id)},ids,steps,...buttons,mounts:0,disposals:0,requests:[],handed:[],disconnects:0};
 const rootNode={id:'root',title:'Crank-slider mechanism'}, part={id:'slider',title:'Slider carriage'};
 let state={lifecycle:'ready',presentation:{mode:'explore'},navigation:{selectedId:'root'},operation:{status:'paused'}};
 let options;
 const notify=()=>options.onStateChange({state:structuredClone(state),rootNode,selectedNode:state.navigation.selectedId==='root'?rootNode:part,ready:true,busy:false});
 const controller=()=>{f.disposals++;};
 controller.request=async(method,params)=>{
   f.requests.push([method,params]);
   if(method==='setMode')state.presentation.mode=params.mode;
   if(method==='select')state.navigation.selectedId=params.nodeId;
   if(method==='playOperation')state.operation.status='playing';
   if(method==='pauseOperation')state.operation.status='paused';
   notify();
 };
 controller.capture=()=>{f.captures=(f.captures||0)+1;return capture();};
 controller.retry=()=>{};
 f.mountReference=o=>{options=o;f.mounts++;return controller;};
 f.ready=()=>{notify();options.onReady(controller);};
 f.pickPart=()=>{state.navigation.selectedId='slider';notify();};
 f.update=next=>options.onStateChange(next);
 if(lazy) f.document.defaultView={IntersectionObserver:class {
   constructor(callback){f.enter=callback;}observe(){}disconnect(){f.disconnects++;}
 }};
 f.dispose=mountHomeExplorer({product,document:f.document,onContinue:x=>f.handed.push(x),mountReference:f.mountReference});
 return f;
}

test('one scene survives chapters; motion follows the guide and question preserves the pose', async()=>{
 const f=fixture();f.ready();
 f.ids.get('reference-frame').setAttribute('src','same-scene');
 f.steps[1].dispatch();await settle();
 assert.deepEqual(f.requests.map(x=>x[0]),['setMode','select','playOperation']);
 assert.equal(f.motion.textContent,'Pause motion');
 f.motion.dispatch();await settle();assert.equal(f.motion.textContent,'Play motion');
 f.motion.dispatch();await settle();
 f.steps[2].dispatch();await settle();
 assert.equal(f.requests.at(-1)[0],'pauseOperation');
 assert.equal(f.ids.get('reference-frame').getAttribute('src'),'same-scene');
 assert.equal(f.mounts,1);assert.equal(f.disposals,0);
 assert.equal(f.steps[2].getAttribute('aria-expanded'),'true');
 f.dispose();assert.equal(f.disposals,1);assert.equal(f.steps[1].listeners.click.size,0);
});

test('model selection updates guide and whole assembly action drives the same scene', async()=>{
 const f=fixture();f.ready();f.pickPart();
 assert.equal(f.ids.get('home-selected-part').textContent,'Slider carriage');
 assert.equal(f.ids.get('home-scene-title').textContent,'Slider carriage');
 assert.equal(f.overview.hidden,false);
 f.overview.dispatch();await settle();
 assert.deepEqual(f.requests,[['select',{nodeId:'root'}],['frame',{nodeId:'root'}]]);
 assert.equal(f.overview.hidden,true);
 f.dispose();f.pickPart();assert.equal(f.ids.get('home-selected-part').textContent,'Whole assembly');
});

test('inquiry automatically captures the current view with its question once', async()=>{
 let release;
 const f=fixture({capture:()=>new Promise(resolve=>release=resolve)});f.ready();
 f.steps[2].dispatch();await settle();
 f.ids.get('home-question').value='Inspect this component.';
 f.inquiry.dispatch();f.inquiry.dispatch();await settle();
 assert.equal(f.inquiry.disabled,true);assert.equal(f.captures,1);assert.equal(f.handed.length,0);
 release(captured);await settle();
 assert.equal(f.handed.length,1);assert.equal(f.handed[0].inspection,captured.inspection);
 assert.equal(f.handed[0].note,'Inspect this component.');
 f.dispose();
});

test('failed capture offers explicit question-only recovery without silently dropping evidence', async()=>{
 const f=fixture({capture:async()=>{throw new Error('Capture unavailable');}});f.ready();
 f.ids.get('home-question').value='Loading clearance?';f.inquiry.dispatch();await settle();
 assert.equal(f.handed.length,0);assert.equal(f['without-view'].hidden,false);
 assert.match(f.ids.get('home-scene-status').textContent,/could not be attached/);
 f['without-view'].dispatch();await settle();
 assert.equal(f.handed[0].inspection,undefined);assert.equal(f.handed[0].photo,product.photos[0].url);
 assert.equal(f.handed[0].note,'Loading clearance?');f.dispose();
});

test('leaving during capture cannot navigate or modify the new page', async()=>{
 let release;
 const f=fixture({capture:()=>new Promise(resolve=>release=resolve)});f.ready();
 f.inquiry.dispatch();await settle();f.dispose();release(captured);await settle();
 assert.equal(f.handed.length,0);assert.equal(f.disposals,1);
});

test('viewport loading mounts once and latest chapter intent survives loading', async()=>{
 const f=fixture({lazy:true});assert.equal(f.mounts,0);
 f.enter([{isIntersecting:false}]);assert.equal(f.mounts,0);
 f.steps[1].dispatch();f.steps[2].dispatch();f.ready();await settle();
 assert.equal(f.mounts,1);assert.equal(f.requests.some(x=>x[0]==='playOperation'),false);
 f.enter([{isIntersecting:true}]);assert.equal(f.mounts,1);
 f.dispose();f.enter([{isIntersecting:true}]);assert.equal(f.mounts,1);assert.equal(f.disposals,1);
 const untouched=fixture({lazy:true});untouched.dispose();untouched.enter([{isIntersecting:true}]);assert.equal(untouched.mounts,0);
});
