import fs from 'node:fs';
import crypto from 'node:crypto';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const files=['game/feral-motion.js','index.html'].map(path=>({path,source:fs.readFileSync(path,'utf8')}));
for(const f of files)f.next=f.source;
function replace(f,a,b){if(f.next.split(a).length!==2)throw Error(`Missing/ambiguous ${f.path} anchor: ${a.slice(0,60)}`);f.next=f.next.replace(a,b);}
const [motion,index]=files,nl=motion.source.includes('\r\n')?'\r\n':'\n',inl=index.source.includes('\r\n')?'\r\n':'\n';
replace(motion,'sway:-Math.sin(phase+.45)*.075*a-lean*.13','sway:-Math.sin(phase+.45)*.11*a-lean*.13');
replace(motion,'hips:Math.sin(phase)*.075*a','hips:Math.sin(phase)*.11*a, bounce:Math.pow(Math.abs(Math.cos(phase)),1.5)*.075*a, weight:-Math.sin(phase)*.055*a');
// Dedicated forearm orientation keeps sculpted palms down without altering the mesh or skin binding.
const code=`
const clawMath=new WeakMap();
function mathFor(T){
  let q=clawMath.get(T);if(!q){q={parent:new T.Quaternion(),world:new T.Quaternion(),yaw:new T.Quaternion(),pitch:new T.Quaternion(),up:new T.Vector3(0,1,0),right:new T.Vector3(1,0,0)};clawMath.set(T,q);}return q;
}
export function resetFeralClaws(z){
  if(z.typeKey!=='feral')return;
  const u=z.mesh.userData;
  for(const arm of [u.armLG,u.armRG]){if(!arm)continue;arm.rotation.y=0;const el=arm.userData.elbowG;if(el){el.rotation.y=0;el.rotation.z=0;}}
  if(u.hips)u.hips.position.x=0;
}
export function applyFeralClaws(T,z,phase,amount){
  if(z.typeKey!=='feral'||!z.alive||z.farLod||z.crawling||z.hopping||z.riseT>0||z.knockT>0||z.windowClimb||z.hitReact>0||z.hitPartT>0)return;
  const u=z.mesh.userData;if(!u.hips||!u.torso)return;
  const q=mathFor(T),a=clamp(amount),wind=z.attackWindup>0,slash=z.swingT>0;
  const windU=wind?clamp(1-z.attackWindup/.22):0,slashU=slash?clamp(1-z.swingT/.28):0;
  for(const side of [-1,1]){
    const arm=side<0?u.armLG:u.armRG,lost=side<0?z.partsLost?.armL:z.partsLost?.armR;
    const el=arm?.userData.elbowG;if(!arm||!el||lost)continue;
    const beat=phase+(side>0?Math.PI:0),lead=side===(z.swingSide||1);
    let x=-.57+Math.sin(beat)*.18*a,spread=.48+Math.sin(beat+.6)*.11*a;
    let fingerYaw=side*(.26+Math.sin(beat*.7)*.08*a),fingerPitch=.07+Math.sin(beat)*.04*a;
    if(wind){x-=windU*.32;spread+=windU*.18;fingerYaw+=side*windU*.16;}
    if(slash){
      // Alternating wide rakes, from outside toward the target, without crossing the chest.
      const rake=Math.sin(Math.PI*clamp(slashU*(lead?1.3:1.05)));
      x=-.89+rake*(lead?.60:.37);spread=.66-rake*.22;
      fingerYaw=side*(.42-rake*.27);fingerPitch=.07+rake*.22;
    }
    arm.rotation.set(x,side*.14,side*spread,'XYZ');
    q.parent.copy(z.mesh.quaternion).multiply(u.hips.quaternion).multiply(u.torso.quaternion).multiply(arm.quaternion);
    q.yaw.setFromAxisAngle(q.up,z.mesh.rotation.y+fingerYaw);
    q.pitch.setFromAxisAngle(q.right,-Math.PI/2+fingerPitch);
    q.world.copy(q.yaw).multiply(q.pitch);
    // Sculpted hand palm is local -Z; -Y points along the fingers. Compensate for
    // the whole shoulder chain so body lean/roll cannot turn the palms upward.
    el.quaternion.copy(q.parent).invert().multiply(q.world);
  }
}
`;
replace(motion,'export function motionIntensity(speed, angular) {',code.replace(/\n/g,nl)+nl+'export function motionIntensity(speed, angular) {');
replace(index,'import { feralPose, createFeralMotion }','import { feralPose, createFeralMotion, resetFeralClaws, applyFeralClaws }');
const udAnchor=index.next.match(/        const amp = \(z\.crawling[^\r\n]*\r?\n        const ud = z.mesh.userData;/)?.[0];
if(!udAnchor)throw Error('Missing main locomotion userData anchor');
replace(index,udAnchor,udAnchor+inl+'        resetFeralClaws(z);   // GP-19850: clear prior forearm twist/weight shift before normal poses');
const old=`            if (ud.armLG && !parts.armL) { ud.armLG.rotation.x += f.armXL; ud.armLG.rotation.z += f.armL; if (ud.armLG.userData.elbowG) ud.armLG.userData.elbowG.rotation.x -= f.elbowL; }
            if (ud.armRG && !parts.armR) { ud.armRG.rotation.x += f.armXR; ud.armRG.rotation.z += f.armR; if (ud.armRG.userData.elbowG) ud.armRG.userData.elbowG.rotation.x -= f.elbowR; }`.replace(/\n/g,inl);
replace(index,old,`            if (ud.hips) { ud.hips.position.y += f.bounce; ud.hips.position.x = f.weight; }`);
const clawAnchor=index.next.match(/          if \(ud.jaw\) ud.jaw.rotation.x = 0;\r?\n        }\r?\n        if \(z.flashT > 0\) {/)[0];
replace(index,clawAnchor,clawAnchor.replace('        if (z.flashT > 0) {','        applyFeralClaws(THREE, z, phase, standing ? 0 : walkAmt);   // GP-19850: open, palms-down rakes over final torso pose'+inl+'        if (z.flashT > 0) {'));
for(const f of files)if(hash(fs.readFileSync(f.path,'utf8'))!==hash(f.source))throw Error(`Concurrent edit: ${f.path}`);
for(const f of files)fs.writeFileSync(f.path,f.next,'utf8');
console.log('Applied Feral open/downward claw poses, wide attack rakes and support-foot bounce.');
