import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Engine } from '../../tools/camera.mjs';

const before = process.argv.includes('--before');
const phase = before ? 'before' : 'after';
const E = new Engine({ training: true, warm: 'none', size: '1440x900' });
try {
  await E.open();
  const menuCode = `
    R.release();
    const wasLocked = !T.getBuildUnlocked().m240;
    T.runDevCommand('bigtex shooter');
    document.body.dispatchEvent(new KeyboardEvent('keydown', {code:'KeyB',key:'b',bubbles:true}));
    document.body.dispatchEvent(new KeyboardEvent('keydown', {code:'Digit3',key:'3',bubbles:true}));
    const angle = 4 * Math.PI * 2 / 5;
    window.dispatchEvent(new PointerEvent('pointermove', {clientX:innerWidth/2+Math.sin(angle)*136,clientY:innerHeight/2-Math.cos(angle)*136,bubbles:true}));
    await wait(350);
    const icon = document.querySelector('#wheelSvg .wIcon[data-i="4"]');
    return {wasLocked,unlocked:T.getBuildUnlocked().m240,wheel:T.getWheelState(),name:document.getElementById('wheelHubName').textContent,iconChildren:icon?.children.length,iconBox:icon?{width:icon.getBBox().width,height:icon.getBBox().height}:null};
  `;
  const menu = await E.ev(menuCode);
  assert.equal(menu.unlocked, true);
  assert.deepEqual(menu.wheel.keys, ['light','flame','heavy','mortar','m240']);
  assert.equal(menu.name, 'Watchman MG');
  assert.equal(menu.iconChildren > 0, !before);
  await E.run({cmd:'shot',live:true,ui:true,out:`review/watchman-menu/${phase}-wheel.png`});
  const proof = {phase,menu,renderer:E.renderer,loadSec:E.loadSec};
  if (!before) {
    assert(menu.iconBox.width > 15 && menu.iconBox.height > 15);
    proof.trainingRestriction = await E.ev(`
      document.body.dispatchEvent(new KeyboardEvent('keyup', {code:'KeyB',key:'b',bubbles:true}));
      T.updateGhostPreview();
      return T.getPlaceHint();
    `);
    // The existing Training Ground forbids every build. Verify real placement in a match.
    E.opt.training = false;
    E.opt.match = true;
    await E.load();
    proof.matchMenu = await E.ev(menuCode);
    proof.placement = await E.ev(`
      document.body.dispatchEvent(new KeyboardEvent('keyup', {code:'KeyB',key:'b',bubbles:true}));
      const selected=T.lockdownState().placeMode;
      const px=T.player.position.x,pz=T.player.position.z;
      let spot=null;
      const refusals={};
      for(let dx=-30;dx<=30&&!spot;dx++)for(let dz=-30;dz<=30&&!spot;dz++){
        const gx=T.gridIndex(px)+dx,gz=T.gridIndex(pz)+dz;
        const x=T.gridCentre(gx),z=T.gridCentre(gz),d=Math.hypot(x-px,z-pz);
        const why=T.placeRefusalFor('m240',gx,gz);
        if(why)refusals[why]=(refusals[why]||0)+1;
        if(d>2&&!why)spot={x,z};
      }
      if(!spot)return {selected,placed:false,error:'no clear nearby cell',refusals,player:T.player.position.toArray(),training:T.trainingDbg.state().active};
      T.player.position.set(spot.x,T.sampleHeight(spot.x,spot.z-3),spot.z-3);
      T.setAimTargetDbg(spot.x,spot.z);
      T.updateGhostPreview();
      const hint=T.getPlaceHint(), point=T.getPlacePoint();
      const count=T.builds.length;
      T.tryPlace();
      const gun=T.builds.slice(count).find(b=>b.type==='m240');
      if(!gun)return {selected,hint,point,placed:false};
      T.setPlaceMode(null);
      T.player.position.set(gun.x+1.2,T.sampleHeight(gun.x+1.2,gun.z),gun.z);
      const mounted=T.mountMortar(gun), beltBefore=gun.belt;
      T.fireMortar();
      const beltAfter=gun.belt;
      T.dismountMortar();
      return {selected,hint,point:{x:point.x,z:point.z},placed:true,meshChildren:gun.mesh.children.length,beltMax:gun.beltMax,mounted,beltBefore,beltAfter};
    `);
    console.log('Placement:', JSON.stringify(proof.placement));
    fs.writeFileSync('review/watchman-menu/after-proof.json', JSON.stringify({...proof,errors:E.page.errors},null,2)+'\n');
    assert.equal(proof.placement.selected, 'm240');
    assert.equal(proof.placement.placed, true);
    assert(proof.placement.meshChildren > 0);
    assert.equal(proof.placement.beltMax, 1000);
    assert.equal(proof.placement.mounted, true);
    assert.equal(proof.placement.beltBefore, 500);
    assert.equal(proof.placement.beltAfter, 499);
    await E.run({cmd:'shot',live:true,ui:true,out:'review/watchman-menu/after-placed.png'});
  }
  proof.errors = E.page.errors;
  fs.writeFileSync(`review/watchman-menu/${phase}-proof.json`, JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify(proof,null,2));
} finally { await E.close(); }
process.exit(0);
