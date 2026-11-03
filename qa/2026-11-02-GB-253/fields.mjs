import fs from 'fs';
const src = fs.readFileSync('index.html','utf8');
const lines = src.split('\n');
// literal keys 42570-42608
const lit = new Set();
for (let i=42569;i<42608;i++){ for (const m of lines[i].matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) lit.add(m[1]); for (const m of lines[i].matchAll(/^\s*([A-Za-z_$][\w$]*(?:\s*,\s*[A-Za-z_$][\w$]*)*)\s*,?\s*$/g)) m[1].split(/\s*,\s*/).forEach(k=>lit.add(k)); }
['mesh','x','z','typeKey'].forEach(k=>lit.add(k));
const vars = ['z','zom','zb','zz','target','victim','other','o','g'];
const assigned = new Map();
const re = /\b(z|zom)\.([A-Za-z_$][\w$]*)\s*(=(?!=)|\+=|-=|\*=|\|\|=|\?\?=|&&=|\+\+|--)/g;
lines.forEach((l,i)=>{ for (const m of l.matchAll(re)) { const k=m[2]; if (lit.has(k)) continue; if(!assigned.has(k)) assigned.set(k,[]); assigned.get(k).push(i+1);} });
const out=[...assigned.entries()].sort((a,b)=>a[1][0]-b[1][0]).map(([k,v])=>k+' '+v.length+' '+v.slice(0,6).join(','));
console.log('literal keys', lit.size); console.log(out.join('\n')); console.log('count', assigned.size);
