// Independent Website demo. No Workspace module, records or network dependency.
export const WEBSITE_STEPS = Object.freeze(['A01','A02','A03','A04','A05','H01','H02','H03','H04']);
export const WEBSITE_KEY_PREFIX = 'pac-guided-website-v1:';
const copy = v => JSON.parse(JSON.stringify(v));
export const emptyDraft = (entry = 'product') => ({
  entry, requestedModel: entry === 'product' ? 'Rollbag R3200' : null,
  referenceTopic: entry === 'product' ? 'Loading and bag opening' : null,
  name: '', company: '', email: '', product: '', material: '', loading: '', target: '',
  bagDimensions: 'Not confirmed', question: '',
});
export function sampleDraft(entry = 'product') {
  return { ...emptyDraft(entry), name: 'Alex Morgan', company: 'Harbor Components', email: 'alex@harbor.example',
    product: 'Irregular hardware kits', material: 'Polyethylene', loading: 'Manual loading',
    target: '20 bags/min', bagDimensions: 'Not confirmed',
    question: entry === 'product' ? 'Would assisted bag opening help our operators?' : 'Which bagging setup should we evaluate for our operators?'
  };
}
export function validateInquiry(draft) {
  const required = ['name','company','email','product','material','loading','target','question'];
  const errors = required.filter(k=>!String(draft[k] ?? '').trim()).map(k=>({field:k,message:`Enter ${k === 'name' ? 'your name' : k === 'product' ? 'what you package' : k === 'target' ? 'your production target' : k === 'question' ? 'your question' : k}.`}));
  if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) errors.push({field:'email',message:'Enter a valid email address.'});
  if (!['product','help'].includes(draft.entry)) errors.push({field:'entry',message:'Choose a valid inquiry entry.'});
  if (draft.entry === 'help' && draft.requestedModel !== null) errors.push({field:'requestedModel',message:'Keep model selection open for this application inquiry.'});
  return errors;
}
export function submitInquiry(state) {
  const errors = validateInquiry(state.draft);
  if (errors.length) throw Error(errors[0].message);
  const id = state.draft.entry === 'help' ? 'website-inquiry-help' : 'website-inquiry-main';
  const existing = state.inquiries.find(x=>x.id === id);
  if (existing) { state.receipt = copy(existing); state.view = 'receipt'; return existing; }
  const receipt = { id, status:'demo-submitted', createdAt:'2026-11-09T10:00:00.000Z',
    inquiry:copy(state.draft), title:'Demo inquiry recorded', detail:'Saved in this demonstration.' };
  state.inquiries.push(receipt); state.receipt = copy(receipt); state.view = 'receipt'; return receipt;
}
export function websiteAt(stepId = 'A01') {
  if (!WEBSITE_STEPS.includes(stepId)) throw Error('This step does not belong to the Website demonstration.');
  const entry = stepId.startsWith('H') ? 'help' : 'product';
  const state = { schema:1, stepId, view:'home', topic:'loading', draft:emptyDraft(entry), inquiries:[], receipt:null };
  if (stepId === 'A02') state.view='product';
  if (['A03','H01'].includes(stepId)) state.view='form';
  if (['A04','A05','H02','H03','H04'].includes(stepId)) state.draft=sampleDraft(entry);
  if (stepId === 'H02') state.view='form';
  if (['A04','H03'].includes(stepId)) state.view='review';
  if (['A05','H04'].includes(stepId)) submitInquiry(state);
  return state;
}
export function assertWebsiteState(state) {
  if (!state || state.schema !== 1 || !WEBSITE_STEPS.includes(state.stepId)) throw Error('The Website scene could not be verified.');
  if (!['home','product','form','review','receipt'].includes(state.view)) throw Error('The Website page is unavailable.');
  if (!Array.isArray(state.inquiries) || new Set(state.inquiries.map(x=>x.id)).size !== state.inquiries.length) throw Error('An inquiry was duplicated.');
  if (state.draft.entry === 'help' && state.draft.requestedModel !== null) throw Error('The application-led request must not select a model.');
  if (state.view === 'receipt' && (!state.receipt || state.receipt.status !== 'demo-submitted' || !state.inquiries.some(x=>x.id===state.receipt.id))) throw Error('The inquiry has not been recorded.');
  return true;
}
