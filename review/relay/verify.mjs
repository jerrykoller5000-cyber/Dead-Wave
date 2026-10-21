import fs from'node:fs';import vm from'node:vm';import assert from'node:assert/strict';import{createHash}from'node:crypto';import * as T from'three';import * as Fake from'../../tools/tests/fakethree.mjs';
const root=new URL('./',import.meta.url),read=n=>fs.readFileSync(new URL(n,root),'utf8'),old=read('details-before.js'),next=fs.readFileSync('assets/world/landmark-details.js','utf8');
const strip=s=>s.slice(0,s.indexOf("  if(o.kind==='mast')"))+s.slice(s.indexOf("  if(o.kind==='bridge')"));assert.equal(strip(old),strip(next));
const load=s=>{const c={window:{}};vm.runInNewContext(s,c);return c.window;};
for(const slope of[-.2,0,.2]){const o={kind:'mast',ground:(x,z)=>slope*x-.03*z},a=load(old).buildLandmarkDetails(T,o),b=load(next).buildLandmarkDetails(T,o);assert.equal(JSON.stringify(a.solids),JSON.stringify(b.solids));for(const p of b.parts){p.updateMatrix();assert([...p.geometry.attributes.position.array,...p.matrix.elements].every(Number.isFinite));}load(next).buildLandmarkDetails(Fake,o);}
const prior=read('objectives-before.js'),current=fs.readFileSync('assets/world/objective-props.js','utf8'),stripRadio=s=>s.slice(0,s.indexOf('      radio: () =>'))+s.slice(s.indexOf('      // A bunded stand:'));
assert.equal(stripRadio(prior),stripRadio(current));
const sites=JSON.parse(read('before-checks.json')).state.sites;
const build=s=>{const solids=[],w=load(s),b=w.buildObjectiveProps(T,{sites,height:(x,z)=>.1*x+.02*z,solid:(...s)=>solids.push(s)});return{...b,solids};};
const a=build(prior),b=build(current);assert.deepEqual(a.solids,b.solids);
const hash=g=>{const h=createHash('sha256');g.traverse(m=>{if(m.geometry)for(const a of Object.values(m.geometry.attributes))h.update(Buffer.from(a.array.buffer));});return h.digest('hex');};
for(const[id,p]of Object.entries(b.props)){if(p.kind!=='radio'){assert.equal(hash(p.group),hash(a.props[id].group));continue;}for(const state of p.states){p.setState(state);const box=new T.Box3();for(const m of p.group.children)if(m.isMesh&&m.visible&&m!==p.light){m.geometry.computeBoundingBox();box.union(m.geometry.boundingBox);}const size=box.getSize(new T.Vector3());assert(size.x<=1&&size.z<=1.04&&box.max.y<=1.27);assert.equal(p.light.material.emissive.getHex(),state==='repaired'?0x3dff6a:0xffa31a);assert.equal(Object.values(p.meshes).filter(m=>m.visible).length,1);}}
console.log('PASS three mast terrain cases/fake THREE, unchanged solids; radio states/light/footprint; six other objective models and every other landmark builder unchanged.');
