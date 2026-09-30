import test from 'node:test';
import assert from 'node:assert/strict';
import { supplyNoticeText } from './supply-notice.js';

const base = { type:'supply-drop', x:12, z:-8, source:'radio', breather:false };
test('each supply-drop phase has keyed compact copy', () => {
  assert.equal(supplyNoticeText({ ...base, phase:'inbound', bearing:'north' }), 'SUPPLY DROP INBOUND · coming down north of you');
  assert.equal(supplyNoticeText({ ...base, phase:'inbound', breather:true }), 'BREATHER CRATE INBOUND');
  assert.equal(supplyNoticeText({ ...base, phase:'landed' }), 'Supply crate landed');
  assert.equal(supplyNoticeText({ ...base, phase:'expired' }), 'Supply crate lost');
  assert.equal(supplyNoticeText({ ...base, phase:'claimed', ammoOffered:true, medpensOffered:true, rounds:42, pens:2 }), 'SUPPLY DROP · Ammo restocked · +2 MedPens');
  assert.equal(supplyNoticeText({ ...base, phase:'claimed', ammoOffered:true, medpensOffered:true, rounds:0, pens:0 }), 'SUPPLY DROP · Ammo full · MedPens full');
  assert.equal(supplyNoticeText({ ...base, phase:'claimed', medpensOffered:true, pens:2, grenades:2 }), 'SUPPLY DROP · +2 MedPens · +2 grenades');
  assert.equal(supplyNoticeText({ ...base, phase:'claimed', blueprint:'light' }), 'SUPPLY DROP · Turret blueprint found');
});

test('unrelated, incomplete and unknown events do not produce notices', () => {
  assert.equal(supplyNoticeText({type:'alarm-started',x:0,z:0}), '');
  assert.equal(supplyNoticeText({...base,x:NaN,phase:'inbound'}), '');
  assert.equal(supplyNoticeText({...base,phase:'missing'}), '');
});
