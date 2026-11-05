const fs=require('fs');const a=fs.readFileSync('index.html','utf8').split('\r\n');const W=6;const m=new Map();
for(let i=0;i+W<=a.length;i++){const w=a.slice(i,i+W).map(s=>s.trim());if(w.some(s=>s.length<12))continue;const k=w.join('\n');(m.get(k)||m.set(k,[]).get(k)).push(i+1);}
let d=0;const out=[];for(const [k,v] of m){if(v.length>1){d++;if(out.length<6)out.push(v.join(','));}}
console.log('duplicate 6-line blocks:',d,out.join(' | '));
const b=fs.readFileSync('review/GB-277/index.before.html','utf8').split('\r\n');const m2=new Map();
for(let i=0;i+W<=b.length;i++){const w=b.slice(i,i+W).map(s=>s.trim());if(w.some(s=>s.length<12))continue;const k=w.join('\n');(m2.get(k)||m2.set(k,[]).get(k)).push(i+1);}
let d2=0;for(const [k,v] of m2)if(v.length>1)d2++;console.log('before:',d2);