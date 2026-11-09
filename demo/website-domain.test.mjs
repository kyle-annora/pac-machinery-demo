import test from 'node:test';
import assert from 'node:assert/strict';
import {WEBSITE_STEPS,websiteAt,assertWebsiteState,submitInquiry,validateInquiry} from './website-domain.mjs';

test('every approved Website preset is independently reconstructable',()=>{
 for(const step of WEBSITE_STEPS){const state=websiteAt(step);assert.equal(assertWebsiteState(state),true);assert.equal(state.stepId,step);assert.ok(!Object.hasOwn(state,'quotes'));assert.ok(!Object.hasOwn(state,'deal'));}
});
test('product inquiry preserves unknown dimensions and selected product',()=>{
 const state=websiteAt('A04');assert.equal(state.draft.requestedModel,'Rollbag R3200');assert.equal(state.draft.bagDimensions,'Not confirmed');assert.equal(state.inquiries.length,0);submitInquiry(state);assert.equal(state.inquiries.length,1);assert.equal(state.receipt.inquiry.bagDimensions,'Not confirmed');assert.equal(state.receipt.status,'demo-submitted');
});
test('receipt is idempotent and snapshot is independent of editable draft',()=>{
 const state=websiteAt('A05');const first=JSON.stringify(state.receipt);submitInquiry(state);assert.equal(state.inquiries.length,1);assert.equal(JSON.stringify(state.receipt),first);state.draft.product='Edited draft';assert.equal(state.receipt.inquiry.product,'Irregular hardware kits');assert.equal(state.inquiries[0].inquiry.product,'Irregular hardware kits');
});
test('help route captures contacts but never silently selects a model',()=>{
 for(const id of ['H02','H03','H04']){const state=websiteAt(id);assert.equal(state.draft.requestedModel,null);assert.equal(state.draft.name,'Alex Morgan');assert.equal(state.draft.email,'alex@harbor.example');}assert.equal(websiteAt('H04').receipt.inquiry.requestedModel,null);
});
test('incomplete or invalid contacts cannot produce a receipt',()=>{
 const state=websiteAt('A03');assert.ok(validateInquiry(state.draft).length);assert.throws(()=>submitInquiry(state),/name/);assert.equal(state.inquiries.length,0);const filled=websiteAt('A04');filled.draft.email='not-email';assert.throws(()=>submitInquiry(filled),/email/);assert.equal(filled.inquiries.length,0);
});
test('back and replay have a deterministic single receipt',()=>{
 const before=websiteAt('A04'),after=websiteAt('A05'),replay=websiteAt('A05');assert.equal(before.inquiries.length,0);assert.deepEqual(after,replay);assert.equal(after.inquiries.length,1);assert.throws(()=>websiteAt('A06'),/does not belong/);
});
