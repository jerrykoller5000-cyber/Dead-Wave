import fs from 'node:fs';
const p='review/range-misses-GP19911/drill-probe.mjs',s=fs.readFileSync(p,'utf8');
const a="while(T.rangeDbg.read().state==='COUNTDOWN'||T.rangeDbg.read().state==='PREPARING'||t.state==='rising')__step(1);";
if(!s.includes(a))throw Error('anchor');
fs.writeFileSync(p,s.replace(a,"for(let waitFrames=0;waitFrames<650&&(T.rangeDbg.read().state==='COUNTDOWN'||T.rangeDbg.read().state==='PREPARING'||t.state==='rising');waitFrames++)__step(1);"));
