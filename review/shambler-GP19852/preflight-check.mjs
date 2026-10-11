import fs from 'node:fs';import assert from 'node:assert/strict';import {scan,violations} from '../../tools/check-players.mjs';
const current=fs.readFileSync('index.html','utf8');
const without=current.split('\n').filter(l=>!l.includes('prepareShamblerFeet')&&!l.includes('resetShamblerMotion')&&!l.includes('applyShamblerMotion')).join('\n');
const currentFailures=violations(scan(current)),withoutFailures=violations(scan(without));
assert.deepEqual(currentFailures.map(v=>[v.name,v.text]),withoutFailures.map(v=>[v.name,v.text]));
const proof={sameWithoutGP19852:true,currentFailures,withoutFailures};fs.writeFileSync('review/shambler-GP19852/preflight-proof.json',JSON.stringify(proof,null,2));
console.log('PASS: same '+currentFailures.length+' unrelated preflight violations with and without GP19852 hooks.');
