import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {text} from './strings.js';
test('new death causes use keyed copy and persist once alongside older discoveries',()=>{
 const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('    const DEATH_WAYS = {'),source.indexOf('    function damagePlayer('));
 const values=new Map([['tt_death_log','["tree"]']]);
 const ctx={dwText:text,localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}};
 runInNewContext(code+';globalThis.ways=DEATH_WAYS;',ctx);
 for(const cause of ['lightning','rabbit']){
  assert.equal(ctx.ways[cause].label,text('death.'+cause+'.name'));
  assert.equal(ctx.ways[cause].line,text('death.'+cause+'.description'));
  assert(ctx.recordDeath(cause).isNew);assert.equal(ctx.recordDeath(cause).isNew,false);
 }
 assert.deepEqual(JSON.parse(values.get('tt_death_log')),['tree','lightning','rabbit']);
 assert.equal(ctx.recordDeath('unknown').isNew,undefined);
 for(const key of ['pickup.insulatedBoots','pickup.insulatedBootsSub','lightning.saved','lightning.savedSub','pickup.holyGrenade','pickup.holyGrenadeSub','holy.pin','holy.pinSub','rabbit.killed','rabbit.killedSub']) assert(text(key).length>0);
 assert.match(text('pickup.holyGrenadeSub'),/G/);
});
