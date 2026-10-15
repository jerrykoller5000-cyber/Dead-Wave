// qa/2026-10-15-AG-79/compact-remains.mjs
// Compacts static sub-parts inside each articulated pivot of makeSkeletalMarine() and each floating group of makeBoneRaft()
// using mergeStatic(), addressing Cursor's audit item (2) while preserving all limb/spine/neck/skull/jaw pivots and shared REM materials.
import fs from 'node:fs';
import crypto from 'node:crypto';

const INDEX_PATH = 'index.html';
const rawBefore = fs.readFileSync(INDEX_PATH);
const hashBefore = crypto.createHash('sha256').update(rawBefore).digest('hex');
let src = rawBefore.toString('utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
const norm = (s) => s.replace(/\r?\n/g, eol);

function replaceExact(label, targetRaw, replacementRaw) {
  const target = norm(targetRaw);
  const replacement = norm(replacementRaw);
  const idx = src.indexOf(target);
  if (idx === -1) throw new Error(`Target block not found for: ${label}`);
  if (src.indexOf(target, idx + target.length) !== -1) throw new Error(`Target block not unique for: ${label}`);
  src = src.slice(0, idx) + replacement + src.slice(idx + target.length);
  console.log(`Replaced block: ${label}`);
}

replaceExact(
  'makeSkeletalMarine mergeStatic',
  `      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
      g.userData.parts = limbs;`,
  `      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
      if (skull.userData.jaw) mergeStatic(skull.userData.jaw);
      mergeStatic(skull, skull.userData.jaw ? [skull.userData.jaw] : []);
      mergeStatic(neck, [skull]);
      mergeStatic(limbs.foreL); mergeStatic(limbs.foreR);
      mergeStatic(limbs.armL, [limbs.foreL]); mergeStatic(limbs.armR, [limbs.foreR]);
      mergeStatic(limbs.shinL); mergeStatic(limbs.shinR);
      mergeStatic(limbs.legL, [limbs.shinL]); mergeStatic(limbs.legR, [limbs.shinR]);
      mergeStatic(spine, [neck, limbs.armL, limbs.armR, limbs.legL, limbs.legR]);
      g.userData.parts = limbs;`
);

replaceExact(
  'makeBoneRaft mergeStatic',
  `      g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
      g.userData.bits = bits;`,
  `      g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
      for (const b of bits) if (b.isGroup) mergeStatic(b);
      g.userData.bits = bits;`
);

const rawCurrent = fs.readFileSync(INDEX_PATH);
const hashCurrent = crypto.createHash('sha256').update(rawCurrent).digest('hex');
if (hashCurrent !== hashBefore) {
  throw new Error('index.html changed on disk while preparing edit! Aborting.');
}
const outBuf = Buffer.from(src, 'utf8');
if (outBuf[0] === 0xef && outBuf[1] === 0xbb && outBuf[2] === 0xbf) {
  throw new Error('UTF-8 BOM detected!');
}
fs.writeFileSync(INDEX_PATH, outBuf);
const hashAfter = crypto.createHash('sha256').update(outBuf).digest('hex');
console.log(`Updated index.html (${hashBefore.slice(0, 12)} -> ${hashAfter.slice(0, 12)})`);
