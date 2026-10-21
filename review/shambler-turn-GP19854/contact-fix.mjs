import fs from 'node:fs';const path='index.html',old=fs.readFileSync(path,'utf8'),eol=old.includes('\r\n')?'\r\n':'\n';let s=old;
const a='              if (sd > 1e-4) { z.mesh.position.x = tp.x + sx / sd * Math.max(ring, Math.min(sd, ring + 0.05)); z.mesh.position.z = tp.z + sz / sd * Math.max(ring, Math.min(sd, ring + 0.05)); }';
const b=a+eol+[
'              if (hasShamblerSteering(z)) {   // GP-19854: the turning arc must keep clear of solid cover after the ring correction',
'                const p = resolveHardBuildCollisions(z.mesh.position.x, z.mesh.position.z, z.radius, false, z.mesh.position.y, z.climber ? (z.climbHeight || CLIMB_HEIGHT) : null);',
'                const q = resolveStaticProps(p.x, p.z, z.radius, z.mesh.position.y);',
'                z.mesh.position.x = q.x; z.mesh.position.z = q.z;',
'              }'].join(eol);
if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error('Missing unique final ring line');s=s.replace(a,b);
const imp="import { steerShambler, shamblerCanReach } from './game/shambler-steering.js';";
if(!s.includes(imp))throw Error('Missing import');s=s.replace(imp,"import { steerShambler, shamblerCanReach, hasShamblerSteering } from './game/shambler-steering.js';");
if(fs.readFileSync(path,'utf8')!==old)throw Error('Concurrent edit; merge first');fs.writeFileSync(path,s,'utf8');
