import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {save} from '../GT-20076/save.mjs';
const read=async f=>JSON.parse(await readFile(new URL('./'+f,import.meta.url),'utf8'));
const [a,b]=await Promise.all(['before','after'].map(s=>read(s+'/art.json')));
assert.deepEqual(a.anchor,b.anchor);assert.deepEqual(a.repeat,b.repeat);assert.equal(a.woodTexture,b.woodTexture);
assert.equal(a.meshes.length,b.meshes.length);
const changed=[],errors=[];let stationary=0;
for(let i=0;i<a.meshes.length;i++){
 const before=a.meshes[i],after=b.meshes[i];
 const identity={name:before.name,mat:before.mat,count:before.count};
 const stock=before.mat==='Revolver walnut' && before.groups.left && before.groups.right;
 if(stock){
   const f=b.stockFit;assert(f.fixed>0 && f.lower>0 && f.blend>0 && f.missing===0 && f.normalError<1e-6);
   assert.equal(f.sourceCount,before.count);assert.equal(f.sourceUV,before.uv);assert.equal(f.sourceNormals,before.normals);
   assert(Math.abs(f.dxMin+.004)<1e-7 && f.dxMax===0);assert.equal(f.finalCount,after.count);
   changed.push({mesh:i,...identity,taper:f});continue;
 }
 for(const key of ['name','mat','count','normals','uv','indices'])if(before[key]!==after[key])errors.push({mesh:i,key});
 assert.deepEqual(Object.keys(before.groups),Object.keys(after.groups));
 let moved=false;
 for(const side of Object.keys(before.groups)){
   const s=before.groups[side],t=after.groups[side];
   const dx=t.min-s.min,dh=t.max-s.max;
   if(s.count!==t.count||s.yz!==t.yz)errors.push({mesh:i,side,key:'count/yz'});
   if(s.shape!==t.shape||Math.abs(dx-dh)>5e-8)errors.push({mesh:i,side,key:'shape/range',s,t});
   if(Math.abs(dx)<5e-8)continue;
   assert(side==='right' && Math.abs(dx+.004)<5e-8);
   moved=true;changed.push({mesh:i,...identity,side,count:s.count,dx,minBefore:s.min,minAfter:t.min});
 }
 if(!moved)stationary++;
}
assert.deepEqual(errors,[]);
assert(changed.some(r=>r.mat==='Revolver walnut' && r.count===1560));
assert(changed.some(r=>r.mat==='Revolver walnut inset'));
const out={sourceMeshes:a.meshes.length,stationary,changed,texture:a.woodTexture,textureRepeat:a.repeat,triggerPin:a.anchor};
await save(new URL('./comparison.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
console.log('PASS all native meshes: ',a.meshes.length,';',stationary,'fully stationary;',changed.length,'right-side graphic entries; rigid artwork is -.004, sole stock taper and its normals verified vertex by vertex. UVs and grain match.');
