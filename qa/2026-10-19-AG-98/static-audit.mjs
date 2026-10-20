// qa/2026-10-19-AG-98/static-audit.mjs
// Static check of dist/dead-wave (no browser) to see if any import, fetch, audio clip, or asset path is missing from the staged package.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'dist', 'dead-wave');

const topDirs = fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
console.log('Top dirs in repo:', topDirs);

const codeFiles = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(html|js|mjs|css)$/i.test(e.name)) codeFiles.push(p);
  }
}
walk(OUT);
console.log('Code files in dist/dead-wave:', codeFiles.length);

const missingImports = [];
const missingAssets = [];
const wavRefs = [];

for (const file of codeFiles) {
  const src = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  const relFile = path.relative(OUT, file).replace(/\\/g, '/');

  // Check ES module static and dynamic imports
  const importRe = /(?:import\s+(?:[\s\S]*?\s+from\s+)?|export\s+[\s\S]*?\s+from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(importRe)) {
    const spec = m[1];
    if (spec.startsWith('.') || spec.startsWith('/')) {
      const target = spec.startsWith('/') ? path.join(OUT, spec.slice(1)) : path.resolve(dir, spec);
      const cleanTarget = target.split('?')[0].split('#')[0];
      if (!fs.existsSync(cleanTarget)) {
        missingImports.push({ from: relFile, spec, resolved: path.relative(OUT, cleanTarget).replace(/\\/g, '/') });
      }
    }
  }

  // Check asset string literals
  const assetRe = /['"`]((?:assets|z-sounds|vendor|ui|studio|world|game|core|combat|life)\/[a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)['"`]/g;
  for (const m of src.matchAll(assetRe)) {
    const ref = m[1];
    const target = path.join(OUT, ref);
    if (!fs.existsSync(target)) {
      missingAssets.push({ from: relFile, ref, existsInRepo: fs.existsSync(path.join(ROOT, ref)) });
    }
  }

  // Also check any .wav or .mp3 or .ogg or .mp4 or .webm string literals anywhere
  const mediaRe = /['"`]([^'"`\s]+\.(?:wav|mp3|ogg|mp4|webm|png|jpg|jpeg|webp|glb|wasm))['"`]/gi;
  for (const m of src.matchAll(mediaRe)) {
    const ref = m[1];
    if (ref.includes('${')) continue;
    wavRefs.push({ from: relFile, ref });
  }
}

// Check core/audio.js clip table and music tracks specifically
const audioSrc = fs.readFileSync(path.join(OUT, 'core', 'audio.js'), 'utf8');
const clipRoot = (audioSrc.match(/CLIP_ROOT\s*=\s*'([^']*)'/) || [])[1] || 'assets/sfx/';
const missingAudioClips = [];
for (const m of audioSrc.matchAll(/file:\s*'([^']+)'/g)) {
  const f = m[1].startsWith('assets/') ? m[1] : clipRoot + m[1];
  if (!fs.existsSync(path.join(OUT, f))) {
    missingAudioClips.push({ from: 'core/audio.js', file: f, existsInRepo: fs.existsSync(path.join(ROOT, f)) });
  }
}
for (const m of audioSrc.matchAll(/['"](assets\/[^'"]+\.(?:mp3|ogg|wav))['"]/g)) {
  const f = m[1];
  if (!fs.existsSync(path.join(OUT, f))) {
    missingAudioClips.push({ from: 'core/audio.js (direct)', file: f, existsInRepo: fs.existsSync(path.join(ROOT, f)) });
  }
}

console.log('Missing imports:', JSON.stringify(missingImports, null, 2));
console.log('Missing asset literals:', JSON.stringify(missingAssets, null, 2));
console.log('Missing audio clips:', JSON.stringify(missingAudioClips, null, 2));
