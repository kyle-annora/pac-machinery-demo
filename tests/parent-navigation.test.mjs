import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('const PARENT_HISTORY_KEY='),source.indexOf("window.addEventListener('beforeunload'"));
function setup(){
 const entries=[{hash:'#demo',state:null}], listeners={};let at=0, renders=0, decision=true, iframe={dirty:999}, prompts=0, scrolls=0;
 const location={get hash(){return entries[at].hash;},get href(){return 'http://localhost/'+entries[at].hash;}};
 const history={get state(){return entries[at].state;},replaceState(state,_title,url){entries[at]={hash:new URL(url,'http://localhost/').hash,state};},pushState(state,_title,url){entries.splice(at+1);entries.push({hash:new URL(url,'http://localhost/').hash,state});at++;},go(delta){at+=delta;queueMicrotask(()=>listeners.hashchange?.());}};
 const context=vm.createContext({history,location,renderedView:'demo',renderedHash:'#demo',navigationPending:false,toolsCleanup:null,toast(){},document:{addEventListener(){},querySelector(selector){return selector==='.pac-content'?{scrollTo({top}){assert.equal(top,0);scrolls++;}}:null;}},window:{addEventListener(k,fn){listeners[k]=fn;},scrollTo(){}},explorerHost:()=>({beforeLeave:async()=>{prompts++;return typeof decision==='function'?decision():decision;}}),render(){renders++;context.renderedHash=location.hash;context.renderedView=location.hash.slice(1).split('/')[0];iframe={dirty:185};}});
 vm.runInContext(code,context);
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 return {context,entries,get at(){return at;},get iframe(){return iframe;},get renders(){return renders;},get prompts(){return prompts;},get scrolls(){return scrolls;},setDecision(v){decision=v;},edit(){iframe.dirty=999;},async hash(hash){history.pushState(null,'',hash);await listeners.hashchange();await settle();},async back(){history.go(-1);await settle();await settle();},async forward(){history.go(1);await settle();await settle();},async click(hash){await context.navigateParentLink(hash);await settle();},history,settle};
}
async function discovery(){const h=setup();await h.hash('#detail/r3200');await h.hash('#discovery');h.edit();return h;}
test('cancel Back restores index and original detail entry without replacing iframe or dirty value',async()=>{
 const h=await discovery(),frame=h.iframe,before=h.renders;
 h.setDecision(false);await h.back();
 assert.deepEqual(h.entries.map(x=>x.hash),['#demo','#detail/r3200','#discovery']);assert.equal(h.at,2);assert.equal(h.iframe,frame);assert.equal(h.iframe.dirty,999);assert.equal(h.renders,before);
 h.setDecision(true);await h.back();assert.equal(h.at,1);assert.equal(h.context.renderedHash,'#detail/r3200');assert.equal(h.entries[1].hash,'#detail/r3200');
});
test('cancel outer link changes neither URL nor history; discard then commits one destination',async()=>{
 const h=await discovery(),frame=h.iframe;
 h.setDecision(false);await h.click('#machines');assert.equal(h.at,2);assert.equal(h.entries.length,3);assert.equal(h.context.renderedHash,'#discovery');assert.equal(h.iframe,frame);
 h.setDecision(true);await h.click('#machines');assert.deepEqual(h.entries.map(x=>x.hash),['#demo','#detail/r3200','#discovery','#machines']);assert.equal(h.context.renderedHash,'#machines');
});
test('successful save waits before rendering Back destination and does not rewrite history',async()=>{
 const h=await discovery(),frame=h.iframe;let release,saved=185;
 h.setDecision(()=>new Promise(resolve=>{release=()=>{saved=frame.dirty;resolve(true);};}));h.history.go(-1);await h.settle();
 assert.equal(h.iframe,frame);assert.equal(saved,185);assert.equal(h.context.renderedView,'discovery');release();await h.settle();await h.settle();
 assert.equal(saved,999);assert.equal(h.context.renderedHash,'#detail/r3200');assert.deepEqual(h.entries.map(x=>x.hash),['#demo','#detail/r3200','#discovery']);
});
test('cancel Forward restores original index and retains the saved forward destination',async()=>{
 const h=await discovery();h.setDecision(true);await h.click('#machines');await h.back();h.edit();const frame=h.iframe;
 h.setDecision(false);await h.forward();assert.equal(h.at,2);assert.equal(h.iframe,frame);assert.equal(h.entries[3].hash,'#machines');
 h.setDecision(true);await h.forward();assert.equal(h.context.renderedHash,'#machines');assert.equal(h.at,3);
});
test('direct hash change cancellation restores original entry without overwriting attempted destination',async()=>{
 const h=await discovery(),frame=h.iframe;h.setDecision(false);await h.hash('#drafts');
 assert.equal(h.at,2);assert.equal(h.iframe,frame);assert.equal(h.entries[1].hash,'#detail/r3200');assert.equal(h.entries[3].hash,'#drafts');
});

test('unchanged parent hash never remounts or guards embedded viewer history',async()=>{
 const h=await discovery(),frame=h.iframe,renders=h.renders,prompts=h.prompts,scrolls=h.scrolls;
 await h.context.renderNavigation();assert.equal(h.iframe,frame);assert.equal(h.renders,renders);assert.equal(h.prompts,prompts);assert.equal(h.iframe.dirty,999);assert.equal(h.scrolls,scrolls);assert.equal(scrolls,renders);
});

test('catalog form cancellation preserves its history entry and mounted view',async()=>{const h=setup();await h.hash('#catalog-admin');const before=h.renders;h.context.toolsCleanup={beforeLeave:()=>false};await h.back();assert.equal(h.context.renderedHash,'#catalog-admin');assert.equal(h.renders,before);h.context.toolsCleanup={beforeLeave:()=>true};await h.back();assert.equal(h.context.renderedHash,'#demo');});
