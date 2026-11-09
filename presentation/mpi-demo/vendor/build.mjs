import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const directory = path.dirname(fileURLToPath(import.meta.url));
const index = process.argv.indexOf('--dependencies');
if (index < 0 || !process.argv[index + 1]) throw new Error('Pass --dependencies /path/to/node_modules containing three@0.187.0 and esbuild@0.25.12.');
const dependencies = path.resolve(process.argv[index + 1]);
const three = JSON.parse(fs.readFileSync(path.join(dependencies, 'three/package.json'), 'utf8'));
const esbuild = await import(pathToFileURL(path.join(dependencies, 'esbuild/lib/main.js')).href);
if (three.version !== '0.187.0' || esbuild.version !== '0.25.12') throw new Error('Pinned dependency versions differ.');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'SOURCE-MANIFEST.json'), 'utf8'));
for (const file of manifest.files) {
  const bytes = fs.readFileSync(path.join(directory, file.copiedTo.replace(/^vendor\//, '')));
  if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error('Source snapshot changed: ' + file.copiedTo);
}
await esbuild.build({
  entryPoints: [path.join(directory, 'bundle-entry.js')],
  outfile: path.join(directory, 'mpi35.bundle.js'),
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
  minify: true, legalComments: 'inline', nodePaths: [dependencies],
});
console.log('Built isolated MPI demonstration bundle from pinned source and dependencies.');
