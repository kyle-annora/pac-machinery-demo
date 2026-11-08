import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildStatic, isolateStorage, normalizeBase, relocateURLs, storageFamilies } from './build-static.mjs';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('deployment URLs move under the repository while external URLs, component IDs and protocols stay intact', () => {
  const input = `src="/src/app.js"; fetch('/source'); iframe="/explorer/walkthrough/"; url(/assets/photo.png); const site='/website/';const pitch='/pitch/';const presentation='/#present/deal-pac-demo';const workspace='/#workspace';const review='/review.html#token';fetch('/api/session');const model="/CRANK_SLIDER_ASSEMBLY/Base"; const protocol="annora.explorer/0.1-draft"; const external="https://example.test/explorer/model.glb";`;
  const result = relocateURLs(input, '/pac-machinery-demo/');
  for (const value of ['/pac-machinery-demo/src/app.js', '/pac-machinery-demo/source', '/pac-machinery-demo/explorer/walkthrough/', '/pac-machinery-demo/assets/photo.png', '/pac-machinery-demo/website/', '/pac-machinery-demo/pitch/', '/pac-machinery-demo/#present/deal-pac-demo', '/pac-machinery-demo/#workspace', '/pac-machinery-demo/review.html#token', '/pac-machinery-demo/api/session']) assert.ok(result.includes(value));
  for (const value of ['/CRANK_SLIDER_ASSEMBLY/Base', 'annora.explorer/0.1-draft', 'https://example.test/explorer/model.glb']) assert.ok(result.includes(value));
  assert.equal(relocateURLs(result, '/pac-machinery-demo/'), result);
  assert.equal(relocateURLs(input, '/'), input);
  for (const bad of ['pac/', '//repo/', '/../', '/repo/../', '/repo?x/', '/repo']) assert.throws(() => normalizeBase(bad));
});

test('generated storage keys cannot resume or overwrite the neighboring Explorer project', () => {
  const records = new Map([['annora.walkthrough.session.v1', 'existing-explorer-session']]);
  const source = `
    const key = 'annora.walkthrough.session.v1';
    const db = 'annora.studio.drawing-assets.v1';
    const seller = \`annora.seller.work.\${id}\`;
    const pac = 'pac.rollbag.drafts.v1';
    const protocol = 'annora.explorer/0.1-draft';
    const component = '/CRANK_SLIDER_ASSEMBLY/Base';
    const namespaceAllowed = value => value.startsWith('annora.studio.');
    result.before = storage.getItem(key);
    storage.setItem(key, 'new-pac-session');
    Object.assign(result, {key, db, seller, pac, protocol, component, valid:namespaceAllowed(db)});
  `;
  const context = { id: 'project-1', result: {}, storage: { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) } };
  vm.runInNewContext(isolateStorage(source), context);
  assert.equal(context.result.before, null);
  assert.equal(records.get('annora.walkthrough.session.v1'), 'existing-explorer-session');
  assert.equal(records.get('pac-machinery-demo.annora.walkthrough.session.v1'), 'new-pac-session');
  assert.equal(context.result.db, 'pac-machinery-demo.annora.studio.drawing-assets.v1');
  assert.equal(context.result.seller, 'pac-machinery-demo.annora.seller.work.project-1');
  assert.equal(context.result.pac, 'pac-machinery-demo.pac.rollbag.drafts.v1');
  assert.equal(context.result.valid, true);
  assert.equal(context.result.protocol, 'annora.explorer/0.1-draft');
  assert.equal(context.result.component, '/CRANK_SLIDER_ASSEMBLY/Base');
  for (const family of storageFamilies) {
    const value = JSON.stringify(family + 'test');
    const isolated = isolateStorage(value);
    assert.equal(JSON.parse(isolated), 'pac-machinery-demo.' + family + 'test');
    assert.equal(isolateStorage(isolated), isolated);
  }
});

async function fixture(t) {
  const parent = path.join(workspace, 'work/github-preview');
  await fs.mkdir(parent, { recursive: true });
  const directory = await fs.mkdtemp(path.join(parent, 'static-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'app'), source = path.join(directory, 'catalog'), out = path.join(directory, 'site');
  async function write(file, bytes) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, bytes); }
  await write(path.join(root, 'index.html'), '<script type="module" src="/src/app.js"></script><img src="/assets/photo.png"><iframe src="/explorer/walkthrough/"></iframe>');
  await write(path.join(root, 'src/app.js'), `const key='pac.rollbag.drafts.v1';const source='/source';`);
  await write(path.join(root, 'src/customer-review.js'), "const api='/api/customer/';");
  await write(path.join(root, 'src/catalog-admin.js'), "import crypto from 'node:crypto';");
  await write(path.join(root, 'review.html'), '<body><script type="module" src="/src/customer-review.js"></script></body>');
  await write(path.join(root, 'website/index.html'), '<body><script type="module" src="./app.js"></script><link rel="stylesheet" href="./styles.css"></body>');
  await write(path.join(root, 'website/app.js'), "const key='pac.website.inquiry.v1';const logo='/assets/photo.png';fetch('/api/inquiries');");
  await write(path.join(root, 'website/styles.css'), '@font-face{src:url(./assets/font.ttf)}');
  await write(path.join(root, 'website/assets/font.ttf'), Buffer.from('font-fixture'));
  await write(path.join(root, 'website/build-data.mjs'), "import fs from 'node:fs';");
  await write(path.join(root, 'NOTICE.txt'), 'PAC and third-party attribution');
  await write(path.join(root, 'pitch/index.html'), '<body><script src="runtime-config.js"></script><script type="module" src="pitch.js"></script><a href="downloads/pitch.pdf">PDF</a></body>');
  await write(path.join(root, 'pitch/runtime-config.js'), await fs.readFile(path.join(workspace, 'pitch/runtime-config.js')));
  await write(path.join(root, 'pitch/pitch.js'), 'const runtime = window.PAC_PITCH_RUNTIME;');
  await write(path.join(root, 'pitch/assets/fonts/Archivo-OFL.txt'), 'Archivo license fixture');
  await write(path.join(root, 'pitch/downloads/pitch.pdf'), 'PDF fixture');
  await write(path.join(root, 'pitch/README.md'), 'Local development notes');
  await write(path.join(root, 'hosting/worker.mjs'), 'Worker source must not be copied');
  await write(path.join(root, '.openai/hosting.json'), 'private deployment configuration');
  await write(path.join(root, 'tmp/qa.txt'), 'private QA');
  await write(path.join(root, 'server/app.mjs'), 'private server implementation');
  await write(path.join(root, 'work/runtime/pac.sqlite'), 'private sqlite');
  await write(path.join(root, 'assets/photo.png'), Buffer.from([137, 80, 78, 71, 1, 2]));
  await write(path.join(root, 'assets/explorer/walkthrough/index.html'), '<script type="module" src="/explorer/assets/main.js"></script>');
  await write(path.join(root, 'assets/explorer/assets/main.js'), `import './helper.js';const model='/explorer/assets/model.glb';const key='annora.walkthrough.session.v1';const protocol='annora.explorer/0.1-draft';`);
  await write(path.join(root, 'assets/explorer/assets/helper.js'), 'export const value = 1;');
  await write(path.join(root, 'assets/explorer/assets/model.glb'), Buffer.from('glTF\0binary:/explorer/assets/keep-this-exact', 'utf8'));
  await write(path.join(root, 'assets/explorer/LICENSES.txt'), 'MIT: fixture license\n');
  await write(path.join(root, 'outputs/private-note.txt'), 'This must never be published.');
  await write(path.join(source, 'manifest.json'), JSON.stringify({ run_id: 'fixture-run', status: 'passed', signed_off: true, catalog_sha256: 'fixture-digest', extractor_cost: 99, source_file: '/private/source.docx' }));
  await write(path.join(source, 'overview.json'), '{"run_id":"fixture-run"}\n');
  for (const name of ['machines', 'price_lines', 'narratives', 'commercial_terms', 'spare_parts', 'options']) await write(path.join(source, `catalog/${name}.json`), '[]\n');
  await write(path.join(source, 'catalog/media.json'), '[{"file":"media/photo.png","converted_file":"media/photo.webp"}]\n');
  await write(path.join(source, 'media/photo.png'), Buffer.from([137, 80, 78, 71]));
  await write(path.join(source, 'media/photo.webp'), Buffer.from('RIFFtestWEBP'));
  await write(path.join(source, 'media/unreferenced.txt'), 'not runtime input');
  return { root, source, out, directory };
}

test('static build includes only runtime inputs, projects manifest fields, preserves assets, and rebuilds deterministically', async t => {
  const options = { ...await fixture(t), base: '/pac-machinery-demo/' };
  const originalManifest = await fs.readFile(path.join(options.source, 'manifest.json'));
  const first = await buildStatic(options);
  assert.deepEqual(first.errors, []);
  const marker = await fs.readFile(path.join(options.out, '.pac-static-build.json'));
  assert.equal(JSON.parse(marker).deliveryMode, 'static-preview');
  const published = JSON.parse(await fs.readFile(path.join(options.out, 'source/manifest.json')));
  assert.deepEqual(published, { run_id: 'fixture-run', status: 'passed', signed_off: true, catalog_sha256: 'fixture-digest' });
  assert.deepEqual(await fs.readFile(path.join(options.source, 'manifest.json')), originalManifest);
  for (const file of ['assets/model.glb', 'LICENSES.txt']) assert.deepEqual(await fs.readFile(path.join(options.out, 'explorer', file)), await fs.readFile(path.join(options.root, 'assets/explorer', file)));
  assert.deepEqual(await fs.readFile(path.join(options.out, 'source/catalog/media.json')), await fs.readFile(path.join(options.source, 'catalog/media.json')));
  await assert.rejects(fs.stat(path.join(options.out, 'outputs/private-note.txt')), { code: 'ENOENT' });
  await assert.rejects(fs.stat(path.join(options.out, 'source/media/unreferenced.txt')), { code: 'ENOENT' });
  for (const file of ['src/catalog-admin.js', 'website/build-data.mjs', 'server/app.mjs', 'work/runtime/pac.sqlite', 'pitch/README.md', 'hosting/worker.mjs', '.openai/hosting.json', 'tmp/qa.txt']) await assert.rejects(fs.stat(path.join(options.out, file)), { code: 'ENOENT' });
  for (const file of ['NOTICE.txt', 'pitch/assets/fonts/Archivo-OFL.txt', 'pitch/downloads/pitch.pdf']) assert.deepEqual(await fs.readFile(path.join(options.out, file)), await fs.readFile(path.join(options.root, file)));
  const context = vm.createContext({ window: {}, location: { hostname: 'kyle-annora.github.io' } });
  vm.runInContext(await fs.readFile(path.join(options.out, 'pitch/runtime-config.js'), 'utf8'), context);
  assert.equal(context.window.PAC_PITCH_RUNTIME.websiteUrl, '/pac-machinery-demo/website/#/');
  assert.equal(context.window.PAC_PITCH_RUNTIME.workspaceUrl, '/pac-machinery-demo/#present/deal-pac-demo');
  assert.equal(context.window.PAC_PITCH_RUNTIME.staticPreview, true);
  for (const file of ['index.html', 'website/index.html', 'review.html']) {
    const html=await fs.readFile(path.join(options.out,file),'utf8');
    assert.match(html,/data-static-preview/);assert.match(html,/require the local service/);
  }
  assert.doesNotMatch(await fs.readFile(path.join(options.out,'explorer/walkthrough/index.html'),'utf8'),/data-static-preview/);
  assert.match(await fs.readFile(path.join(options.out,'website/app.js'),'utf8'),/\/pac-machinery-demo\/api\/inquiries/);
  assert.deepEqual(await fs.readFile(path.join(options.out,'website/assets/font.ttf')),await fs.readFile(path.join(options.root,'website/assets/font.ttf')));
  await buildStatic(options);
  assert.deepEqual(await fs.readFile(path.join(options.out, '.pac-static-build.json')), marker);
});

test('build refuses unsafe destinations and catalog traversal before touching input data', async t => {
  const options = await fixture(t);
  await assert.rejects(buildStatic({ ...options, out: options.root }), /Output cannot replace/);
  await assert.rejects(buildStatic({ ...options, out: path.join(options.root, 'assets/output') }), /separate from assets/);
  await assert.rejects(buildStatic({ ...options, out: path.join(options.root, 'work/runtime/output') }), /separate from work\/runtime/);
  await fs.mkdir(options.out);
  await fs.writeFile(path.join(options.out, 'keep.txt'), 'keep');
  await assert.rejects(buildStatic(options), /Refusing to overwrite/);
  assert.equal(await fs.readFile(path.join(options.out, 'keep.txt'), 'utf8'), 'keep');
  await fs.writeFile(path.join(options.source, 'catalog/media.json'), '[{"file":"../private.txt"}]');
  await assert.rejects(buildStatic({ ...options, out: path.join(options.directory, 'new-output') }), /Unsafe catalog path/);
});
