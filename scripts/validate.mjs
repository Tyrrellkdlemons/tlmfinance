#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const must = (cond, msg) => {
  if (cond) console.log('OK  ' + msg);
  else { console.error('FAIL ' + msg); failed++; }
};

const files = [
  'index.html', 'media.html', 'manifest.json', 'service-worker.js',
  'src/styles/globals.css', 'src/styles/print.css',
  'src/app.js', 'src/utils/storage.js', 'src/utils/budgetCalculator.js', 'src/utils/exportPlan.js',
  'src/data/resources.json', 'src/data/people.json', 'src/data/tlmStats.json', 'src/data/media.json',
  'docs/research/SOURCE_MAP.json'
];
for (const f of files) must(fs.existsSync(path.join(root, f)), 'exists ' + f);

const jsonFiles = [
  'manifest.json', 'src/data/resources.json', 'src/data/people.json',
  'src/data/tlmStats.json', 'src/data/media.json', 'docs/research/SOURCE_MAP.json'
];
for (const f of jsonFiles) {
  try { JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); must(true, 'json ' + f); }
  catch (e) { must(false, 'json parse failed ' + f + ': ' + e.message); }
}

const map = JSON.parse(fs.readFileSync(path.join(root, 'docs/research/SOURCE_MAP.json'), 'utf8'));
must(Array.isArray(map.sources) && map.sources.length > 10, 'source map entries: ' + (map.sources && map.sources.length));
for (const s of map.sources) must(typeof s.url === 'string' && /^https?:\/\//.test(s.url), 'url ok ' + s.id);

const resources = JSON.parse(fs.readFileSync(path.join(root, 'src/data/resources.json'), 'utf8'));
must(resources.length >= 20, 'resources count: ' + resources.length);
for (const r of resources) must(r.title && r.url && r.lastChecked, 'resource fields ' + (r.title || '?'));

const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
must(sw.includes('SHELL'), 'service worker has shell array');
must(sw.includes('caches.open'), 'service worker uses Cache API');

console.log('---');
console.log(failed === 0 ? 'All checks passed.' : (failed + ' check(s) failed.'));
process.exit(failed === 0 ? 0 : 1);
