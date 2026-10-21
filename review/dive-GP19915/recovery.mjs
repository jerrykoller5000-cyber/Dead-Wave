import fs from 'node:fs';import assert from 'node:assert/strict';
const p='index.html',s=fs.readFileSync(p,'utf8');let n=s;
const replace=(a,b)=>{assert.equal(n.split(a).length,2,a);n=n.replace(a,b);};
replace("import { divePose } from './studio/marine-dive-pose.js';","import { divePose, plantDiveLeg } from './studio/marine-dive-pose.js';");
replace('        followMarineWaist(THREE,ud);\r\n        if(unarmed){',`        followMarineWaist(THREE,ud);
        if(dive.phase==='up'){
          player.updateMatrixWorld(true);
          _diveA.set(Math.sin(aimYaw),0,Math.cos(aimYaw));
          for(const side of [-1,1]){
            const leg=side<0?legL:legR,kn=side<0?kneeL:kneeR,an=side<0?ud.ankleLG:ud.ankleRG;
            _diveF.set(localPlayer.position.x+side*.13*Math.cos(aimYaw),localPlayer.position.y+.104,localPlayer.position.z-side*.13*Math.sin(aimYaw));
            plantDiveLeg(THREE,leg,kn,an,_diveF,_diveA,aimYaw,side>0?dp.plant:diveSmooth((dp.up-.42)/.4));
          }
        }
        if(unarmed){`.replaceAll('\n','\r\n'));
assert.equal(fs.readFileSync(p,'utf8'),s);fs.writeFileSync(p,n);
const f='review/dive-GP19915/native.mjs',a=fs.readFileSync(f,'utf8');fs.writeFileSync(f,a.replace('x:p.x+3,y:p.y+1.9,z:p.z+2','x:p.x+(p.x>2?-3:3),y:p.y+1.9,z:p.z+(p.z>-643?-3:2)'));
