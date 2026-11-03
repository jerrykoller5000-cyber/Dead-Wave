import fs from 'fs'; import path from 'path';
const files = ['index.html', ...fs.readdirSync('game').filter(f=>f.endsWith('.js')).map(f=>'game/'+f), ...fs.readdirSync('combat').filter(f=>f.endsWith('.js')).map(f=>'combat/'+f)];
const probe = JSON.parse(fs.readFileSync('qa/2026-11-02-GB-253/before-keys.json','utf8').replace(/^\uFEFF/,'')).keys.map(k=>k.split(':')[0]);
const have = new Set(probe);
const re = /\b(z|zm|zom|zombie)\.([A-Za-z_$][\w$]*)\s*(=(?!=)|\+=|-=|\*=|\|\|=|\?\?=|&&=|\+\+|--)/g;
const extra = new Map();
for (const f of files) { const t = fs.readFileSync(f,'utf8').split('\n'); t.forEach((l,i)=>{ for (const m of l.matchAll(re)) { const k=m[2]; if (have.has(k)) continue; if(!extra.has(k)) extra.set(k,[]); extra.get(k).push(f.replace('game/','g/').replace('combat/','c/')+':'+(i+1)); } }); }
console.log([...extra].map(([k,v])=>k+' '+v.slice(0,3).join(',')+(v.length>3?' +'+(v.length-3):'')).join('\n')); console.log('extra', extra.size);
