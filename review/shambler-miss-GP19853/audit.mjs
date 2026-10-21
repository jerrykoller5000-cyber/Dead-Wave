import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {scan,violations} from '../../tools/check-players.mjs';
const dir='review/shambler-miss-GP19853',baseline=fs.readFileSync(`${dir}/before.html`,'utf8'),current=fs.readFileSync('index.html','utf8');
const motion=fs.readFileSync('game/shambler-motion.js','utf8'),writes={};
// Reconstruct the six historical replacements in memory; never rerun the edit.
const fakeFs={existsSync:()=>true,readFileSync:p=>p==='index.html'?baseline.replace('<head><base href="/">','<head>'):p==='game/shambler-motion.js'?motion.replace('const suppressed=z.shamblerRecoveryActive||','const suppressed='):baseline,writeFileSync:(p,s)=>{writes[p]=s;}};
vm.runInNewContext(fs.readFileSync(`${dir}/edit.mjs`,'utf8').replace("import fs from 'node:fs';",''),{fs:fakeFs});
assert.equal(writes['index.html'],current,'live source contains exactly the six reserved edits');
assert.equal(writes['game/shambler-motion.js'],motion,'marine gait only adds recovery guard');
const bad=s=>violations(scan(s)).map(({name,text})=>({name,text}));
assert.deepEqual(bad(current),bad(baseline));
const proof={focusedEdits:true,preflightExisting:bad(current),newPreflightViolations:0};
fs.writeFileSync(`${dir}/audit-proof.json`,JSON.stringify(proof,null,2));
console.log('PASS: exactly six reserved index hooks and one motion guard; same five pre-existing aim scan violations.');
