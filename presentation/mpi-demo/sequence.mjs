export const QUESTION = 'What tooling and handling clearance should we confirm for this application?';
export const BEATS = Object.freeze([
  {id:'machine',duration:8,title:'Start with the machine.',detail:'An interactive example using the MPI 35 Series.',area:'Whole machine',say:'Here’s an interactive example using the MPI 35 Series.',action:'Establish the whole machine with a slow, controlled orbit.'},
  {id:'tooling',duration:12,title:'Find the working area.',detail:'Guide the conversation to the part that matters.',area:'Tooling area',say:'We can guide the buyer straight to the area they want to understand.',action:'Move to the tooling area and allow the camera to settle.'},
  {id:'movement',duration:13,title:'Understand the movement.',detail:'A short opening study makes the sequence visible.',area:'Opening study',say:'A short motion study helps explain the opening sequence. Actual tooling fit still needs engineering confirmation.',action:'Open the platen over three seconds, then hold the open state. This is illustrative movement, not engineering verification.'},
  {id:'controls',duration:10,title:'Keep the machine in context.',detail:'Move from the working area to the operator controls.',area:'Operator controls',say:'Then we can move from the working area to the operator controls, while keeping the machine in context.',action:'Focus the controls without opening a separate page.'},
  {id:'question',duration:17,title:'Ask a specific question.',detail:'Keep the view alongside the question.',area:'Tooling area',say:'The buyer can now ask a specific question: what tooling and handling clearance should we confirm for this application?',action:'Return to the tooling area. Show the prepared example question and save the actual camera, focus and opening state. This is an isolated demonstration record, not a submitted inquiry.'},
  {id:'context',duration:20,title:'Return to the same view.',detail:'Carry the visual context into the next conversation.',area:'Saved tooling view',say:'We can return to this exact view as the discussion continues. For PAC, the same approach could support conversations about loading, bag handling and access—with an approved equipment model.',action:'Move to the whole machine, then restore the captured tooling view. End on the PAC application statement and wait for the presenter to return to customer outcomes.'},
]);
export const TOTAL = BEATS.reduce((n,b)=>n+b.duration,0);
export function sameView(a,b){
  if(!a||!b||a.model!==b.model||a.focus!==b.focus)return false;
  const numbers=x=>[x.opening,x.span,x.minimumWidth,x.camera?.zoom,...(x.camera?.position||[]),...(x.camera?.target||[])];
  const av=numbers(a),bv=numbers(b);
  return av.length===10&&bv.length===10&&av.every((n,i)=>Number.isFinite(n)&&Number.isFinite(bv[i])&&Math.abs(n-bv[i])<1e-7);
}
export class DemoClock {
  constructor(){this.reset();}
  reset(){this.index=0;this.elapsed=0;this.status='ready';}
  start(){if(this.status==='ready')this.status='running';}
  pause(){if(this.status==='running')this.status='paused';}
  resume(){if(this.status==='paused')this.status='running';}
  get totalElapsed(){return BEATS.slice(0,this.index).reduce((n,b)=>n+b.duration,0)+this.elapsed;}
  tick(dt,settled=true){
    if(this.status!=='running'||!Number.isFinite(dt)||dt<0)return false;
    this.elapsed=Math.min(BEATS[this.index].duration,this.elapsed+dt);
    if(this.elapsed<BEATS[this.index].duration||!settled)return false;
    if(this.index===BEATS.length-1){this.status='completed';return false;}
    this.index++;this.elapsed=0;return true;
  }
}
export function validReturnURL(raw,base){
  const origin=new URL(base).origin;
  try {const url=new URL(raw,base);if(url.origin!==origin||!/^https?:$/.test(url.protocol)||!/(?:^|\/)presentation\/(?:2026-11-08\/)?(?:index\.html)?$/.test(url.pathname))return null;url.search='?view=present';url.hash='02-proof';return url.href;}catch{return null;}
}
