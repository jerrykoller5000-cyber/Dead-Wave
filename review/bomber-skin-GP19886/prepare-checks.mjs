import fs from 'node:fs';
for(const name of ['performance','death-check']){const src=fs.readFileSync('review/bomber-GP19884/'+name+'.mjs','utf8').replaceAll("review/bomber-GP19884","review/bomber-skin-GP19886");fs.writeFileSync('review/bomber-skin-GP19886/'+name+'.mjs',src,'utf8');}
