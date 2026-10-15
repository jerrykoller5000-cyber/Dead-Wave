import fs from 'node:fs';
const dir='review/range-console-GP19912';
let p=fs.readFileSync(dir+'/perf.mjs','utf8').replace("proof.performance=await E.ev('return T.perfSnapshot();');", "proof.performance=await E.ev('return T.perfSnapshot();');proof.monitor=await E.ev('return T.rangeDbg.feature().monitorDbg();');");
fs.writeFileSync(dir+'/perf-final.mjs',p);
p=fs.readFileSync(dir+'/screens.mjs','utf8').replace("'./camera.mjs'","'../../tools/camera.mjs'").replace('/screen-proof\'','/final-screen-proof\'').replace('ty:-196.96','ty:-196.6552');
p=p.replace("p.result=await E.ev('return T.rangeDbg.read().result;');", "p.height=await E.ev('return T.trainingDbg.tg().group.getObjectByName(\"range-drill-monitor\").position.y;');assert(Math.abs(p.height-3.3448)<.00001);p.result=await E.ev('return T.rangeDbg.read().result;');");
fs.writeFileSync(dir+'/screens-final.mjs',p);
