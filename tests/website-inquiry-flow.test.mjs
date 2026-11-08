import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
import { loadingMethods, inquirySelectOptions, solutionContext, productPath, inquiryPath, prefillInquiry, inquirySnapshot, inquiryReceiptText, hasInquiryDraft, inquiryEntryNeedsChoice, archiveInquiryDraft } from "../website/inquiry-flow.js";
import { escapeHTML, referenceForProduct, routeFromHash, validateInquiry } from "../website/model.js";

const { products } = JSON.parse(readFileSync(new URL("../website/data/products.json", import.meta.url), "utf8"));
const contact = { name: "Alex Buyer", company: "Example Packaging", email: "alex@example.com" };

test("application context survives solution → exact equipment → Explorer → inquiry", () => {
  const solution = solutionContext("fulfillment");
  const selected = solution.products[0];
  const productRoute = routeFromHash(productPath(selected, solution.id));
  const explorerRoute = routeFromHash(productPath(selected, productRoute.params.get("solution"), "explorer"));
  const inquiryRoute = routeFromHash(inquiryPath(explorerRoute.parts[1], explorerRoute.params.get("solution"), "Will this fit our conveyor?"));
  const draft = prefillInquiry(contact, inquiryRoute.params, products);
  assert.equal(draft.productId, selected);
  assert.equal(draft.application, "E-commerce & fulfillment packaging");
  assert.equal(draft.message, "Will this fit our conveyor?");
  assert.equal(draft.email, contact.email);
});

test("consumed entry seeds cannot overwrite the recovered edited inquiry", () => {
  const initial = prefillInquiry(contact, routeFromHash(inquiryPath("r3200", "parts")).params, products);
  const edited = { ...initial, application: "Small fastener kits; 20 bags per minute", message: "A 10 in × 12 in bag" };
  const restored = prefillInquiry(JSON.parse(JSON.stringify(edited)), new URLSearchParams(), products);
  assert.deepEqual(restored, edited);
  const returnedFromExplorer = prefillInquiry(edited, routeFromHash(inquiryPath("r3200", "parts")).params, products);
  assert.deepEqual(returnedFromExplorer, edited);
  assert.equal(initial.application, "Parts & kits packaging");
});

test("unrecognized routes never invent equipment or application context", () => {
  assert.equal(productPath("r3200", "not-a-solution"), "#/products/r3200");
  assert.equal(inquiryPath("r3200", "not-a-solution"), "#/inquiry?product=r3200");
  assert.equal(productPath("r3200", 1), "#/products/r3200"); // safe as an Array.map callback
  const result = prefillInquiry({ ...contact, application: "My existing application" }, new URLSearchParams("product=missing&solution=missing"), products);
  assert.equal(result.productId, "");
  assert.equal(result.application, "My existing application");
});

test("submitted snapshot is independent of later draft and Explorer edits", () => {
  const fields = { ...contact, productId: "r3200", application: "Fastener kits", workspaceDealId: "PRIVATE" };
  const reference = { productId: "r3200", title: "Slider carriage", source: "Reference assembly — not PAC CAD", note: "Loading clearance?", preview: "data:image/png;base64,example", inspection: { preview: { dataUrl: "data:image/png;base64,example" } } };
  const snapshot = inquirySnapshot(fields, reference);
  fields.company = "Another company";
  fields.productId = "r1285_med";
  reference.note = "Changed question";
  reference.inspection.preview.dataUrl = "changed";
  assert.equal(snapshot.company, "Example Packaging");
  assert.equal(snapshot.reference.note, "Loading clearance?");
  assert.equal(snapshot.reference.inspection.preview.dataUrl, "data:image/png;base64,example");
  assert.equal(snapshot.reference.preview, undefined);
  assert.equal(snapshot.workspaceDealId, undefined);
  assert.equal(snapshot.requestId, undefined);
  assert.equal(inquirySnapshot(fields, reference).reference, undefined);
});

test("download is a qualified receipt with actual submitted details, not raw scene data", () => {
  const snapshot = inquirySnapshot({ ...contact, productId: "r3200", application: "Fastener kits", targetThroughput: "20", loadingMethod: "By hand" }, { productId: "r3200", title: "Loading view", source: "Reference assembly — not PAC CAD", note: "Loading clearance?", preview: "data:image/png;base64,secret" });
  const text = inquiryReceiptText({ reference: "PAC-INQ-TEST", receivedAt: "2026-11-08T12:00:00Z" }, snapshot, "Rollbag R3200");
  assert.match(text, /PAC-INQ-TEST/);
  assert.match(text, /Not emailed to PAC/);
  assert.match(text, /Equipment: Rollbag R3200/);
  assert.match(text, /Reference assembly — not PAC CAD/);
  assert.match(text, /Target bags per minute: 20/);
  assert.doesNotMatch(text, /base64|secret|requestId|workspaceDeal/);
});

test("restored overlength contact fields are rejected before server save", () => {
  const valid = { ...contact, application: "Fastener kits" };
  assert.deepEqual(validateInquiry(valid), {});
  const errors = validateInquiry({ ...valid, name: "x".repeat(151), company: "x".repeat(201), phone: "x".repeat(81) });
  assert.deepEqual(Object.keys(errors), ["name", "company", "phone"]);
});

// Exercise the real inquiry template, without a browser or a DOM dependency.
// This validates the form's emitted HTML, including option boundaries and values.
function renderInquiryForm(fields, reference = null, params = new URLSearchParams()) {
  const source = readFileSync(new URL("../website/app.js", import.meta.url), "utf8");
  const context = {
    draft: structuredClone(fields), activeReference: structuredClone(reference), products,
    archivedDrafts: [], pendingReference: null, hasInquiryDraft, inquiryEntryNeedsChoice, archiveInquiryDraft, solutionContext,
    requestId: "before-edit", crypto: { randomUUID }, prefillInquiry, referenceForProduct,
    loadingMethods, inquirySelectOptions, e: escapeHTML, persist: () => true,
    product: (id) => products.find((item) => item.id === id),
    shell: (html) => html, crumb: () => "", photo: () => "", icon: () => "",
    history: { replaceState() {} }, location: { pathname: "/website/", search: "" },
    params,
  };
  vm.runInNewContext(`${source.slice(source.indexOf("function formField("), source.indexOf("function inquirySummary("))}\nhtml = inquiry(params);`, context);
  return context;
}

function optionsFor(html, name) {
  const inner = html.match(new RegExp(`<select name="${name}">([\\s\\S]*?)</select>`))?.[1];
  assert.ok(inner, `Missing ${name} select`);
  const pattern = /<option value="([^"]*)"( selected)?>([^<]*)<\/option>/g;
  const options = [...inner.matchAll(pattern)];
  assert.equal(options.map(([raw]) => raw).join(""), inner, `${name} contains malformed or unwrapped option content`);
  return options.map(([, value, selected, label]) => ({ value, selected: Boolean(selected), label }));
}

test("actual inquiry form exposes four valid loading options and restores the selected value", () => {
  for (const method of ["", ...loadingMethods]) {
    const { html } = renderInquiryForm({ ...contact, application: "Fastener kits", loadingMethod: method });
    const options = optionsFor(html, "loadingMethod");
    assert.deepEqual(options.map(({ value }) => value), ["", "By hand", "Feeder or conveyor", "Integrated line"]);
    assert.deepEqual(options.filter(({ selected }) => selected).map(({ value }) => value), [method]);
    assert.equal(options[0].label, "To be discussed");
  }
});

test("equipment change rerenders valid options, retains edited fields and clears incompatible reference", () => {
  const fields = { ...contact, productId: "r1285_med", application: "Kits & parts < 20 g", loadingMethod: "Integrated line", message: 'Use a 10" bag' };
  const context = renderInquiryForm(fields, { productId: "r3200", title: "Old view" });
  const equipment = optionsFor(context.html, "productId");
  assert.equal(equipment.length, products.length + 1);
  assert.deepEqual(equipment.filter(({ selected }) => selected).map(({ value }) => value), ["r1285_med"]);
  assert.equal(context.activeReference, null);
  assert.equal(context.draft.application, fields.application);
  assert.equal(context.draft.message, fields.message);
  assert.match(context.html, /Kits &amp; parts &lt; 20 g<\/textarea>/);
  assert.match(context.html, /Use a 10&quot; bag<\/textarea>/);
  // Review does not replace the draft; returning to editing renders its values.
  const reviewed = inquirySnapshot(context.draft, context.activeReference);
  const edited = renderInquiryForm(context.draft);
  assert.deepEqual(inquirySnapshot(edited.draft), reviewed);
  assert.deepEqual(optionsFor(edited.html, "loadingMethod").filter(({ selected }) => selected).map(({ value }) => value), ["Integrated line"]);
});


test("global inquiry entry requires a choice before changing existing equipment or text", () => {
  const fields = { ...contact, productId: "r3200", application: "Hardware kits", message: "Keep this application note" };
  const reference = { productId: "r3200", title: "Loading view", note: "Original question" };
  const params = new URLSearchParams("entry=global&product=r1285_med");
  const context = renderInquiryForm(fields, reference, params);
  assert.match(context.html, /You have an inquiry in progress/);
  assert.match(context.html, /Continue existing inquiry/);
  assert.match(context.html, /Start an inquiry for R1285 Med/);
  assert.deepEqual(context.draft, fields);
  assert.deepEqual(context.activeReference, reference);
  assert.equal(context.requestId, "before-edit");
});

test("different product entry is protected while deliberate same-product continuation remains direct", () => {
  const fields = { productId: "r3200", application: "Manual loading" };
  assert.equal(inquiryEntryNeedsChoice(fields, new URLSearchParams("product=r1285_med")), true);
  assert.equal(inquiryEntryNeedsChoice(fields, new URLSearchParams("product=r3200")), false);
  assert.equal(inquiryEntryNeedsChoice(fields, new URLSearchParams()), false);
  assert.equal(inquiryEntryNeedsChoice({}, new URLSearchParams("entry=global&product=r3200")), false);
});

test("starting another inquiry preserves an independent restorable draft and reference", () => {
  const original = { fields: { ...contact, productId: "r3200", application: "Original application" }, reference: { productId: "r3200", title: "Original view" }, requestId: "draft-a" };
  const archive = archiveInquiryDraft([], original);
  original.fields.application = "Changed later";
  original.reference.title = "New view";
  assert.equal(archive[0].fields.application, "Original application");
  assert.equal(archive[0].reference.title, "Original view");
  const revisedArchive = archiveInquiryDraft(archive, { ...original, fields: { ...original.fields, application: "Latest A" } });
  assert.equal(revisedArchive.length, 1, "same draft identity updates instead of duplicating");
  assert.equal(archive[0].fields.application, "Original application", "previous archive object remains immutable");
  assert.deepEqual(archiveInquiryDraft([], { fields: {}, requestId: "empty" }), []);
});
