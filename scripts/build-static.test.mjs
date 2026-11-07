import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildStatic, isolateStorage, normalizeBase, relocateURLs, storageFamilies } from './build-static.mjs';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('deployment URLs move under the repository while external URLs, component IDs and protocols stay intact', () => {
  const input = `src="/src/app.js"; fetch('/source'); iframe="/explorer/walkthrough/"; url(/assets/photo.png); const model="/CRANK_SLIDER_ASSEMBLY/Base"; const protocol="annora.explorer/0.1-draft"; const external="https://example.test/explorer/model.glb";`;
  const result = relocateURLs(input, '/pac-machinery-demo/');
  for (const value of ['/pac-machinery-demo/src/app.js', '/pac-machinery-demo/source', '/pac-machinery-demo/explorer/walkthrough/', '/pac-machinery-demo/assets/photo.png']) assert.ok(result.includes(value));
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
  const published = JSON.parse(await fs.readFile(path.join(options.out, 'source/manifest.json')));
  assert.deepEqual(published, { run_id: 'fixture-run', status: 'passed', signed_off: true, catalog_sha256: 'fixture-digest' });
  assert.deepEqual(await fs.readFile(path.join(options.source, 'manifest.json')), originalManifest);
  for (const file of ['assets/model.glb', 'LICENSES.txt']) assert.deepEqual(await fs.readFile(path.join(options.out, 'explorer', file)), await fs.readFile(path.join(options.root, 'assets/explorer', file)));
  assert.deepEqual(await fs.readFile(path.join(options.out, 'source/catalog/media.json')), await fs.readFile(path.join(options.source, 'catalog/media.json')));
  await assert.rejects(fs.stat(path.join(options.out, 'outputs/private-note.txt')), { code: 'ENOENT' });
  await assert.rejects(fs.stat(path.join(options.out, 'source/media/unreferenced.txt')), { code: 'ENOENT' });
  await buildStatic(options);
  assert.deepEqual(await fs.readFile(path.join(options.out, '.pac-static-build.json')), marker);
});

test('build refuses unsafe destinations and catalog traversal before touching input data', async t => {
  const options = await fixture(t);
  await assert.rejects(buildStatic({ ...options, out: options.root }), /Output cannot replace/);
  await assert.rejects(buildStatic({ ...options, out: path.join(options.root, 'assets/output') }), /separate from assets/);
  await fs.mkdir(options.out);
  await fs.writeFile(path.join(options.out, 'keep.txt'), 'keep');
  await assert.rejects(buildStatic(options), /Refusing to overwrite/);
  assert.equal(await fs.readFile(path.join(options.out, 'keep.txt'), 'utf8'), 'keep');
  await fs.writeFile(path.join(options.source, 'catalog/media.json'), '[{"file":"../private.txt"}]');
  await assert.rejects(buildStatic({ ...options, out: path.join(options.directory, 'new-output') }), /Unsafe catalog path/);
});
