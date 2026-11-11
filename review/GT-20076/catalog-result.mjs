import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const phase=process.argv[2];assert(/^[a-z0-9-]+$/.test(phase));
const load=name=>readFile(new URL('./'+phase+'/'+name,import.meta.url),'utf8');
const data=JSON.parse(await load('audit.json')),slings=JSON.parse(await load('slings.json')),lines=(await load('audit.txt')).trim().split('\n');
const builds=['pistol','revolver','uzi','m4','ak','aa12','shotgun','sniper','minigun','launcher','flamer','chainsaw'];
const print=(id,r)=>[id,r.parts+' pieces',r.loose.length+' detached groups',r.unseated.length+' missing intended contacts',r.overlaps.length+' other intersections',r.detailBreaches.length+' detail breaches'].join(' | ');
for(const id of builds){assert(data[id] && lines.some(l=>l.startsWith('PASS '+id+' (')||l.startsWith('FAIL '+id+' (')));console.log(print(id,data[id]));}
console.log(print('frag-grenade',data['frag-grenade']));
const unresolved=builds.filter(id=>lines.some(l=>l.startsWith('FAIL '+id+' (')));
const count=prefix=>lines.filter(l=>l.startsWith(prefix)).length;
console.log('Base models covered',builds.length,'; base models still red',unresolved.length,';',unresolved.join(', '));
console.log('All checks',count('PASS '),'pass',count('FAIL '),'fail; all model/loadout assemblies',Object.keys(data).length);
console.log('Harness geometry fixtures',count('PASS geometry fixture'),'pass,',count('FAIL geometry fixture'),'fail');
console.log('Sling states',Object.keys(slings).length,';',count('PASS sling '),'pass,',count('FAIL sling '),'fail');
