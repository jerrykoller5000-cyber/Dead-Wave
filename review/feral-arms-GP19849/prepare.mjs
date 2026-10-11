import fs from 'node:fs';
import crypto from 'node:crypto';
const dir='review/feral-arms-GP19849', hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const source=fs.readFileSync('index.html','utf8'),motion=fs.readFileSync('game/feral-motion.js','utf8');
fs.writeFileSync(`${dir}/before-feral-motion.js`,motion);
fs.writeFileSync(`${dir}/before.html`,source.replace('<head>','<head><base href="/">').replace("from './game/feral-motion.js'",`from '/${dir}/before-feral-motion.js'`));
for(const name of ['capture.mjs','live-check.mjs']){
  const code=fs.readFileSync(`review/feral-GP198/${name}`,'utf8').replaceAll('review/feral-GP198',dir);
  fs.writeFileSync(`${dir}/${name}`,code);
}
fs.writeFileSync(`${dir}/baseline-hashes.json`,JSON.stringify({index:hash(source),motion:hash(motion)},null,2));
console.log('Saved the current Feral as the baseline; prepared independent preview/verification files.');
