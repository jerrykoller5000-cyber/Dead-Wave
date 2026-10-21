import fs from 'node:fs';import crypto from 'node:crypto';
const files=['index.html','studio/marine-dive.js','studio/marine-dive-pose.js','studio/marine-dive-contact.js','studio/marine-dive.test.mjs','tools/tests/t253.js'];
const source=files.map(path=>{const bytes=fs.readFileSync(path);return {path,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bom:bytes[0]===239&&bytes[1]===187&&bytes[2]===191};});
if(source.some(s=>s.bom))throw Error('unexpected UTF8 BOM');
const screenshots=['before-matched-flight.png','after-matched-flight.png','before-matched-recovery.png','after-matched-recovery.png'].map(p=>'review/dive-GP19915/'+p);
if(screenshots.some(p=>!fs.existsSync(p)))throw Error('missing matched screenshot');
fs.writeFileSync('review/dive-GP19915/final-manifest.json',JSON.stringify({at:new Date().toISOString(),source,screenshots},null,2));console.log('PASS UTF8/no BOM, production hashes, four matched camera shots');
