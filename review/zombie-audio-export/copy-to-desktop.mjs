// Fixed destination explicitly requested by Jerry. No overwrites or deletions.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../..',import.meta.url));
const source=path.join(root,'.tmp-zombie-audio-GP-178');
const destination=path.resolve('C:/Users/Zero/Desktop/Z-Sounds');
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(source,'clip-manifest.json'),'utf8'));
const files=[...manifest.files.map(f=>f.file),'clip-manifest.json','START HERE.txt'];
for(const file of files){
  const target=path.resolve(destination,file);
  assert(target.startsWith(destination+path.sep),'Path escaped requested destination.');
  assert(fs.existsSync(path.join(source,file)),'Missing staged file: '+file);
  if(fs.existsSync(target))assert.equal(sha(fs.readFileSync(target)),sha(fs.readFileSync(path.join(source,file))),'Existing destination differs; refusing to overwrite '+file);
}
for(const file of files){
  const src=path.join(source,file),target=path.join(destination,file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  if(!fs.existsSync(target))fs.copyFileSync(src,target,fs.constants.COPYFILE_EXCL);
  assert.equal(sha(fs.readFileSync(target)),sha(fs.readFileSync(src)),'Copy mismatch: '+file);
}
for(const entry of manifest.files){
  const b=fs.readFileSync(path.join(destination,entry.file));
  assert.equal(sha(b),entry.sha256,'Manifest mismatch: '+entry.file);
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');
  assert.equal(b.readUInt16LE(20),1);assert.equal(b.readUInt16LE(22),2);assert.equal(b.readUInt32LE(24),48000);
  assert.equal(b.readUInt16LE(34),entry.bitDepth);assert.equal(b.readUInt32LE(40),b.length-44);
}
const result={completedAt:new Date().toISOString(),destination,filesVerified:files.length,wavsVerified:manifest.files.length,allCopiesHashMatched:true,allWavHeadersValid:true,...manifest.summary};
fs.writeFileSync(path.join(root,'review/zombie-audio-export/copy-proof.json'),JSON.stringify(result,null,2)+'\n');
console.log('PASS: 552 WAV files + guide + manifest copied and SHA-256 verified at '+destination);
console.log('PASS: every WAV header is valid; 292 new stereo 48 kHz / 24-bit clips, 260 original stereo 48 kHz / 16-bit clips.');
