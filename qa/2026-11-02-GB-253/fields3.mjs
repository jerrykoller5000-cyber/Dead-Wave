import fs from 'fs';
const known = new Set(JSON.parse(fs.readFileSync('qa/2026-11-02-GB-253/before-keys.json','utf8').replace(/^\uFEFF/,'')).keys.map(k=>k.split(':')[0]));
const t = fs.readFileSync('index.html','utf8').split('\n');
const re = /\b(g|o|spawned|guard|boss|zz|zb|zed|victim|kid|sleeper|king|ghoul|w|zo|cz|ez|nz|gz|zombieObj|made|zmb)\.([A-Za-z_$][\w$]*)\s*(=(?!=)|\+=|-=|\|\|=|\?\?=)/g;
const ex = new Map();
t.forEach((l,i)=>{ if (!/zombie|spawnZombie|poiGuard|caveIndex|typeKey|\.alive|hordeJoin|z\b/.test(l) && !/^\s/.test('x')) {} for (const m of l.matchAll(re)) { const k=m[2]; if (known.has(k)) continue; const key=m[1]+'.'+k; if(!ex.has(key)) ex.set(key,[]); ex.get(key).push(i+1);} });
console.log([...ex].filter(([k,v])=>v.some(n=>/zombie|spawnZombie|typeKey|poiGuard|alive|hz|caveIndex/.test(t[n-1]+t[n-2]+t[n-3]))).map(([k,v])=>k+' '+v.slice(0,4).join(',')).join('\n'));
