// CU-171: scratch-only edits. Nothing here touches the repo.
import fs from 'node:fs';
import path from 'node:path';
const base = 'C:/Users/Zero/Desktop/dw-cu171';
const rd = (f) => fs.readFileSync(f, 'utf8');
const wr = (f, t) => fs.writeFileSync(f, t, 'utf8');

// (A) the zombies mark split in three, the same edit in both builds.
const reA = /(updateZombies\(dt\);)(\r?\n)(\s*)(enemyAbilities\.update\(dt\);[^\r\n]*)(\r?\n)(\s*)(feralMotion\.update\(dt\);[^\r\n]*)(\r?\n)(\s*)PROF\.mark\('zombies'\);/;
function markA(file) {
  const t = rd(file);
  if (!reA.test(t)) throw new Error('A anchor missing in ' + file);
  wr(file, t.replace(reA, (m, u, e1, i1, ab, e2, i2, fe, e3, i3) =>
    `${u} PROF.mark('z:update');${e1}${i1}${ab} PROF.mark('z:abilities');${e2}${i2}${fe}${e3}${i3}PROF.mark('z:feral');`));
}
markA(`${base}/old/index.html`);
markA(`${base}/new/index.html`);

// variants of the current build
for (const v of ['s', 'c', 'p']) {
  fs.rmSync(`${base}/${v}`, { recursive: true, force: true });
  fs.cpSync(`${base}/new`, `${base}/${v}`, { recursive: true });
}

// (C-i) tickShamblerRecovery forced to return false
{
  const f = `${base}/s/index.html`, t = rd(f);
  const a = "const shamblerRecovering = kind === 'shambler' && tickShamblerRecovery(z, dt);";
  if (!t.includes(a)) throw new Error('shambler anchor');
  wr(f, t.replace(a, "const shamblerRecovering = false; /* CU-171 probe: tickShamblerRecovery forced false */"));
}

// (C-ii) applyScreamerPose with its 82d75118 body: the whole file as it was
fs.copyFileSync(`${base}/old/game/screamer-behavior.js`, `${base}/c/game/screamer-behavior.js`);

// (C-iii) the GP-19979 spider block reverted to 82d75118's text
{
  const lines = (s) => s.split('\n');
  const oldL = lines(rd(`${base}/old/index.html`));
  const f = `${base}/p/index.html`;
  const newL = lines(rd(f));
  const find = (L, re, from = 0) => { for (let i = from; i < L.length; i++) if (re.test(L[i])) return i; return -1; };
  // old block: from the backing-off comment to the line before `if (z.spider) {`
  const o0 = find(oldL, /Backing off too only with a line/);
  const o1 = find(oldL, /^\s*if \(z\.spider\) \{\s*$/, o0);
  // new block
  const n0 = find(newL, /GP-19979: once a blocked hunter wins a firing line/);
  const n1 = find(newL, /^\s*if \(z\.spider\) \{\s*$/, n0);
  const h0 = find(newL, /const hadLine = z\.lineClear;/);
  const h1 = find(newL, /if \(!z\.lineClear\) \{ z\.lineSawBlock = true; z\.lineGo = 1\.2; \}/, h0);
  const h2 = find(newL, /else if \(hadLine === false && z\.lineSawBlock\) z\.lineGo = 1\.2;/, h1);
  if ([o0, o1, n0, n1, h0, h1, h2].some((x) => x < 0) || !(h0 < h1 && h1 < h2 && h2 < n0)) throw new Error('spider anchors ' + [o0, o1, n0, n1, h0, h1, h2]);
  const eol = (s) => (s.endsWith('\r') ? '\r' : '');
  const oldBlock = oldL.slice(o0, o1);
  const out = [
    ...newL.slice(0, h0),
    // hadLine is gone; the old clear/blocked assignment stays as in the new file's lines up to h1
    ...newL.slice(h0 + 1, h1),
    newL[h1].replace('{ z.lineSawBlock = true; z.lineGo = 1.2; }', 'z.lineGo = 1.2;'),
    ...newL.slice(h2 + 1, n0),
    ...oldBlock,
    ...newL.slice(n1),
  ];
  wr(f, out.join('\n'));
}
console.log('built');
