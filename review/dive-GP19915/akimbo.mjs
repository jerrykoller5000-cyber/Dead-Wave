import fs from 'node:fs';import crypto from 'node:crypto';
const path='index.html',text=fs.readFileSync(path,'utf8'),hash=t=>crypto.createHash('sha256').update(t).digest('hex');
const old='const lx = _hv.d.crossVectors(_AXIS_Y, lf).normalize();',replacement='const lx = _hv.d.crossVectors(diveGunUp(lf,_diveGunUp), lf).normalize();';
if(text.split(old).length!==2)throw Error('unexpected offhand anchor');
if(hash(fs.readFileSync(path,'utf8'))!==hash(text))throw Error('concurrent edit');
fs.writeFileSync(path,text.replace(old,replacement));
