import fs from 'node:fs';
const dir='review/range-cues-GP19908';fs.mkdirSync(dir+'/before',{recursive:true});
let s=fs.readFileSync(dir+'/ui_range-feature.js.before.txt','utf8').replace(/from '\.\/(.*?)'/g,(m,k)=>k==='range-targets.js'?m:`from '/ui/${k}'`);
fs.writeFileSync(dir+'/before/range-feature.js',s);
s=fs.readFileSync(dir+'/ui_range-targets.js.before.txt','utf8').replace("from './range-drills.js'","from '/ui/range-drills.js'").replaceAll("from '../world/","from '/world/");fs.writeFileSync(dir+'/before/range-targets.js',s);
s=fs.readFileSync('index.html','utf8').replace('<head>','<head><base href="/">').replace("from './ui/range-feature.js'","from './review/range-cues-GP19908/before/range-feature.js'");fs.writeFileSync(dir+'/before/index.html',s);
s=fs.readFileSync('tools/camera.mjs','utf8').replace("from './serve.mjs'","from '../../tools/serve.mjs'").replace("from './cdp.mjs'","from '../../tools/cdp.mjs'").replace("new URL('..', import.meta.url)","new URL('../..', import.meta.url)").replace('/index.html?debug=1&raf=timer','/'+dir+'/before/index.html?debug=1&raf=timer');fs.writeFileSync(dir+'/camera-before.mjs',s);
console.log('Before-preview prepared; only prior UI feature/prop substituted.');
