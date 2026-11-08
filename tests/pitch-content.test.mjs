import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative));
const source = read('pitch/pitch.js').toString();
const content = JSON.parse(read('pitch/content.json'));
const chapters = Object.fromEntries(content.chapters.map(chapter => [chapter.id, chapter]));
const hash = value => createHash('sha256').update(value).digest('hex');

// Exercise the existing pure chapter renderer without initializing a page,
// starting a server or touching either artifact's data.
function render(id, hostname = '127.0.0.1', runtimeOverride) {
  const context = vm.createContext({
    document: {}, window: {}, location: { hostname, search: '', href: `https://${hostname}/pitch/` }, URL, URLSearchParams,
    matchMedia: () => ({ matches: false }), input: chapters[id],
  });
  vm.runInContext(read('pitch/runtime-config.js').toString(), context);
  if (runtimeOverride !== undefined) context.window.PAC_PITCH_RUNTIME = runtimeOverride;
  vm.runInContext(source.slice(0, source.indexOf('async function init()')) + '\nresult = chapter(input);', context);
  return context.result;
}

test('pitch offer has one mutual-confirmation contract in the page and downloadable package', () => {
  const continuation = chapters.continuation;
  assert.equal(continuation.intro, [continuation.offerTitle, continuation.offerTerms, continuation.offerAssurance].join(' '));
  assert.equal(continuation.offerTitle, 'Two weeks free.');
  assert.match(continuation.offerTerms, /only after we both confirm scope, price and support in writing/);
  assert.equal(continuation.offerAssurance, 'No automatic charges.');
  const html = render('continuation');
  for (const fact of [continuation.offerTitle, continuation.offerTerms, continuation.offerAssurance]) assert.ok(html.includes(fact));
  assert.match(html, /No trial has started and no payment is authorized/);
  assert.match(html, /downloads\/pac-trial-brief\.pdf/);
});

test('pitch proposes bounded user-completed work and retains unconfirmed integration and CAD boundaries', () => {
  assert.match(chapters.opportunity.detail, /Two independent local demos/);
  assert.match(chapters['buyer-experience'].detail, /does not automatically create/);
  assert.match(chapters['trial-scope'].detail, /to be agreed with PAC before the trial begins/);
  assert.match(chapters.continuation.scope, /one product family.*2–3 PAC participants.*3–5 quote cases/);
  assert.match(chapters.continuation.takeaway, /Day 1 starts when.*ready/);
  assert.match(chapters['trial-scope'].boundary, /Approved PAC CAD is not a prerequisite/);
  assert.match(chapters['buyer-experience'].proof[1].caption, /not PAC equipment or approved PAC CAD/);
  for (const dependency of ['CRM', 'SSO', 'email', 'documents', 'signing', 'payment']) assert.ok(chapters.continuation.boundary.includes(dependency));
  const trial = JSON.stringify(chapters.continuation.trialRows);
  for (const requirement of [/Saved quote and PDF/, /hours, materials/, /delivery conditions/, /Unpriced work stays non-final/, /resubmitted/, /authorized review/, /Earlier issued versions stay unchanged/]) assert.match(trial, requirement);
  assert.match(chapters.evaluation.scorecard[0].check, /PAC users complete.*without Annora operating/);
  assert.match(chapters.priorities.caption, /Preparation time and customer turnaround are different measures/);
});

test('public pitch rendering never exposes presenter localhost navigation or recipient bearer links', () => {
  for (const chapter of content.chapters) {
    const html = render(chapter.id, 'pitch.example');
    assert.doesNotMatch(html, /href="https?:\/\/(?:127\.0\.0\.1|localhost)/);
    assert.doesNotMatch(html, /review\.html#o_|\/api\/customer\//);
  }
  assert.match(render('buyer-experience'), /href="http:\/\/127\.0\.0\.1:4361\/website\/#\/" target="_blank"/);
  assert.match(render('sales-workspace'), /href="http:\/\/127\.0\.0\.1:4361\/#present\/deal-pac-demo" target="_blank"/);
  assert.doesNotMatch(JSON.stringify(content), /review\.html#o_|\/api\/customer\//);
});

test('deployed pitch opens its configured independent artifacts and rejects unsafe destinations', () => {
  assert.match(render('buyer-experience', 'pac.example'), /href="\/website\/#\/" target="_blank"/);
  assert.match(render('sales-workspace', 'pac.example'), /href="\/#present\/deal-pac-demo" target="_blank"/);
  assert.match(render('sales-workspace', 'pac.example'), /Workspace sign-in required/);
  const preview = render('sales-workspace', 'kyle-annora.github.io', { workspaceUrl: '/pac-machinery-demo/#present/deal-pac-demo', staticPreview: true });
  assert.match(preview, /Browser-local preview · Shared customer review requires a server/);
  assert.doesNotMatch(preview, /Workspace sign-in required/);
  for (const destination of ['javascript:alert(1)', 'file:///private/file', 'http://127.0.0.1:4361/website/', 'https://user:password@pac.example/']) {
    assert.doesNotMatch(render('buyer-experience', 'pac.example', { websiteUrl: destination }), /class="demo-link"/);
  }
  const html = read('pitch/index.html').toString();
  assert.ok(html.indexOf('src="runtime-config.js"') < html.indexOf('src="pitch.js"'));
});

test('shipped pitch downloads match the current copy and source captures', () => {
  const manifest = JSON.parse(read('pitch/downloads/manifest.json'));
  assert.equal(manifest.content_sha256, hash(read('pitch/content.json')), 'Regenerate pitch PDFs after editing commercial or chapter copy.');
  assert.deepEqual(manifest.pdfs.map(pdf => pdf.pages), [7, 1]);
  for (const pdf of manifest.pdfs) {
    assert.equal(pdf.sha256, hash(read(pdf.file)), `${pdf.file} is not the verified generated download.`);
    assert.equal(pdf.bytes, read(pdf.file).length);
  }
  for (const [file, expected] of Object.entries(manifest.asset_sha256)) assert.equal(hash(read(file)), expected, `Regenerate PDF captures after changing ${file}.`);
});
