import fs from 'node:fs';
const dir='review/feral-claws-GP19850';
fs.writeFileSync(`${dir}/before-feral-motion.js`,fs.readFileSync('game/feral-motion.js','utf8'));
fs.writeFileSync(`${dir}/before.html`,fs.readFileSync('index.html','utf8').replace('<head>','<head><base href="/">').replace("from './game/feral-motion.js'",`from '/${dir}/before-feral-motion.js'`));
for(const name of ['capture.mjs','live-check.mjs'])fs.writeFileSync(`${dir}/${name}`,fs.readFileSync(`review/feral-arms-GP19849/${name}`,'utf8').replaceAll('review/feral-arms-GP19849',dir));
fs.writeFileSync(`${dir}/motion.test.mjs`,fs.readFileSync('review/feral-arms-GP19849/motion.test.mjs','utf8'));
console.log('Saved current Feral baseline and prepared the next preview.');
