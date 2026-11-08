import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const markerName = '.pac-static-build.json';
const textExtensions = new Set(['.html', '.js', '.css', '.json', '.svg']);
const catalogFiles = ['overview.json', ...['machines', 'price_lines', 'narratives', 'media', 'commercial_terms', 'spare_parts', 'options'].map(name => `catalog/${name}.json`)];
const manifestFields = ['run_id', 'status', 'signed_off', 'catalog_sha256'];
const serverOnlySources = new Set(['src/catalog-admin.js']);
const pitchRuntimeFiles = new Set(['pitch/index.html', 'pitch/pitch.js', 'pitch/runtime-config.js', 'pitch/pitch.css', 'pitch/refinement.css', 'pitch/content.json']);
const serviceRequiredFor = ['shared workspace persistence', 'account permissions', 'customer review links and feedback', 'catalog administration', 'website inquiry submission'];
const staticNotice = '<aside aria-label="Static preview notice" data-static-preview style="padding:10px 20px;background:#fff6cf;color:#34332d;border-bottom:1px solid #e7dca5;font:13px/1.5 system-ui,sans-serif">Static preview. Product browsing and local sample quotes are available. Shared customer review, account permissions, catalog administration and inquiry submission require the local service.</aside>';
export const storageFamilies = Object.freeze([
  'annora.walkthrough.', 'annora.product-room.', 'annora.studio.',
  'annora.seller.work.', 'annora.question.selection.buyer.',
  'annora.exploration-handoff.', 'annora.evidence.', 'annora.onboarding.',
  'annora.drawing-preview.', 'annora.integration-example.', 'annora.prepared-product.',
  'annora.follow-up.demo.', 'annora.options.demo.', 'annora.impact.demo.',
  'annora-explorer:', 'pac.rollbag.', 'pac.website.', 'pac.customer.',
]);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep);

export function normalizeBase(value = '/') {
  if (!/^\/(?:[A-Za-z0-9._-]+\/)*$/.test(value) || value.split('/').some(segment => segment === '.' || segment === '..')) {
    throw new Error('Base must be an absolute directory path, for example /pac-machinery-demo/.');
  }
  return value;
}

export function relocateURLs(text, base) {
  if (base === '/') return text;
  // Rewrite only known root URL literals, never external URLs, model IDs or geometry.
  return text
    .replace(/(["'`(])\/(explorer|source|src|assets|website|pitch|api|review\.html)(?=[\/"'`?#)])/g, (_, delimiter, folder) => `${delimiter}${base}${folder}`)
    .replace(/(["'`])\/#(?=(?:workspace|deal|quote|present|demo|reviews|catalog-admin|machines)(?:[\/"'`?#]|$))/g, (_, delimiter) => `${delimiter}${base}#`);
}

export function isolateStorage(text, namespace = 'pac-machinery-demo.') {
  const alternatives = storageFamilies.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  // These literals name local/session storage, IndexedDB databases or their validators.
  // The annora.explorer/0.1-draft message protocol is deliberately not in this list.
  return text.replace(new RegExp('(["\'`])(' + alternatives + ')', 'g'), (_, delimiter, family) => `${delimiter}${namespace}${family}`);
}

async function filesIn(directory) {
  const files = [];
  for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (entry.name.startsWith('.')) continue;
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Build inputs may not contain symlinks: ${file}`);
    if (entry.isDirectory()) files.push(...await filesIn(file));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

async function existing(file) {
  try { return await fs.stat(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function safeRelative(value) {
  return typeof value === 'string' && value !== '' && !value.includes('\\') && !path.posix.isAbsolute(value) && !value.split('/').some(part => part === '..' || part === '.' || !part);
}

async function safeInput(source, relative) {
  if (!safeRelative(relative)) throw new Error(`Unsafe catalog path: ${relative}`);
  const file = path.resolve(source, relative);
  if (!inside(source, await fs.realpath(file))) throw new Error(`Catalog path escapes its source: ${relative}`);
  return file;
}

async function prepareOutput(root, source, out) {
  if (inside(out, root) || inside(source, out) || inside(out, source)) throw new Error('Output cannot replace the project or catalog input.');
  if (out === path.join(root, 'work')) throw new Error('Output must be separate from the work directory itself.');
  for (const name of ['src', 'assets', 'website', 'pitch', 'server', 'work/runtime', 'data', 'scripts', 'tests', 'outputs']) {
    if (inside(path.join(root, name), out)) throw new Error(`Output must be separate from ${name}.`);
  }
  const stat = await existing(out);
  if (stat && !stat.isDirectory()) throw new Error('Output must be a directory.');
  if (stat && (await fs.readdir(out)).length) {
    let marker;
    try { marker = JSON.parse(await fs.readFile(path.join(out, markerName), 'utf8')); } catch { throw new Error('Refusing to overwrite a nonempty directory without this builder’s marker.'); }
    if (marker.builder !== 'pac-static/1' || !Array.isArray(marker.files) || marker.files.some(item => !safeRelative(item.path))) {
      throw new Error('Invalid static-build marker; no files were removed.');
    }
    // Remove only files owned by the prior build, leaving unrelated files untouched.
    for (const item of marker.files) await fs.rm(path.join(out, item.path), { force: true });
    await fs.rm(path.join(out, markerName), { force: true });
    const remaining = await filesIn(out);
    if (remaining.length) throw new Error('Output contains files not owned by the previous build. Choose a fresh output directory.');
  }
  await fs.mkdir(out, { recursive: true });
}

export async function auditStaticSite(out, base) {
  const origin = 'https://static-check.invalid';
  const errors = [], htmlReferences = [], resourceReferences = new Set();
  async function check(value, relative, category) {
    if (!value || value.startsWith('#') || value.includes('${') || /^(?:data|blob|mailto|tel|javascript):/i.test(value)) return;
    const url = new URL(value, origin + base + relative);
    if (url.origin !== origin) return;
    if (!url.pathname.startsWith(base)) { errors.push({ file: relative, value, reason: 'outside deployment base' }); return; }
    let target = path.resolve(out, decodeURIComponent(url.pathname.slice(base.length)));
    if (!inside(out, target)) { errors.push({ file: relative, value, reason: 'outside output' }); return; }
    let stat = await existing(target);
    if (stat?.isDirectory()) { target = path.join(target, 'index.html'); stat = await existing(target); }
    if (!stat?.isFile()) errors.push({ file: relative, value, reason: 'missing target' });
    if (category === 'html') htmlReferences.push({ file: relative, value });
    else resourceReferences.add(url.pathname);
  }
  for (const file of await filesIn(out)) {
    const relative = path.relative(out, file).split(path.sep).join('/');
    const ext = path.extname(file);
    if (!['.html', '.js', '.css'].includes(ext)) continue;
    const text = await fs.readFile(file, 'utf8');
    if (base !== '/' && /["'`(]\/(?:explorer|source|src|assets|website|pitch|api|review\.html)(?=[\/"'`?#)])/.test(text)) errors.push({ file: relative, reason: 'unprefixed runtime URL' });
    if (base !== '/' && /["'`]\/#(?:workspace|deal|quote|present|demo|reviews|catalog-admin|machines)(?:[\/"'`?#]|$)/.test(text)) errors.push({ file: relative, reason: 'unprefixed application entry' });
    if (ext === '.html') {
      for (const match of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) await check(match[1], relative, 'html');
    } else {
      for (const match of text.matchAll(/["'(](\/[^"'()\s<>]+)["')]/g)) {
        if (!match[1].startsWith(base) || !/\.[A-Za-z0-9]{1,8}(?:[?#]|$)/.test(match[1])) continue;
        await check(match[1], relative, 'resource');
      }
      for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.{1,2}\/[^"']+)["']/g)) await check(match[1], relative, 'resource');
      if (ext === '.css') for (const match of text.matchAll(/url\(\s*["']?([^"'()\s]+)["']?\s*\)/g)) await check(match[1], relative, 'resource');
    }
  }
  if (errors.length) throw new Error(`Static resource audit failed: ${JSON.stringify(errors.slice(0, 30), null, 2)}`);
  return { htmlReferences: htmlReferences.length, distinctResourcePaths: resourceReferences.size, errors };
}

export async function buildStatic({ root = projectRoot, source = process.env.ROLLBAG_SOURCE || path.join(root, 'data/catalog'), out = path.join(root, 'dist'), base = '/' } = {}) {
  base = normalizeBase(base);
  root = await fs.realpath(path.resolve(root));
  source = await fs.realpath(path.resolve(source));
  out = path.resolve(out);
  const originalManifest = JSON.parse(await fs.readFile(await safeInput(source, 'manifest.json'), 'utf8'));
  if (originalManifest.status !== 'passed' || originalManifest.signed_off !== true) throw new Error('A signed-off, passed catalog is required.');
  for (const field of manifestFields) if (!Object.hasOwn(originalManifest, field)) throw new Error(`Missing catalog identity field: ${field}`);
  const media = JSON.parse(await fs.readFile(await safeInput(source, 'catalog/media.json'), 'utf8'));
  const mediaFiles = [...new Set(media.flatMap(row => [row.file, row.converted_file]).filter(Boolean))].sort();
  const catalogInputs = await Promise.all([...catalogFiles, ...mediaFiles].map(async relative => ({ relative, file: await safeInput(source, relative) })));
  await prepareOutput(root, source, out);
  const copied = [], transformed = [], catalogCopies = [];
  const storageNamespace = (base === '/' ? 'pac-machinery-demo' : base.slice(1, -1).replaceAll('/', '.')) + '.';
  const storageIsolatedFiles = [];
  async function write(relative, bytes) {
    const destination = path.join(out, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes);
    copied.push({ path: relative, bytes: Buffer.byteLength(bytes), sha256: digest(bytes) });
  }
  async function copy(file, relative, relocate = true) {
    const bytes = await fs.readFile(file);
    let output = bytes;
    if (relocate && textExtensions.has(path.extname(file))) {
      const text = bytes.toString('utf8'), relocated = relocateURLs(text, base);
      let result = path.extname(file) === '.js' ? isolateStorage(relocated, storageNamespace) : relocated;
      if (relative === 'pitch/runtime-config.js') result += '\nwindow.PAC_PITCH_RUNTIME = Object.freeze({...window.PAC_PITCH_RUNTIME, staticPreview: true});\n';
      if (['index.html', 'website/index.html', 'review.html'].includes(relative)) {
        result = /<body\b[^>]*>/i.test(result) ? result.replace(/<body\b[^>]*>/i, match => match + staticNotice) : staticNotice + result;
      }
      if (result !== relocated) storageIsolatedFiles.push(relative);
      if (text !== result) { output = Buffer.from(result); transformed.push(relative); }
    }
    await write(relative, output);
  }
  await copy(path.join(root, 'index.html'), 'index.html');
  if (await existing(path.join(root, 'NOTICE.txt'))) await copy(path.join(root, 'NOTICE.txt'), 'NOTICE.txt', false);
  if (await existing(path.join(root, 'review.html'))) await copy(path.join(root, 'review.html'), 'review.html');
  for (const file of await filesIn(path.join(root, 'src'))) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (!serverOnlySources.has(relative)) await copy(file, relative);
  }
  if (await existing(path.join(root, 'website'))) for (const file of await filesIn(path.join(root, 'website'))) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (relative !== 'website/build-data.mjs') await copy(file, relative);
  }
  if (await existing(path.join(root, 'pitch'))) for (const file of await filesIn(path.join(root, 'pitch'))) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (pitchRuntimeFiles.has(relative) || relative.startsWith('pitch/assets/') || relative.startsWith('pitch/downloads/')) await copy(file, relative);
  }
  for (const file of await filesIn(path.join(root, 'assets'))) {
    const relative = path.relative(path.join(root, 'assets'), file).split(path.sep).join('/');
    await copy(file, relative.startsWith('explorer/') ? relative : `assets/${relative}`);
  }
  for (const { relative, file } of catalogInputs) {
    const bytes = await fs.readFile(file);
    await write(`source/${relative}`, bytes);
    catalogCopies.push({ path: relative, sha256: digest(bytes) });
  }
  const projectedManifest = Object.fromEntries(manifestFields.map(field => [field, originalManifest[field]]));
  await write('source/manifest.json', JSON.stringify(projectedManifest, null, 2) + '\n');
  await write('.nojekyll', '');
  const audit = await auditStaticSite(out, base);
  const receipt = {
    builder: 'pac-static/1', base, catalogRun: originalManifest.run_id,
    deliveryMode: 'static-preview', serviceRequiredFor,
    catalogManifest: { mode: 'runtime field projection', fields: manifestFields, originalUnmodified: true },
    browserStorage: { namespace: storageNamespace, families: storageFamilies, generatedFiles: storageIsolatedFiles.sort(), protocolUnchanged: 'annora.explorer/0.1-draft' },
    catalogByteIdenticalCopies: catalogCopies, relocatedTextFiles: transformed.sort(), audit,
    files: copied.sort((a, b) => a.path.localeCompare(b.path, 'en')),
  };
  await fs.writeFile(path.join(out, markerName), JSON.stringify(receipt, null, 2) + '\n');
  return { out, base, files: copied.length + 1, bytes: copied.reduce((sum, item) => sum + item.bytes, 0) + (await fs.stat(path.join(out, markerName))).size, ...audit };
}

async function main() {
  const options = {};
  for (let i = 2; i < process.argv.length; i++) {
    const flag = process.argv[i];
    if (!['--base', '--out', '--source'].includes(flag) || !process.argv[i + 1]) throw new Error('Usage: node scripts/build-static.mjs [--base /repository/] [--out dist] [--source data/catalog]');
    options[flag.slice(2)] = process.argv[++i];
  }
  console.log(JSON.stringify(await buildStatic(options), null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
