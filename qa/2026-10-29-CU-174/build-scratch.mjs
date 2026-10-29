// CU-174: scratch-only. CU-171's split of the zombies mark at the call site, the same edit in both trees.
import fs from 'node:fs';
const base = 'C:/Users/Zero/Desktop/dw-cu174';
const reA = /(updateZombies\(dt\);)(\r?\n)(\s*)(enemyAbilities\.update\(dt\);)([^\r\n]*)(\r?\n)(\s*)(feralMotion\.update\(dt\);[^\r\n]*)(\r?\n)(\s*)PROF\.mark\('zombies'\);/;
for (const t of ['old', 'new']) {
  const file = `${base}/${t}/index.html`;
  const text = fs.readFileSync(file, 'utf8');
  if (!reA.test(text)) throw new Error('call-site anchor missing in ' + t);
  fs.writeFileSync(file, text.replace(reA, (m, u, e1, i1, ab, abc, e2, i2, fe, e3, i3) =>
    `${u} PROF.mark('z:update');${e1}${i1}${ab} PROF.mark('z:abilities');${abc}${e2}${i2}${fe}${e3}${i3}PROF.mark('z:feral');`), 'utf8');
  const m = [...fs.readFileSync(file, 'utf8').matchAll(/<script type="module">([\s\S]*?)<\/script>/g)][0][1];
  fs.writeFileSync(`${base}/chk-${t}.mjs`, m, 'utf8');
}
console.log('marks inserted');
