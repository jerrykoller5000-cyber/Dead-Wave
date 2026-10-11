import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {improveIndex,improveWorld,improveProps} from './changes.mjs';
const dir='review/training-fixes-GP191';
const sha=s=>createHash('sha256').update(s).digest('hex');
const paths=['index.html','world/training.js','world/training-props.js'];
const old=paths.map(p=>fs.readFileSync(p,'utf8'));
const updated=[improveIndex(old[0]),improveWorld(old[1]),improveProps(old[2])];
for(let i=0;i<paths.length;i++)if(fs.readFileSync(paths[i],'utf8')!==old[i])throw Error('Concurrent change: '+paths[i]);
for(const [tag, sources] of [['before',old],['after',updated]]) {
  fs.writeFileSync(`${dir}/${tag}.html`,sources[0].replace('<head>', '<head>\n<base href="../../">')
    .replace("'./world/training.js'",`'./${dir}/${tag}-training.js'`),'utf8');
  fs.writeFileSync(`${dir}/${tag}-training.js`,sources[1].replace("'./training-props.js'",`'./${tag}-props.js'`)
    .replace("'./bake.js'","'../../world/bake.js'"),'utf8');
  fs.writeFileSync(`${dir}/${tag}-props.js`,sources[2],'utf8');
}
fs.writeFileSync(`${dir}/sources.json`,JSON.stringify(paths.map((p,i)=>({path:p,before:sha(old[i]),after:sha(updated[i])})),null,2)+'\n');
console.log('Prepared isolated before/after pages. Live index/world files unchanged.');
