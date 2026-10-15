import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from './camera.mjs';
const dir='review/range-GP19901',E=new Engine({training:true,warm:'none',size:'1400x900'}),proof={};
try{
 await E.open();
 await E.ev(`R.release();T.trainingDbg.panel().close();T.AudioSys.setMuted(true);T.player.position.set(0,-200,-650.45);T.setVelDbg(0,0);await wait(600);`);
 await E.shoot({live:true,ui:true,out:dir+'/station-after.png',settle:450});
 proof.rear=await E.ev(`const g=T.trainingDbg.tg().group.getObjectByName('training-range-console');return g.children.filter(x=>x.isMesh).flatMap(x=>Array.isArray(x.material)?x.material:[x.material]).map(m=>m.opacity);`);assert(proof.rear.every(a=>a<.1));
 await E.shoot({cam:{x:3,y:-196,z:-645,tx:0,ty:-198.6,tz:-651.82,fov:35},ui:true,out:dir+'/console-prop.png',settle:650});
 proof.front=await E.ev(`const g=T.trainingDbg.tg().group.getObjectByName('training-range-console');return g.children.filter(x=>x.isMesh).flatMap(x=>Array.isArray(x.material)?x.material:[x.material]).map(m=>m.opacity);`);assert(proof.front.every(a=>a>.99));
 if(!process.argv.includes('--prop-only')){
 await E.ev(`T.rangeDbg.open();`);await E.shoot({live:true,ui:true,out:dir+'/console-final.png'});
 proof.inventory=await E.ev(`T.rangeDbg.exit();R.release();T.grantAllWeapons();T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));if(T.isUnarmed())T.toggleHolster();T.setDualOwnedDbg('pistol');await wait(650);T.toggleDualWieldDbg();T.setMagazinesDbg('pistol',4,[3,2],5);const before=T.magazinesDbg('pistol'),owned=JSON.stringify(T.getWeaponOwned());T.player.position.set(0,-200,-640.61);T.setVelDbg(0,0);const d=(await import('/ui/range-drills.js')).findDrill('pistol','pop-patrol');const r=T.rangeDbg.start(d),single=!T.vaultDbg.flags().dualActive;T.rangeDbg.exit();return {r,single,before,after:T.magazinesDbg('pistol'),dual:T.vaultDbg.flags().dualActive,sameUnlocks:owned===JSON.stringify(T.getWeaponOwned())};`);
 assert(proof.inventory.r.ok);assert(proof.inventory.single);assert(proof.inventory.dual);assert(proof.inventory.sameUnlocks);assert.deepEqual(proof.inventory.after,proof.inventory.before);
 proof.scene=await E.ev(`T.rangeDbg.open();T.trainingDbg.leave();const out={roots:document.querySelectorAll('#rangeConsole').length,feature:T.rangeDbg.feature()};T.trainingDbg.enter();await wait(500);return {out,in:{roots:document.querySelectorAll('#rangeConsole').length,huds:document.querySelectorAll('#rangeDrillHud').length,targets:T.trainingDbg.tg().targets.length}};`);assert.equal(proof.scene.out.roots,0);assert.equal(proof.scene.out.feature,null);assert.equal(proof.scene.in.roots,1);assert.equal(proof.scene.in.huds,1);assert.equal(proof.scene.in.targets,5);
 }
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);console.log('PASS console front/rear cutaway'+(proof.inventory?', partial magazines/akimbo/unlock restoration and leave/reenter listener/target cleanup':''));
}finally{fs.writeFileSync(dir+(process.argv.includes('--prop-only')?'/prop-proof.json':'/capture-proof.json'),JSON.stringify({...proof,errors:E.page?.errors},null,2));await E.close();}process.exit(0);
