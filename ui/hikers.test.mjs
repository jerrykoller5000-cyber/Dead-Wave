import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {HIKERS,hikerById,loadHikerPortraits} from './hikers.js';

test('six distinct local portraits cover the approved roster without fate spoilers',()=>{
 const expected={'Maya Costa':27,'Theo Marsh':31,'Sam Marsh':22,'Priya Raman':24,'Jonas Weber':29,'Ellis Byrne':34};
 assert.equal(HIKERS.length,6);const hashes=new Set();
 for(const h of HIKERS){
  const person=hikerById(h.id);assert.equal(expected[person.name],person.age);
  assert.doesNotMatch(person.line,/found alive|never found|husk|dead|died/i);
  const bytes=fs.readFileSync(new URL(h.portrait));
  assert.equal(bytes.readUInt16BE(0),0xffd8);assert(bytes.length<70000);
  hashes.add(createHash('sha256').update(bytes).digest('hex'));
 }
 assert.equal(hashes.size,6);assert.equal(hikerById('invented-hiker'),null);
});

test('concurrent poster surfaces load only one shared copy of each portrait',async()=>{
 let requests=0;
 class Picture {set src(value){this.url=value;requests++;queueMicrotask(()=>this.onload());}}
 const first=loadHikerPortraits(Picture),second=loadHikerPortraits(Picture);
 assert.equal(first,second);const images=await first;
 assert.equal(images.size,6);assert.equal(requests,6);
 for(const h of HIKERS)assert.equal(images.get(h.id).url,h.portrait);
 assert.equal(await loadHikerPortraits(Picture),images);
});

test('failed portrait loading reports the identity and allows an explicit retry',async()=>{
 let fail=true;
 class Picture {set src(value){queueMicrotask(()=>fail&&value.includes('ellis-byrne')?this.onerror():this.onload());}}
 await assert.rejects(loadHikerPortraits(Picture),/ellis-byrne/);
 fail=false;assert.equal((await loadHikerPortraits(Picture)).size,6);
});
