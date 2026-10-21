import fs from 'node:fs';
const dir='review/range-barrier-GP19907';
let s=fs.readFileSync(dir+'/verify.mjs','utf8').replace("from './camera.mjs'","from '../../tools/camera.mjs'").replaceAll("/review/range-barrier-GP19907/range-drills.js","/ui/range-drills.js").replaceAll("/native-proof.json","/live-native-proof.json");
fs.writeFileSync(dir+'/verify-live.mjs',s);
s=fs.readFileSync(dir+'/barrier.test.mjs','utf8').replace("from './training.js'","from '../../world/training.js'").replace("from './training-ballistics.js'","from '../../world/training-ballistics.js'").replace("from './firing-line.js'","from '../../world/training-firing-line.js'");
fs.writeFileSync(dir+'/barrier-live.test.mjs',s);
s=fs.readFileSync(dir+'/grenade-check.mjs','utf8').replace("from './camera.mjs'","from '../../tools/camera.mjs'").replaceAll("/review/range-barrier-GP19907/range-drills.js","/ui/range-drills.js").replace("/grenade-proof.json","/live-grenade-proof.json");
fs.writeFileSync(dir+'/grenade-check-live.mjs',s);
s=fs.readFileSync(dir+'/capture.mjs','utf8').replace("before?'../../tools/camera.mjs':'./camera.mjs'","'../../tools/camera.mjs'").replace("prefix=before?'before':'after'","prefix='live'");
fs.writeFileSync(dir+'/capture-live.mjs',s);
// Verify the merged file is precisely the current pre-apply file plus the approved focused edits.
const rows=JSON.parse(fs.readFileSync(dir+'/patches.json','utf8'));
for(const r of rows){
 let expected=r.newFile?r.text:fs.readFileSync(dir+'/applied-before/'+r.file.replaceAll('/','_'),'utf8');
 if(!r.newFile)for(const p of r.patches)expected=expected.replace(p.oldText,p.newText);
 if(fs.readFileSync(r.file,'utf8')!==expected)throw Error('Unexpected change: '+r.file);
}
console.log('PASS all ten live files match focused patches; unrelated Claude/Grokbot source retained.');
