import assert from 'node:assert/strict';
import {Box3, Triangle, Vector3} from '../../vendor/three/three.core.js';
import {surfaceCrossings} from './surface-crossings.mjs';
import {visibilityBuffer} from './visibility-buffer.mjs';

function patch(coords) {
  const p=coords.map(v=>new Vector3(...v));
  const tri=new Triangle(...p), box=new Box3().setFromPoints(p);
  const faces=[{p,tri,box}];
  return {faces,vertices:p,tree:{box,faces}};
}
const a=patch([[-1,-1,2],[1,-1,2],[0,1,2]]);
const b=patch([[-.7,-.8,1.4],[.7,-.8,2.6],[0,.8,2]]);
const front=patch([[-3,-3,1],[3,-3,1],[0,3,1]]);
const segments=surfaceCrossings(a,b);
assert.equal(segments.length,1);
assert(segments[0].every(v=>Math.abs(v.x)<1e-7 && Math.abs(v.z-2)<1e-7));
assert.equal(surfaceCrossings(a,front).length,0);
assert.equal(surfaceCrossings(a,a).length,0);
const w=160,h=100,mask=new Uint8Array(w*h).fill(1);
const project=p=>[p.x,p.y,p.z];
let raster=visibilityBuffer([a,b],project,w,h);
assert(raster.witnessed(segments,0,1,mask).length>12);
assert.equal(raster.witnessed(segments,0,1,new Uint8Array(w*h)).length,0);
assert(raster.witnessed(segments,0,1,mask,raster.depths).length>12);
assert.equal(raster.witnessed(segments,0,1,mask,new Float32Array(w*h).fill(.95)).length,0);
raster=visibilityBuffer([a,b,front],project,w,h);
assert.equal(raster.witnessed(segments,0,1,mask).length,0);
const lens=patch([[-.08,-.1,-.1],[.08,-.1,.15],[0,.1,.15]]);
assert(visibilityBuffer([lens],project,w,h).labels.includes(0));
console.log('PASS nine graphics fixtures: crossing endpoints, separated, coplanar, visible, masked, matching posed depth, mismatched posed depth, third-surface occlusion, near-plane clipping');
