import fs from 'node:fs';import crypto from 'node:crypto';
const dir='review/range-accuracy-GP19910',file='world/training-ballistics.js',original=fs.readFileSync(file,'utf8');
const patches=[{
oldText:'    const t=segmentBox(a,b,solid);',
newText:`    let t;
    if(solid.target!=null){
      // A target is a thin drawn plate, not the front face of its broad-phase box.
      // Aim, silhouette tests and scoring must share the actual upright surface.
      if(Math.abs(d.z)<1e-10)continue;
      t=((solid.minZ+solid.maxZ)*.5-a.z)/d.z;
      if(t<0||t>1)continue;
      const x=a.x+d.x*t,y=a.y+d.y*t;
      if(x<solid.minX||x>solid.maxX||y<solid.minY||y>solid.maxY)continue;
    }else t=segmentBox(a,b,solid);`
},{oldText:'  if(hit.solid.floor)hit.normal.y=1;',newText:'  if(hit.solid.floor)hit.normal.y=1;\n  else if(hit.solid.target!=null)hit.normal.z=d.z>0?-1:1;'}];
let candidate=original;for(const p of patches){if(candidate.split(p.oldText).length!==2)throw Error('anchor');candidate=candidate.replace(p.oldText,p.newText);}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');fs.writeFileSync(dir+'/patch.json',JSON.stringify({file,before:hash(original),patches},null,2));fs.writeFileSync(dir+'/ballistics-before.txt',original);fs.writeFileSync(dir+'/ballistics.js',candidate.replace("from './training.js'","from '../../world/training.js'"));
let html=fs.readFileSync('index.html','utf8').replace('<head>','<head><base href="/">').replace("from './world/training-ballistics.js'","from './review/range-accuracy-GP19910/ballistics.js'").replace("from './ui/range-feature.js'","from './review/range-accuracy-GP19910/range-feature.js'").replace("from './world/training-target-hits.js'","from './review/range-accuracy-GP19910/target-hits.js'");fs.writeFileSync(dir+'/index.html',html);
fs.writeFileSync(dir+'/range-feature.js',fs.readFileSync('ui/range-feature.js','utf8').replace(/from '\.\/(.*?)'/g,(m,k)=>k==='range-targets.js'?m:`from '/ui/${k}'`).replace("from '../core/audio.js'","from '/core/audio.js'"));
fs.writeFileSync(dir+'/range-targets.js',fs.readFileSync('ui/range-targets.js','utf8').replace(/from '\.\/(.*?)'/g,"from '/ui/$1'").replace("from '../world/training-ballistics.js'","from './ballistics.js'").replace("from '../world/training-cutaway.js'","from '/world/training-cutaway.js'"));
fs.writeFileSync(dir+'/target-hits.js',fs.readFileSync('world/training-target-hits.js','utf8').replace("from './training-ballistics.js'","from './ballistics.js'"));
let engine=fs.readFileSync('tools/camera.mjs','utf8').replace("from './serve.mjs'","from '../../tools/serve.mjs'").replace("from './cdp.mjs'","from '../../tools/cdp.mjs'").replace("new URL('..', import.meta.url)","new URL('../..', import.meta.url)").replace('/index.html?debug=1&raf=timer','/'+dir+'/index.html?debug=1&raf=timer');fs.writeFileSync(dir+'/camera.mjs',engine);
fs.writeFileSync(dir+'/audit-after.mjs',fs.readFileSync(dir+'/audit.mjs','utf8').replace("from '../../tools/camera.mjs'","from './camera.mjs'").replace('/baseline-native.json','/staged-native.json'));
console.log('STAGED two focused trace edits; live world unchanged.');
