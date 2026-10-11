import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'1440x900'}),proof={};
try {
  await E.open();
  const ghost=await E.ev(`R.release();T.runDevCommand('bigtex shooter');T.setPlaceMode(null);T.player.position.set(-24,-200,-640);await wait(200);window.mg=T.spawnBuild('m240',-24,-638);mg.mesh.rotation.y=0;T.setAimTargetDbg(-21,-637);T.setPlaceMode('m240');T.updateGhostPreview();await wait(100);return T.watchmanDbg().ghost.position.toArray();`);
  await E.run({cmd:'shot',target:'xyz:'+ghost.join(','),yaw:100,pitch:20,lookY:.65,dist:3.6,ui:true,out:'review/watchman-polish/final-ghost-detail.png'});
  proof.contact=await E.ev(`
    R.release();T.setPlaceMode(null);T.mountMortar(mg);await wait(1000);
    window.V=T.player.position.constructor;
    window.contact=()=>{
      const u=T.getMarine().userData,e=mg.mesh.userData.elev,s=T.watchmanDbg().state;T.player.updateMatrixWorld(true);e.updateMatrixWorld(true);
      const f=(side,xyz)=>{const w=u['elbow'+side+'G'].userData.wrist;return w.localToWorld(w.userData.grip.clone().sub(w.position)).distanceTo(e.localToWorld(new V(...xyz)));};
      const soles=[];
      for(const side of ['L','R']){let y=Infinity;u['ankle'+side+'G'].traverse(o=>{const a=o.geometry?.attributes.position;if(a)for(let i=0;i<a.count;i++)y=Math.min(y,new V().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).y);});soles.push(y+200);}
      const d=new V(0,0,1).transformDirection(e.matrixWorld),want=new V(Math.sin(s.yaw)*Math.cos(s.pitch),Math.sin(s.pitch),Math.cos(s.yaw)*Math.cos(s.pitch));
      return {right:f('R',[.025,-.105,-.15]),left:f('L',[-.095,.005,-.02]),soles,directionError:d.distanceTo(want),yaw:s.yaw,pitch:s.pitch};
    };
    const results=[];
    for(const [a,h]of [[0,.84],[1.2,13],[-1.2,-8],[0,.84]]){T.aimPointDbg(mg.x+Math.sin(a)*20,mg.mesh.position.y+h,mg.z+Math.cos(a)*20);await wait(1000);results.push(contact());}
    return results;
  `);
  for(const p of proof.contact){assert(p.right<.035&&p.left<.035);assert(p.directionError<.001);assert(p.soles.every(y=>Math.abs(y)<.025));}
  proof.zoom=await E.ev(`
    const before=T.camera.fov;T.setZoomHeldDbg(true);await wait(700);const during=T.camera.fov;T.setZoomHeldDbg(false);await wait(700);return {before,during,after:T.camera.fov};
  `);assert(proof.zoom.during<proof.zoom.before);assert(Math.abs(proof.zoom.after-proof.zoom.before)<.5);
  proof.perf=await E.ev(`const start=performance.now();let frames=0;await new Promise(resolve=>{const f=()=>{frames++;if(performance.now()-start>=2000)resolve();else requestAnimationFrame(f);};requestAnimationFrame(f);});return {fps:frames*1000/(performance.now()-start)};`);
  await E.run({cmd:'shot',target:'player',yaw:100,pitch:15,dist:3.6,ui:true,out:'review/watchman-polish/after-mounted.png'});
  await E.ev(`T.shoulderMortar();await wait(900);`);
  await E.run({cmd:'shot',target:'player',yaw:115,pitch:10,dist:3.4,ui:true,out:'review/watchman-polish/after-carry.png'});
  proof.renderer=E.renderer;proof.loadSec=E.loadSec;proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
}finally{fs.writeFileSync('review/watchman-polish/comfort-proof.json',JSON.stringify(proof,null,2)+'\n');await E.close();}
console.log(JSON.stringify(proof,null,2));process.exit(0);
