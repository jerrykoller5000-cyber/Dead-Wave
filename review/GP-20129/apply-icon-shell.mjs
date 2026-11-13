import fs from 'node:fs';
import crypto from 'node:crypto';
const file=new URL('../../index.html',import.meta.url),source=fs.readFileSync(file,'utf8'),hash=s=>crypto.createHash('md5').update(s).digest('hex');
const anchor="    import { mountArmory } from './ui/armory.js';",added="    import { WEAPON_ICONS as MODEL_WEAPON_ICONS } from './ui/weapon-icons.js';";
if(source.split(anchor).length!==2||source.includes(added))throw Error('Import anchor changed or already integrated');
const begin=source.indexOf('const WHEEL_ICONS = {'),end=source.indexOf('\n    };',begin);
if(begin<0||end<0)throw Error('Wheel object boundary changed');
const original=source.slice(begin,end),oldEntries={},keys=['pistol','uzi','revolver','m4','ak','shotgun','aa12','sniper','launcher','minigun','flamer','chainsaw'];let wheel=original;
for(const kind of keys){const re=new RegExp('^      '+kind+": '[^\\r\\n]*',",'gm'),matches=[...wheel.matchAll(re)];if(matches.length!==1)throw Error('Expected one weapon entry: '+kind);oldEntries[kind]=matches[0][0];wheel=wheel.replace(re,'      '+kind+': MODEL_WEAPON_ICONS.'+kind+',');}
let updated=source.slice(0,begin)+wheel+source.slice(end);updated=updated.replace(anchor,anchor+'\n'+added);
let restored=updated.replace('\n'+added,'');for(const kind of keys)restored=restored.replace('      '+kind+': MODEL_WEAPON_ICONS.'+kind+',',oldEntries[kind]);
if(restored!==source)throw Error('Change escaped the approved import and twelve entries');
if(hash(fs.readFileSync(file))!==hash(source))throw Error('Shell changed under us; re-read and merge');
fs.writeFileSync(file,updated,'utf8');
const proof={at:new Date().toISOString(),beforeMd5:hash(source),afterMd5:hash(updated),importsAdded:1,weaponEntries:keys,allOtherBytesPreserved:true,oldEntries};
fs.writeFileSync(new URL('icon-shell-proof.json',import.meta.url),JSON.stringify(proof,null,2));console.log(JSON.stringify({...proof,oldEntries:undefined}));
