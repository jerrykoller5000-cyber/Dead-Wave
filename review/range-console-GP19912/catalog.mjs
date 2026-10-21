import fs from 'node:fs';
const p='ui/range-drills.js',s=fs.readFileSync(p,'utf8'),anchor='export const RANGE_DRILLS=Object.freeze(rows);';
const extra=`// GP-19912: a gentle entry and real manipulation/transition challenges.
drill('pistol','first-steps','sequence',{layout:'close',waves:5,exposure:6,gap:1,duration:45});
drill('pistol','draw-ready','sequence',{layout:'close',waves:1,exposure:8,duration:12,startHolstered:true,clearBonus:20});
drill('m4','reload-ready','sequence',{layout:'close',waves:1,minHits:2,maxEvents:2,exposure:12,duration:18,initialRounds:0,requireReload:true});
drill('pistol','pistol-rifle','sequence',{waves:6,exposure:6,gap:1,duration:50,weaponCycle:['pistol','m4']});
drill('shotgun','three-gun','sequence',{layout:'close',waves:9,exposure:5,gap:1,duration:65,maxEvents:7,weaponCycle:['pistol','m4','shotgun']});
`;
if(s.split(anchor).length!==2)throw Error('catalog anchor');
let n=s.replace(anchor,extra+anchor).replace("priority:d.mode==='priority'?order[wave%order.length]:null,","priority:d.mode==='priority'?order[wave%order.length]:null,weapon:d.weaponCycle?.[wave%d.weaponCycle.length]||d.weapon,");
if(fs.readFileSync(p,'utf8')!==s)throw Error('catalog changed');fs.mkdirSync('review/range-console-GP19912',{recursive:true});fs.writeFileSync('review/range-console-GP19912/range-drills.before.js',s);fs.writeFileSync(p,n);
