import fs from 'node:fs';
const dir='review/range-console-GP19912';let s=fs.readFileSync(dir+'/native.mjs','utf8').replace("from './camera.mjs'","from '../../tools/camera.mjs'").replace('/native.json','/live-native.json');
s=s.replace("await shot('monitor-results',", "await E.ev(\"document.getElementById('rangeConsole').hidden=true;\");await shot('monitor-results',");
fs.writeFileSync(dir+'/live-native.mjs',s);
