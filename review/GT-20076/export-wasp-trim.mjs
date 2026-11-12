import {readFile,writeFile,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const models={
  '--minigun-panel':['minigun/clear-minigun-panel-after/trim-drum.json','weapon-minigun-panel','minigunSidePanelGeometry',220,696],
  '--kr-band':['ak/clear-kr-band-after/trim-lower.json','weapon-kr7-band','krHandguardBandGeometry',224,606],
  '--wasp':['uzi/clear-wasp-base-after/trim-mesh.json','weapon-wasp-trim','waspGripTrimGeometry',317,996]
};
const key=Object.keys(models).find(flag=>process.argv.includes(flag))||'--wasp';
const [source,filename,factory,vertexCount,indexCount]=models[key];
const file=new URL('visible-repairs/'+source,import.meta.url);
const {vertices,indices}=JSON.parse(await readFile(file,'utf8'));
assert.equal(vertices.length,vertexCount);assert.equal(indices.length,indexCount);
function float(value){
  for(let digits=1;digits<=9;digits++){
    const n=Number(value.toPrecision(digits));
    if(Math.fround(n)===value)return String(n);
  }
  throw Error('Invalid vertex coordinate');
}
function faceLines(indices,offset=0){
  const rows=[];
  for(let i=0;i<indices.length;i+=3)rows.push('  '+indices.slice(i,i+3).map(id=>id+offset).join(', ')+',');
  return rows.join('\n');
}
let tables='const faces = [\n'+faceLines(indices)+'\n];\n\nconst cached = new WeakMap();';
let argumentsList='T',selectPart='';
if(key==='--minigun-panel'){
  const parts=[['panel',faceLines(indices)]];
  for(const [surface,part,count] of [['trim5-drum-extended-neck','upperStrip',129],['trim6-drum','lowerStrip',55]]){
    const json=JSON.parse(await readFile(new URL(surface+'.json',file),'utf8'));
    assert.equal(json.vertices.length,count);
    parts.push([part,faceLines(json.indices,vertices.length)]);
    vertices.push(...json.vertices);
  }
  tables=parts.map(([part,rows])=>'const '+part+'Faces = [\n'+rows+'\n];').join('\n\n');
  tables+='\n\nconst parts = {\n'+parts.map(([name])=>'  '+name+': { faces: '+name+'Faces, cached: new WeakMap() },').join('\n')+'\n};';
  argumentsList="T, part = 'panel'";
  selectPart="  const {faces, cached} = parts[part];\n";
}
const header=key==='--minigun-panel'?`// Minigun right side panel. Each row stores position, normal and UV in panel space.
// Rebuild from the original game artwork with bake-kr-band.py --minigun-panel
// for the plate and strips. The upper strip clears the extended neck as well.
// Export the three surfaces with export-wasp-trim.mjs --minigun-panel.`:key==='--kr-band'?`// KR-7 front handguard band. Each row stores position, normal and UV in mesh space.
// The exterior follows the original game artwork. Rebuild the wood-facing surface
// with bake-kr-band.py lower and export-wasp-trim.mjs --kr-band in review/GT-20076.`:`// Wasp lower grip trim. The vertex rows are position, normal and UV in trim space.
// Cut from the game's original grip and band. To refit, use the Wasp trim prototype
// and export-wasp-trim.mjs in review/GT-20076. No mesh cutting runs during game startup.`;
const model=`${header}
const vertices = [
${vertices.map(v=>'  ['+v.map(float).join(', ')+'],').join('\n')}
];

${tables}
export function ${factory}(${argumentsList}) {
${selectPart}  let geometry = cached.get(T);
  if (!geometry) {
    const position = new Float32Array(faces.length * 3);
    const normal = new Float32Array(faces.length * 3);
    const uv = new Float32Array(faces.length * 2);
    for (let i = 0; i < faces.length; i++) {
      const [x, y, z, nx, ny, nz, u, v] = vertices[faces[i]];
      position.set([x, y, z], i * 3);
      normal.set([nx, ny, nz], i * 3);
      uv.set([u, v], i * 2);
    }
    geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(position, 3));
    geometry.setAttribute('normal', new T.BufferAttribute(normal, 3));
    geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.userData.shared = true;
    cached.set(T, geometry);
  }
  return geometry;
}
`;
const output=new URL('../../studio/'+filename+'.js',import.meta.url);
const previous=await readFile(output,'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
if(process.argv.includes('--write')){
  if(previous===null)await writeFile(output,model,{encoding:'utf8',flag:'wx'});
  else if(previous!==model){
    assert(previous.startsWith(header.split('\n')[0]));
    const temp=new URL(filename+'.'+randomUUID()+'.tmp',output);
    await writeFile(temp,model,{encoding:'utf8',flag:'wx'});
    assert.equal(await readFile(output,'utf8'),previous,'Model changed during export');
    await rename(temp,output);
  }
}else assert.equal(previous,model);
console.log(output.pathname,Buffer.byteLength(model),'bytes');
