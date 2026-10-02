import test from 'node:test';
import assert from 'node:assert/strict';
import {createIntakeReadout,createIntakeDisplay} from './skull-intake.js';
const accepted={type:'deposit-accepted',runId:1,receiptId:'a',count:3,value:37};
test('the intake displays skull value until the matching payment completes',()=>{
 const r=createIntakeReadout();r.receive({type:'run-reset',runId:1});r.receive(accepted);r.setPhase('process');
 assert.equal(r.read().value,'37 SKULL VALUE');
 r.setPhase('green');assert.equal(r.read().value,'SKULLS → CASH');
 r.receive({...accepted,type:'deposit-complete'});assert.equal(r.read().value,'+37 CASH');
 assert.equal(r.read().detail,'3 SKULLS BANKED');
 r.setPhase('idle');assert.equal(r.read().value,'SKULLS → CASH');
});
test('stale, unrelated and malformed receipts cannot claim payment',()=>{
 const r=createIntakeReadout();r.receive({type:'run-reset',runId:1});r.receive(accepted);r.setPhase('green');
 for(const patch of [{runId:0},{receiptId:'wrong'},{count:4},{value:999}]){r.receive({...accepted,type:'deposit-complete',...patch});assert.equal(r.read().value,'SKULLS → CASH');}
 r.receive({...accepted,type:'deposit-complete'});r.receive(accepted);assert.equal(r.read().value,'+37 CASH');
 r.receive({type:'run-reset',runId:2});r.receive({...accepted,type:'deposit-complete'});assert.equal(r.read().value,'SKULLS → CASH');
});
test('a second accepted batch replaces the prior paid receipt',()=>{
 const r=createIntakeReadout();r.receive({type:'run-reset',runId:1});r.receive(accepted);r.receive({...accepted,type:'deposit-complete'});
 r.receive({...accepted,receiptId:'b',count:1,value:12});r.setPhase('process');assert.equal(r.read().value,'12 SKULL VALUE');
 r.receive({...accepted,type:'deposit-complete'});r.setPhase('green');assert.equal(r.read().value,'SKULLS → CASH');
 r.receive({...accepted,receiptId:'b',count:1,value:12,type:'deposit-complete'});assert.equal(r.read().detail,'1 SKULL BANKED');assert.equal(r.read().value,'+12 CASH');
});
test('unchanged frames do not repaint; receipt and phase changes refresh the display',()=>{
 const bus=new EventTarget(),ctx={fillRect(){},strokeRect(){},fillText(){}};
 const display=createIntakeDisplay({bus,doc:{createElement:()=>({getContext:()=>ctx})}});
 const send=detail=>bus.dispatchEvent(new CustomEvent('dw-game',{detail}));
 assert.equal(display.update('idle'),false);
 send({type:'run-reset',runId:1});send(accepted);
 assert.equal(display.update('process'),true);assert.equal(display.update('process'),false);
 send({...accepted,type:'deposit-complete'});assert.equal(display.update('green'),true);
 assert.equal(display.read().value,'+37 CASH');assert.equal(display.update('green'),false);
 send({type:'run-reset',runId:2});assert.equal(display.update('idle'),true);
 assert.equal(display.read().value,'SKULLS → CASH');
});
