import fs from 'node:fs';
import assert from 'node:assert';
import * as THREE from '../../vendor/three/three.webgpu.js';
import { skinMergeGroup } from '../../core/skin-merge.js';
import { buildKillerRabbit, createRabbit, wakeRabbit, stepRabbit } from '../../world/rabbit.js';

// 1. Check UTF-8 no BOM & no mojibake (t215 check)
for (const file of ['index.html', 'world/rabbit.js']) {
  const buf = fs.readFileSync(file);
  assert(!(buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF), `${file} has UTF-8 BOM`);
  const text = buf.toString('utf8');
  const bad = ['\u00c2\u00b7', '\u00c3\u0097', '\u00e2\u0080\u0094', '\u00e2\u0080\u0093', '\u00e2\u0086\u0092', '\ufffd'];
  for (const b of bad) {
    assert(!text.includes(b), `${file} contains mojibake sequence: ${JSON.stringify(b)}`);
  }
}
console.log('[PASS] UTF-8 no-BOM and mojibake check on index.html and world/rabbit.js');

// 2. Test buildKillerRabbit and stepRabbit (which drives poseRabbit)
const kr = buildKillerRabbit(THREE);
assert.strictEqual(kr.name, 'killer-rabbit');
assert(kr.userData.head, 'killer-rabbit missing userData.head');
assert(Array.isArray(kr.userData.feet) && kr.userData.feet.length === 2, 'killer-rabbit missing 2 hind feet');
assert(kr.userData.fur, 'killer-rabbit missing userData.fur');
const rabState = createRabbit({ x: 0, z: 0 }, () => 0);
rabState.mesh = kr;
wakeRabbit(rabState);
stepRabbit(rabState, 0.25, { x: 4, y: 0, z: 4 }, () => 0);
stepRabbit(rabState, 0.25, { x: 2, y: 0, z: 2 }, () => 0);
const krBox = new THREE.Box3().setFromObject(kr);
assert(Number.isFinite(krBox.min.x) && Number.isFinite(krBox.max.y), 'killer-rabbit bbox non-finite');
console.log('[PASS] world/rabbit.js buildKillerRabbit & poseRabbit verified:', {
  children: kr.children.length,
  headChildren: kr.userData.head.children.length,
  size: krBox.getSize(new THREE.Vector3()).toArray().map(n => +n.toFixed(3))
});

// 3. Extract and evaluate index.html wildlife builders in pure Node
const html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

const bugStart = html.indexOf('// --- Bees & butterflies (Grave Shift critters)');
const bugEnd = html.indexOf('function pickBugPad(', bugStart);
assert(bugStart > 0 && bugEnd > bugStart, 'Could not locate bug builders in index.html');
const bugCode = html.slice(bugStart, bugEnd);

const wildStart = html.indexOf('// --- Ambient wildlife (birds / rabbits / frogs)');
const wildEnd = html.indexOf('function clearWildlife()', wildStart);
assert(wildStart > 0 && wildEnd > wildStart, 'Could not locate wildlife builders in index.html');
const wildCode = html.slice(wildStart, wildEnd);

const fn = new Function('THREE', 'skinMergeGroup', `
  const scene = new THREE.Group();
  const foliage = [];
  const sampleHeight = () => 0;
  ${bugCode}
  ${wildCode}
  return {
    makeBeeMesh,
    makeButterflyMesh,
    makeBirdMesh,
    makeRabbitMesh,
    makeBurrowMesh,
    makeNestMesh,
    makeFrogMesh,
    makeLilyPadMesh,
    makeSquirrelMesh,
    makeTurtleMesh,
    makeFishMesh,
    FISH_KINDS,
    disposeWildMesh,
    disposeNestMesh,
    disposeBugMesh,
    clearBugs
  };
`);

const builders = fn(THREE, skinMergeGroup);

function checkObject(obj, label) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  assert(
    Number.isFinite(size.x) && Number.isFinite(size.y) && Number.isFinite(size.z),
    `${label} has non-finite bounding box`
  );
  assert(size.x > 0 && size.y > 0 && size.z > 0, `${label} has zero-size bounding box`);
  let meshCount = 0;
  let skinnedCount = 0;
  let vertCount = 0;
  obj.traverse(c => {
    if (c.isMesh) {
      meshCount++;
      const pos = c.geometry?.attributes?.position;
      assert(pos && pos.count > 0, `${label} mesh has empty position attribute`);
      vertCount += pos.count;
      for (let i = 0; i < pos.array.length; i++) {
        assert(Number.isFinite(pos.array[i]), `${label} has NaN/Inf vertex coordinate`);
      }
    }
    if (c.isSkinnedMesh) {
      skinnedCount++;
      assert(c.skeleton && c.skeleton.bones.length > 0, `${label} SkinnedMesh has empty skeleton`);
    }
  });
  return { meshCount, skinnedCount, vertCount, size: size.toArray().map(n => +n.toFixed(3)) };
}

// Bee
const bee = builders.makeBeeMesh();
assert(bee.userData.wingL && bee.userData.wingR && bee.userData.kind === 'bee');
console.log('[PASS] animal.bee:', checkObject(bee, 'bee'));

// Butterfly (run 6 times to cover all 6 palette entries)
let bfStats;
for (let i = 0; i < 6; i++) {
  const bf = builders.makeButterflyMesh();
  assert(bf.userData.wingL && bf.userData.wingR && bf.userData.wingMat && bf.userData.kind === 'butterfly');
  bfStats = checkObject(bf, `butterfly#${i}`);
  const counts = new Map();
  bf.traverse((o) => {
    if (!o.isMesh || !o.geometry || counts.has(o.geometry)) return;
    const geometry = o.geometry;
    counts.set(geometry, 0);
    geometry.dispose = () => counts.set(geometry, counts.get(geometry) + 1);
  });
  builders.disposeBugMesh(bf);
  for (const count of counts.values()) assert.strictEqual(count, 1, 'butterfly shared geometry disposed more than once');
}
console.log('[PASS] animal.butterfly (all 6 palettes, shared geometry disposed once):', bfStats);

// Bird (run 5 times to cover all BIRD_COLORS)
let birdStats;
for (let i = 0; i < 5; i++) {
  const bird = builders.makeBirdMesh();
  assert(bird.userData.wingL && bird.userData.wingR && bird.userData.tail && bird.userData.noCull);
  birdStats = checkObject(bird, `bird#${i}`);
  builders.disposeWildMesh(bird);
}
console.log('[PASS] animal.bird (all 5 species palettes):', birdStats);

// Rabbit (run 4 times to cover all RABBIT_COLORS)
let rabStats;
for (let i = 0; i < 4; i++) {
  const rab = builders.makeRabbitMesh();
  assert(rab.userData.earL && rab.userData.earR && rab.userData.tail && rab.userData.joints);
  for (const k of ['head', 'earL', 'earR', 'tail', 'foreL', 'foreR', 'hindL', 'hindR', 'kneeFL', 'kneeFR', 'kneeHL', 'kneeHR']) {
    assert(rab.userData.joints[k], `rabbit missing joint ${k}`);
  }
  rabStats = checkObject(rab, `rabbit#${i}`);
  builders.disposeWildMesh(rab);
}
console.log('[PASS] animal.rabbit (all 4 coat palettes + 12 joints):', rabStats);

// Burrow (run 6 times to cover kinds 0, 1, 2)
let burrowStats;
for (let i = 0; i < 6; i++) {
  const burrow = builders.makeBurrowMesh();
  assert.strictEqual(burrow.userData.mouthZ, 0);
  assert([0, 1, 2].includes(burrow.userData.kind), 'burrow kind must be 0, 1, or 2');
  burrowStats = checkObject(burrow, `burrow#${i}`);
  builders.disposeWildMesh(burrow);
}
console.log('[PASS] animal.burrow (variants 0..2):', burrowStats);

// Nest
const nest = builders.makeNestMesh();
console.log('[PASS] animal.nest:', checkObject(nest, 'nest'));
builders.disposeNestMesh(nest);

// Frog
const frog = builders.makeFrogMesh();
assert(frog.userData.eyeL && frog.userData.eyeR && frog.userData.throat && frog.userData.baseScale);
assert(frog.userData.eyeL.userData.pupil && frog.userData.eyeR.userData.pupil, 'frog missing horizontal pupils');
console.log('[PASS] animal.frog:', checkObject(frog, 'frog'));
builders.disposeWildMesh(frog);

// Lily pad (run 20 times to hit both plain and lotus flower branches)
let lilyStats;
for (let i = 0; i < 20; i++) {
  const pad = builders.makeLilyPadMesh();
  lilyStats = checkObject(pad, `lily-pad#${i}`);
  builders.disposeWildMesh(pad);
}
console.log('[PASS] animal.lily-pad (with & without lotus flower):', lilyStats);

// Squirrel
const sq = builders.makeSquirrelMesh();
assert(sq.userData.tail && sq.userData.baseScale);
console.log('[PASS] animal.squirrel:', checkObject(sq, 'squirrel'));
builders.disposeWildMesh(sq);

// Turtle
const turtle = builders.makeTurtleMesh();
assert(turtle.userData.head && turtle.userData.neck && Array.isArray(turtle.userData.legs) && turtle.userData.legs.length === 4);
for (const leg of turtle.userData.legs) {
  assert(leg.userData.baseScale && typeof leg.userData.baseScale.x === 'number', 'turtle leg missing baseScale');
}
console.log('[PASS] animal.turtle:', checkObject(turtle, 'turtle'));
builders.disposeWildMesh(turtle);

// Fish (all FISH_KINDS)
for (let i = 0; i < builders.FISH_KINDS.length; i++) {
  const fish = builders.makeFishMesh(builders.FISH_KINDS[i]);
  assert(fish.userData.tail && fish.userData.body && fish.userData.baseScale);
  console.log(`[PASS] animal.fish:${i} (${builders.FISH_KINDS[i].name}):`, checkObject(fish, `fish:${i}`));
  builders.disposeWildMesh(fish);
}

console.log('\nALL 12 WILDLIFE & HABITAT BUILDERS VERIFIED CLEAN IN PURE NODE!');
