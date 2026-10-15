import fs from 'node:fs';
import assert from 'node:assert/strict';
const d='review/unarmed-motion-GP19869';
const before=JSON.parse(fs.readFileSync(`${d}/before-proof.json`)),after=JSON.parse(fs.readFileSync(`${d}/final-proof.json`));
const corr=(a,b)=>{const ma=a.reduce((s,v)=>s+v)/a.length,mb=b.reduce((s,v)=>s+v)/b.length;let c=0,aa=0,bb=0;
 for(let i=0;i<a.length;i++){const x=a[i]-ma,y=b[i]-mb;c+=x*y;aa+=x*x;bb+=y*y;}return c/Math.sqrt(aa*bb);};
const jump=a=>Math.max(...a.slice(1).map((s,i)=>Math.abs(s.hands[0].arm[0]-a[i].hands[0].arm[0])));
const summary={};
for(const n of ['walk','run']){
 const a=after.states[n],b=before.states[n],left=a.map(s=>s.hands[0].arm[0]);
 const armOpp=corr(left,a.map(s=>s.hands[1].arm[0])),legOpp=corr(left,a.map(s=>s.hands[0].thigh));
 const flat=left.slice(1).filter((v,i)=>Math.abs(v-left[i])<1e-4).length;
 const palms=a.flatMap(s=>s.hands.map(h=>h.palm)),minSide=Math.min(...palms.map(p=>Math.abs(p[0]))),rear=Math.min(...palms.map(p=>p[2]));
 assert(armOpp<-.99,`${n}: arms alternate rather than collapsing together`);
 assert(legOpp<-.6,`${n}: arm counters its own leg`);
 assert(flat<3,`${n}: swing does not stick at clamped extrema`);
 assert(minSide>.23,`${n}: hands clear the chest`);
 assert(rear<-.02,`${n}: rear hand passes the hip`);
 assert(jump(a)<.17,`${n}: no abrupt shoulder jumps at 60 Hz`);
 for(let i=0;i<a.length;i++)for(let side=0;side<2;side++){
  assert(Math.abs(a[i].hands[side].thigh-b[i].hands[side].thigh)<1e-6,`${n}: original leg motion preserved`);
  assert.deepEqual(a[i].hands[side].wrist,b[i].hands[side].wrist,`${n}: original palm orientation preserved`);
 }
 summary[n]={armOpposition:armOpp,armLegOpposition:legOpp,flatFrames:flat,minPalmSide:minSide,rearPalm:rear};
}
assert(jump(after.transition)<jump(before.transition)*.4,'walk/run/stop transition jump reduced');
assert.equal(after.errors.length,0,'actual animation capture has no runtime errors');
assert.equal(after.armed.unarmed,false,'weapon draw restores armed state');
summary.transition={before:jump(before.transition),after:jump(after.transition)};
fs.writeFileSync(`${d}/verification.json`,JSON.stringify(summary,null,2)+'\n');
console.log('PASS native walk/run phase, hip passage, torso clearance, swing continuity, transitions, unchanged legs/wrists and armed restoration');
console.log(JSON.stringify(summary));
