// Scoped source move: base walk pose first, nonlethal hit overlay second.
// Read the freshest file and abort if it changes before the write.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const file=path.join(root,'index.html');
const beforeStat=fs.statSync(file);
const raw=fs.readFileSync(file);
if(raw[0]===0xef&&raw[1]===0xbb&&raw[2]===0xbf)throw Error('index.html has a BOM');
const source=raw.toString('utf8');
const gaitMarker='        if (false) {} else if (ud.torso && rest && z.attackWindup <= 0 && !(z.swingT > 0) && !(z.slamWind > 0)) {';
const afterMarker='        // Clawing up out of the ground: arms reach for the sky, head back, until the';
const gaitStart=source.indexOf(gaitMarker);
const after=source.indexOf(afterMarker,gaitStart);
const hitMarker='        if (z.hitReact > 0) {';
const hitStart=source.lastIndexOf(hitMarker,gaitStart);
if(hitStart<0||gaitStart<0||after<0||hitStart>=gaitStart||gaitStart>=after)throw Error('zombie hit/gait markers changed');
const hit=source.slice(hitStart,gaitStart),gait=source.slice(gaitStart,after);
if(!hit.includes('z.hitPartT = Math.max')||!gait.includes('gaitLean'))throw Error('unexpected source block');
const result=source.slice(0,hitStart)+gait+hit+source.slice(after);
const nowStat=fs.statSync(file);
if(nowStat.size!==beforeStat.size||nowStat.mtimeMs!==beforeStat.mtimeMs||!fs.readFileSync(file).equals(raw))throw Error('index.html changed beneath this edit');
fs.writeFileSync(file,result,'utf8');
const hash=(b)=>crypto.createHash('sha256').update(b).digest('hex');
console.log(`Moved hit overlay after gait baseline; sha256 ${hash(raw).slice(0,12)} -> ${hash(Buffer.from(result)).slice(0,12)}; bytes ${raw.length} -> ${Buffer.byteLength(result)}`);
