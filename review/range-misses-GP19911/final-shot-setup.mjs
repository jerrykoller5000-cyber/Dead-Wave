import fs from 'node:fs';
const d='review/range-misses-GP19911';
const s=fs.readFileSync(d+'/native-before.mjs','utf8').replace("from './camera-before.mjs'","from '../../tools/camera.mjs'").replace('/before-verified.json','/final-shot.json').replace('/wrong-zone-before.png','/wrong-zone-final.png');
fs.writeFileSync(d+'/native-final-shot.mjs',s);
