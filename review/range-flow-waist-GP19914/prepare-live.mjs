import fs from 'node:fs';
const dir='review/range-flow-waist-GP19914';
for(const name of ['native','perf']){
 const s=fs.readFileSync(`${dir}/${name}.mjs`,'utf8').replace("before?'./camera-before.mjs':'./camera-after.mjs'","before?'./camera-before.mjs':'../../tools/camera.mjs'").replaceAll('/review/range-flow-waist-GP19914/marine-waist.js','/studio/marine-waist.js').replaceAll("before?'before':'after'","before?'before':'live'");fs.writeFileSync(`${dir}/${name}-live.mjs`,s);
}
