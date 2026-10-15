import fs from 'node:fs';const p='review/dive-clearance-GP19918/extra.mjs',src=fs.readFileSync(p,'utf8');let s=src;
const a="const g=await E.ev(`__aimFollow={yaw:${yaw},pitch:${pitch}};__step(9);return grips(${dual});`);run.samples.push(g);";
const b="let g=await E.ev(`__aimFollow={yaw:${yaw},pitch:${pitch}};__step(9);return grips(${dual});`);const early=g;if(w==='pistol'&&!dual&&!g.sideHold&&g.l>=.03){assert(g.r<.016);g=await E.ev(`__step(9);return grips(${dual});`);assert(g.l<early.l*.65,'support arm closes its return gap');g.returnFrom=early;}run.samples.push(g);";
if(!s.includes(a))throw Error('missing');s=s.replace(a,b);if(fs.readFileSync(p,'utf8')!==src)throw Error('changed');fs.writeFileSync(p,s);console.log('Measure support-arm return motion and require settled cup contact');
