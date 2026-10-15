import fs from 'node:fs';
const dir='review/range-console-GP19912';
fs.writeFileSync(dir+'/old.css',fs.readFileSync('ui/range-drills.css','utf8').split('/* GP-19912:')[0]);
fs.writeFileSync(dir+'/old-console.js',fs.readFileSync(dir+'/range-console.before.js','utf8').replace(/from '\.\/(.*?)'/g,"from '/ui/$1'").replace("new URL('./range-drills.css'","new URL('./old.css'"));
fs.writeFileSync(dir+'/old-feature.js',fs.readFileSync(dir+'/range-feature.before.js','utf8').replace(/from '\.\/(.*?)'/g,(m,k)=>k==='range-console.js'?"from './old-console.js'":`from '/ui/${k}'`).replace("from '../core/audio.js'","from '/core/audio.js'"));
fs.writeFileSync(dir+'/before.html',fs.readFileSync(dir+'/index.before.txt','utf8').replace('<head>','<head><base href="/">').replace("from './ui/range-feature.js'","from './review/range-console-GP19912/old-feature.js'"));
fs.writeFileSync(dir+'/camera-before.mjs',fs.readFileSync(dir+'/camera.mjs','utf8').replace('/'+dir+'/index.html?debug','/'+dir+'/before.html?debug'));
let perf=fs.readFileSync('review/range-misses-GP19911/perf.mjs','utf8').replace('review/range-misses-GP19911','review/range-console-GP19912').replace("'../../tools/camera.mjs'","'./camera.mjs'");fs.writeFileSync(dir+'/perf.mjs',perf);
