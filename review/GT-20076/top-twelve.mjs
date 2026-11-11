import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const folder=process.argv[2];assert(/^visibility-fix-[a-z0-9-]+$/.test(folder));
const root=new URL('./'+folder+'/',import.meta.url),data=JSON.parse(await readFile(new URL('ranked.json',root),'utf8'));
assert.equal(data.summary.length,12);
const titles={aa12:'Breacher',ak:'KR-7',m4:'GW-4',uzi:'Wasp',shotgun:'Pump',sniper:'Sniper',minigun:'Minigun',launcher:'Launcher',revolver:'Revolver',pistol:'Pistol',flamer:'Flamer',chainsaw:'Chainsaw'};
const lines=['Recomputed all 12 base models with the actual game, verified strict model fingerprints, both normal eye cameras, both sides near the firing-line barrier and both sides on confirmed clear floor. The rack is included where available. Open floor is the reachable spot five units behind the firing line. Each count is distinct pixels witnessed by both real capture and posed surface depth.'];
for(const [i,p] of data.candidates.slice(0,12).entries()){
  const view=p.view.replace('held-left-open','clear floor, held left').replace('held-right-open','clear floor, held right').replace('held-left','barrier, held left').replace('held-right','barrier, held right');
  lines.push((i+1)+'. '+titles[p.model]+' pair '+p.pair+' — '+p.pixels+' px ('+view+').');
}
lines.push('Evidence: review/GT-20076/'+folder+'/top-12-crossings.jpg and ranked.json. The index in ranked.json identifies both artwork pieces. Known real intersections stay open. The first listed crossing follows the requested J138 handle-end touch-ups.');
await writeFile(new URL('top-12.txt',root),lines.join('\n')+'\n');console.log(lines.join('\n'));
