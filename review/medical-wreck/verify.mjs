import fs from'node:fs';import vm from'node:vm';import assert from'node:assert/strict';import{createHash}from'node:crypto';import * as T from'three';import * as Fake from'../../tools/tests/fakethree.mjs';
const old=fs.readFileSync(new URL('details-before.js',import.meta.url),'utf8'),next=fs.readFileSync('assets/world/landmark-details.js','utf8');
const strip=s=>s.slice(0,s.indexOf("  if(o.kind==='wreck')"))+s.slice(s.indexOf("  if(o.kind==='camp')"));assert.equal(strip(old),strip(next));
const load=s=>{const c={window:{}};vm.runInNewContext(s,c);return c.window.buildLandmarkDetails;};
const hash=b=>{const h=createHash('sha256');for(const m of b.parts){m.updateMatrix();h.update(JSON.stringify(m.matrix.elements));h.update(String(m.material.color.getHex()));for(const a of Object.values(m.geometry.attributes))h.update(Buffer.from(a.array.buffer));}return h.digest('hex');};
for(const slope of[-.2,0,.2])for(const variant of[0,1]){
  const o={kind:'wreck',variant,ground:(x,z)=>slope*x-.03*z,tilt:.07,roll:-.04},a=load(old)(T,o),b=load(next)(T,o);
  assert.equal(JSON.stringify(a.solids),JSON.stringify(b.solids));
  for(const p of b.parts){p.updateMatrix();assert([...p.geometry.attributes.position.array,...p.matrix.elements].every(Number.isFinite));}
  if(variant===1)assert.equal(hash(a),hash(b));
  load(next)(Fake,o);
}
console.log('PASS six terrain/variant builds and fake THREE; all solids identical; utility truck geometry/materials/transforms unchanged; every other landmark builder unchanged.');
