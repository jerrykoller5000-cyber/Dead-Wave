import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
import {RANGE_DRILLS,RANGE_WEAPONS,findDrill,boardKey} from '../../ui/range-drills.js';
const old=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('./ui_range-drills.js.before',import.meta.url),'utf8')).toString('base64'));
test('all retained drill configurations and personal record keys stay byte-for-byte equivalent',()=>{for(const d of RANGE_DRILLS){const before=old.findDrill(d.weapon,d.id);assert.deepEqual(d,before);assert.equal(boardKey(d,'fixture'),old.boardKey(before,'fixture'));}assert.equal(old.RANGE_DRILLS.length-RANGE_DRILLS.length,20);});
test('no retired drill is addressable through public catalog lookup',()=>{for(const d of old.RANGE_DRILLS.filter(d=>!RANGE_WEAPONS.includes(d.weapon)))assert.equal(findDrill(d.weapon,d.id),null);});
