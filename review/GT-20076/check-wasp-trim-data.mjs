import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as Real from '../../vendor/three/three.core.js';
import * as Light from '../../tools/tests/fakethree.mjs';
import {minigunSidePanelGeometry} from '../../studio/weapon-minigun-panel.js';
import {krHandguardBandGeometry} from '../../studio/weapon-kr7-band.js';
import {waspGripTrimGeometry} from '../../studio/weapon-wasp-trim.js';
assert(process.env.DW_GAME_TEST_TOKEN);
const minigun=process.argv.includes('--minigun-panel'),krBand=process.argv.includes('--kr-band');
const source=minigun?'minigun/clear-minigun-panel-after/trim-drum.json':krBand?'ak/clear-kr-band-after/trim-lower.json':'uzi/clear-wasp-base-after/trim-mesh.json';
const build=minigun?minigunSidePanelGeometry:krBand?krHandguardBandGeometry:waspGripTrimGeometry;
const parts=minigun?[
  ['panel',source],['upperStrip',source.replace('trim-drum','trim5-drum-extended-neck')],['lowerStrip',source.replace('trim-drum','trim6-drum')]
]:[[undefined,source]];
for(const [part,path] of parts){
 const {vertices,indices}=JSON.parse(await readFile(new URL('visible-repairs/'+path,import.meta.url),'utf8'));
 for(const [name,T] of [['WebGPU mesh',Real],['lightweight mesh',Light]]){
  const geometry=build(T,part);
  assert.equal(build(T,part),geometry);
  for(const [attr,start,width] of [['position',0,3],['normal',3,3],['uv',6,2]]){
    const values=geometry.attributes[attr].array;
    assert.equal(values.length,indices.length*width);
    indices.forEach((key,i)=>{for(let j=0;j<width;j++)assert.equal(values[i*width+j],vertices[key][start+j]);});
  }
  assert(geometry.userData.shared);
  console.log('PASS',name,part||'',indices.length/3,'triangles, all attributes and cached mesh identity');
 }
}
