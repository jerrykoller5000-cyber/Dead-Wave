import fs from 'node:fs';import * as T from '../../tools/tests/fakethree.mjs';import {buildTrainingGround,scoreZone} from '../../world/training.js';import {traceTraining} from '../../world/training-ballistics.js';
const tg=buildTrainingGround(T),t=tg.targets[2],O=tg.origin;
const from={x:t.x,y:O.y+1.05,z:O.z-2},to=(u,v)=>({x:t.x+(128-u)/256*1.28,y:O.y+2.9-v/448*2.24,z:O.z+t.z});
const rows=[];for(const [u,v]of[[128,89.9],[128,285.9],[128,50.1],[154-.1,260],[128,121.9]]){const point=to(u,v),hit=traceTraining(tg,from,point);rows.push({u,v,expected:scoreZone(u,v),actual:hit?.solid.target===2?tg.scoreHit(2,hit.point):null,point:hit?.point});}
fs.writeFileSync('review/range-accuracy-GP19910/edge-baseline.json',JSON.stringify(rows,null,2));for(const r of rows)console.log(JSON.stringify(r));
