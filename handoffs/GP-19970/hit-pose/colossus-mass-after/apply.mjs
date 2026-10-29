// Scoped Colossus hit-pose change; preserve index.html's current UTF-8 bytes and line endings.
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const path='index.html';
const before=fs.readFileSync(path),initial=fs.statSync(path);
if(before[0]===0xef&&before[1]===0xbb&&before[2]===0xbf)throw Error('unexpected UTF-8 BOM');
const source=before.toString('utf8');
const old="else if (ud.torso) { ud.torso.rotation.y += -side * 0.7 * k; ud.torso.rotation.x -= 0.12 * k; ud.torso.rotation.z += side * 0.15 * k; }";
const next="else if (ud.torso) { const twist = kind === 'colossus' ? 0.32 : 0.7; ud.torso.rotation.y += -side * twist * k; ud.torso.rotation.x -= 0.12 * k; ud.torso.rotation.z += side * 0.15 * k; }";
if(source.split(old).length!==2)throw Error('expected one exact zombie hit-pose line in freshest source');
const current=fs.readFileSync(path),stat=fs.statSync(path);
if(stat.mtimeMs!==initial.mtimeMs||!current.equals(before))throw Error('index.html changed underneath this edit; merge onto current file');
fs.writeFileSync(path,source.replace(old,next),'utf8');
const hash=b=>createHash('sha256').update(b).digest('hex').slice(0,12);
console.log(`Colossus body-hit yaw coefficient 0.7 → 0.32; sha256 ${hash(before)} → ${hash(fs.readFileSync(path))}`);
