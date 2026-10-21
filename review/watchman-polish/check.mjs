import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Engine } from '../../tools/camera.mjs';
const before = process.argv.includes('--before'), phase = before ? 'before' : 'after';
const E = new Engine({training:true,warm:'none',size:'1440x900'});
const proof = {phase};
try {
  await E.open();
  proof.setup = await E.ev(`
    R.release(); T.runDevCommand('bigtex shooter'); T.setPlaceMode(null);
    T.player.position.set(-24,-200,-640); await wait(400);
    window.mg=T.spawnBuild('m240',-24,-638); mg.mesh.rotation.y=0;
    T.setAimTargetDbg(-24,-620); T.setPlaceMode('m240');
    return {position:T.player.position.toArray(),gunChildren:mg.mesh.children.length};
  `);
  await E.run({cmd:'shot',target:'player',yaw:140,pitch:20,dist:4.5,ui:true,out:`review/watchman-polish/${phase}-ghost.png`});
  proof.mount = await E.ev(`
    T.setPlaceMode(null); T.player.position.set(-24,-200,-640); await wait(100);
    const mounted=T.mountMortar(mg); await wait(800);
    return {mounted,position:T.player.position.toArray(),prompt:document.getElementById('kioskPrompt').textContent,hud:T.m240Dbg()};
  `);
  assert(proof.mount.mounted);
  await E.run({cmd:'shot',target:'player',yaw:100,pitch:15,dist:3.6,ui:true,out:`review/watchman-polish/${phase}-mounted.png`});
  proof.fire = await E.ev(`
    const canvas=T.renderer.domElement;
    const start=mg.belt;
    canvas.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true}));
    await wait(1100);
    document.body.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));
    const end=mg.belt;
    await wait(300);
    return {start,end,spent:start-end,afterRelease:mg.belt};
  `);
  if(!before){assert(proof.fire.spent>=8);assert.equal(proof.fire.afterRelease,proof.fire.end);assert(!/mortar/i.test(proof.mount.prompt));}
  proof.carry = await E.ev(`
    T.shoulderMortar(); await wait(900);
    return {state:T.getMortarCarried(),visible:T.m240VisDbg().carried,mortar:T.m240VisDbg().carriedMortar};
  `);
  assert(proof.carry.visible&&!proof.carry.mortar);
  await E.run({cmd:'shot',target:'player',yaw:115,pitch:10,dist:3.4,ui:true,out:`review/watchman-polish/${phase}-carry.png`});
  proof.errors=E.page.errors;
  proof.renderer=E.renderer;
  fs.writeFileSync(`review/watchman-polish/${phase}-proof.json`,JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify(proof,null,2));
} finally {await E.close();}
process.exit(0);
