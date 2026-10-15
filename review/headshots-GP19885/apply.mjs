import fs from 'node:fs';import crypto from 'node:crypto';import {headshotPatch} from './build-preview.mjs';
const file='index.html',hash=s=>crypto.createHash('sha256').update(s).digest('hex'),before=fs.readFileSync(file,'utf8'),after=headshotPatch(before);
if(hash(fs.readFileSync(file,'utf8'))!==hash(before))throw Error('index changed during patch; rebuild on fresh source');
fs.writeFileSync('review/headshots-GP19885/live-source-before.txt',before,'utf8');fs.writeFileSync(file,after,'utf8');
fs.writeFileSync('review/headshots-GP19885/live-source-proof.json',JSON.stringify({before:hash(before),after:hash(after),narrowPatch:true},null,2));console.log('Focused headshot changes applied to fresh source.');
