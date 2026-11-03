import fs from 'fs';
const { litKeys, late } = JSON.parse(fs.readFileSync('qa/2026-11-02-GB-253/late-fields.json','utf8'));
const have = new Set([...litKeys, ...late]);
const files = ['index.html', ...fs.readdirSync('game').filter(f=>f.endsWith('.js')).map(f=>'game/'+f), ...fs.readdirSync('combat').filter(f=>f.endsWith('.js')).map(f=>'combat/'+f)];
const all = files.map(f=>fs.readFileSync(f,'utf8')).join('\n');
const reads = new Map();
for (const m of all.matchAll(/\b(z|zom|zm|spawned|zz)\.([A-Za-z_$][\w$]*)\b(?!\s*\()/g)) { const k=m[2]; if (have.has(k)) continue; reads.set(k,(reads.get(k)||0)+1); }
const written = [...reads.keys()].filter(k => new RegExp('\\.'+k.replace(/\$/g,'\\$')+'\\s*(=(?!=)|\\+=|-=|\\|\\|=|\\?\\?=)').test(all));
console.log(written.map(k=>k+':'+reads.get(k)).join(' '));
