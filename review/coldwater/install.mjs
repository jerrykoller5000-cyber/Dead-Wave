import fs from 'node:fs';import crypto from 'node:crypto';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const file='world/history-props.js',old=fs.readFileSync(file,'utf8'),mark=hash(old);
const start=old.indexOf('export function buildRuinedFoundation('),end=old.indexOf('export function buildTraps(',start);
if(start<0||end<0||old.includes("from './coldwater.js'"))throw Error('Unexpected history source');
const replacement=`// Preserve the caller's exact legacy RNG consumption: later history positions/yaws
// depend on this stream. New art gets independent seeded variation.
function coldwaterDice(rnd, kind, w = 6, d = 5, door = true) {
  let seed = 0xC01D; const draw = () => { const v = rnd(); seed = Math.imul(seed ^ Math.floor(v * 4294967296), 16777619) >>> 0; return v; };
  if (kind === 'foundation') {
    for (const [L, gap] of [[w, false], [d, false], [w, door], [d, false]]) {
      const n = Math.max(2, Math.round(L / 0.8));
      for (let k = 0; k < n; k++) { if (gap && Math.abs((k + 0.5) / n - 0.5) < 0.12) continue; draw(); draw(); draw(); }
    }
    for (let k = 0; k < 12; k++) draw();
  } else if (kind === 'church') {
    for (let k = 0; k < 14; k++) { if (draw() < 0.3) draw(); } draw(); draw();
  } else if (kind === 'chimney') { for (let k = 0; k < 12; k++) draw(); }
  else if (kind === 'open') { for (let k = 0; k < 27; k++) draw(); }
  return seed;
}
export function buildRuinedFoundation(T, rnd, { w = 6, d = 5, door = true } = {}) {
  return Coldwater.foundation(T, coldwaterDice(rnd, 'foundation', w, d, door), { w, d, door });
}
export function buildChimney(T, rnd) { return Coldwater.chimney(T, coldwaterDice(rnd, 'chimney')); }
export function buildChurchShell(T, rnd) { return Coldwater.church(T, coldwaterDice(rnd, 'church')); }
export function buildIronBandedGrave(T, rnd) { return Coldwater.grave(T, 0xC01D, false); }
export function buildOpenGrave(T, rnd) { return Coldwater.grave(T, coldwaterDice(rnd, 'open'), true); }

`;
const next="import * as Coldwater from './coldwater.js';\n"+old.slice(0,start)+replacement+old.slice(end);
if(hash(fs.readFileSync(file,'utf8'))!==mark)throw Error('History file changed; re-read/merge');fs.writeFileSync(file,next);
const index='index.html',src=fs.readFileSync(index,'utf8'),stamp=hash(src),needle='obj.rotation.y = yaw; G.add(obj); historyProps.taken.push({ x, z, r });';
if(src.split(needle).length!==2)throw Error('Unexpected placement helper');
const updated=src.replace(needle,'obj.rotation.y = yaw; obj.userData.seatHistoryTerrain?.(sampleHeight); G.add(obj); historyProps.taken.push({ x, z, r });');
if(hash(fs.readFileSync(index,'utf8'))!==stamp)throw Error('Index changed; re-read/merge');fs.writeFileSync(index,updated);
console.log('Installed only Coldwater builder wrappers and optional visual terrain seating call.');
