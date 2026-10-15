import fs from 'node:fs';
import {createHash} from 'node:crypto';
const dir='review/demon-fire-GP19923';fs.mkdirSync(dir,{recursive:true});
const source=fs.readFileSync('game/zombie-ability-visuals.js');
fs.writeFileSync(dir+'/before.js',source,{flag:'wx'});fs.writeFileSync(dir+'/before.sha256',createHash('sha256').update(source).digest('hex'),{flag:'wx'});
