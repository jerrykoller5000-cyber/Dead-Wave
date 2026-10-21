import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const before=process.argv.includes('--before'),dir='review/red-glow-GP196';
const E=new Engine({training:true,warm:'none',size:'1200x850'}),proof={};
try{
 await E.open();
 await E.ev('R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.setHp(10000);T.player.position.set(-26,D.tg().floorY,-651);D.spawn("shambler",1);await wait(8200);D.openPanel();D.panel().element.hidden=true;return true;');
 await E.shoot({target:'player',cam:{x:-10,y:-174,z:-670,tx:-26,ty:-197,tz:-631,fov:52},out:`${dir}/${before?'before':'after'}.png`});
 proof.combat=await E.ev('const s=D.state().danger.state(),root=D.tg().group.getObjectByName("training-danger-lighting");return {state:s,redLights:root.children.filter(n=>n.isLight&&n.color.getHex()===0xff0803).map(n=>({kind:n.type,intensity:n.intensity})),lamp:D.tg().buildLamp.emissiveIntensity,beacon:D.tg().releaseGate.lamp.emissiveIntensity};');
 const {amount,pulse}=proof.combat.state,k=before?1:.25;
 assert.equal(amount,1);assert(Math.abs(proof.combat.state.fill-k*(75+95*pulse))<1e-7);
 assert(Math.abs(proof.combat.lamp-k*(.35+2.8*pulse))<1e-7);
 for(const light of proof.combat.redLights.filter(n=>n.kind==='SpotLight'))assert(Math.abs(light.intensity-k*(250+180*pulse))<1e-7);
 await E.ev('D.panel().close();D.clear();await wait(1200);return true;');
 proof.clear=await E.ev('return D.state().danger.state();');assert.equal(proof.clear.amount,0);
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);console.log(`${before?'BEFORE':'PASS'}: red-light scale${k}; same pulse/rotation; clear restores; no browser errors.`);
}finally{fs.writeFileSync(`${dir}/${before?'before':'proof'}.json`,JSON.stringify(proof,null,2));await E.close();}
process.exit(0);
