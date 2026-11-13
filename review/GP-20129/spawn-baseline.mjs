// Establish the unrelated spawn assertion with the exact pre-GP-20129 keypad block in memory.
// Never writes world/training.js and never changes an assertion.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as FakeThree from '../../tools/tests/fakethree.mjs';
import {buildTrainingGround,clampToRects} from '../../world/training.js';
const url=new URL('../../world/training.js',import.meta.url),s=fs.readFileSync(url,'utf8'),start=s.indexOf('  // J151 note 59:'),end=s.indexOf('  const doorSolid =',start);
assert(start>0&&end>start);
const old=`  const keypadTex = keep(canvasTex(T, 64, 80, (c, w, h) => {
    c.fillStyle = '#2a2f33'; c.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) {
      c.fillStyle = r === 3 && k !== 1 ? (k ? '#3f9a5c' : '#b8433a') : '#c9ced1';
      c.fillRect(6 + k * 19, 6 + r * 18.5, 14, 13);
    }
  }, [1, 1]));
  const keypadFace = std({ color: 0xffffff, map: keypadTex, roughness: .5 });
  const keypads = [];
  for (const side of [-1, 1]) {
    // AG-278 (Jerry's J104): keypad mounted flush on the yellow-and-black striped door trim post (z = D.minZ, face at D.x + side * .25)
    const kz = D.minZ;
    box(.025, .08, .14, doorLamp, D.x + side * (.25 + .0125), 1.42, kz);
    box(.04, .16, .14, steelLight, D.x + side * (.25 + .02), 1.28, kz);
    const face = add(new T.PlaneGeometry(.13, .15), keypadFace, D.x + side * (.25 + .04 + .001), 1.28, kz);
    face.rotation.y = side * Math.PI / 2; (face.userData || (face.userData = {})).isDecal = true;
    keypads.push({ side, x: O.x + D.x + side * (.25 + .04), y: O.y + 1.28, z: O.z + kz, front: W(D.x + side * 1.0, kz) });
  }
`;
const baseline=(s.slice(0,start)+old+s.slice(end)).replace(/from '([^']+)'/g,(all,p)=>p.startsWith('.')?`from '${new URL(p,url).href}'`:all);
const prior=await import('data:text/javascript;base64,'+Buffer.from(baseline).toString('base64'));
function read(build,clamp){const tg=build(FakeThree);try{return{spawn:tg.spawn,walk:tg.walk,clamp:clamp(tg.walk,tg.spawn.x,tg.spawn.z)};}finally{tg.dispose();}}
const before=read(prior.buildTrainingGround,prior.clampToRects),after=read(buildTrainingGround,clampToRects);
assert.deepEqual(after,before,'keypad change does not change walk or spawn');assert.equal(before.clamp.moved,true,'the original spawn assertion also fails before the keypad change');
fs.writeFileSync(new URL('spawn-baseline.json',import.meta.url),JSON.stringify({before,after,same:true},null,2));console.log('Spawn assertion fails identically before/after keypad change; all walk/spawn values equal.');
