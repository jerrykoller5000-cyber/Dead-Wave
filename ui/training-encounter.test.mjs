import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrainingEncounter, createTrainingEncounters, TRAINING_TRACKS, trainingIntroKinds } from './training-encounter.js';
function setup(load = async () => ({ duration: 125.6 })) {
  const nodes = [];
  const ctx = { currentTime: 10, createGain() { return { gain: { value: 0,
    cancelAndHoldAtTime() {}, linearRampToValueAtTime(value, time) { this.target = { value, time }; } },
    connect() {}, disconnect() {} }; }, createBufferSource() {
    const node = { connect() {}, disconnect() {}, start() { this.started = true; }, stop(time) { this.stopAt = time ?? 0; } };
    nodes.push(node); return node;
  } };
  return { ctx, nodes, music: createTrainingEncounter(ctx, {}, load) };
}
test('preloads without playing; repeated active updates do not restart; fades when last demon dies', async () => {
  const { music, nodes, ctx } = setup(); await music.ready;
  assert.equal(nodes.length, 0); music.setActive(true); music.setActive(true);
  assert.equal(nodes.length, 1); assert.equal(nodes[0].loop, true);
  music.setActive(false); assert.equal(music.state().playing, false); assert.equal(music.state().fading, true);
  assert.equal(nodes[0].stopAt, ctx.currentTime + 2.02);
  nodes[0].onended(); assert.equal(music.state().fading, false);
});
test('cancel while decoding never starts stale encounter; later summon starts from beginning', async () => {
  let finish; const { music, nodes } = setup(() => new Promise(r => { finish = r; }));
  music.setActive(true); await Promise.resolve(); music.setActive(false);
  finish({ duration: 125.6 }); await music.ready; assert.equal(nodes.length, 0);
  music.setActive(true); assert.equal(nodes.length, 1); assert(nodes[0].started);
});
test('a fresh encounter during fade creates a fresh source and preserves the old stop', async () => {
  const { music, nodes } = setup(); await music.ready;
  music.setActive(true); music.setActive(false); music.setActive(true);
  assert.equal(nodes.length, 2); nodes[0].onended(); assert.equal(music.state().playing, true);
  music.dispose(); assert.equal(nodes[1].stopAt, 0); assert.equal(music.state().playing, false);
});
test('leaving Training during decode prevents late playback', async () => {
  let finish; const { music, nodes } = setup(() => new Promise(r => { finish = r; }));
  music.setActive(true); await Promise.resolve(); music.dispose();
  finish({ duration: 125.6 }); await music.ready;
  music.setActive(true); assert.equal(nodes.length, 0);
});
test('each labeled type preloads without playing and starts its own looping source on release', async () => {
  const { ctx, nodes } = setup(); const requested = [];
  const music = createTrainingEncounters(ctx, {}, async (c, kind) => { requested.push(kind); return { duration: 17, kind }; });
  for (const kind of TRAINING_TRACKS) {
    const track = music.prepare(kind); await track.ready;
    assert.equal(track.state().playing, false);
    music.sync([kind, kind]); assert.equal(music.state().selected, kind);
    assert.equal(nodes.at(-1).buffer.kind, kind); assert.equal(nodes.at(-1).loop, true);
    const count = nodes.length; music.sync([kind]); assert.equal(nodes.length, count);
    music.sync([]); assert.equal(track.state().playing, false); assert.equal(track.state().fading, true);
  }
  assert.deepEqual(requested, TRAINING_TRACKS); music.dispose();
});
test('Screamer summons do not take over its track or hold its music after its death', async () => {
  const { ctx } = setup();
  const music = createTrainingEncounters(ctx, {}, async () => ({ duration: 20 }));
  await music.prepare('screamer').ready;
  const lead={typeKey:'screamer',trainingZ:true,trainingIntro:true,alive:true};
  const summons=['shambler','feral'].map(typeKey=>({typeKey,trainingZ:true,alive:true}));
  music.sync(trainingIntroKinds([lead,...summons])); assert.equal(music.state().selected, 'screamer');
  lead.alive=false;
  music.sync(trainingIntroKinds([lead,...summons])); assert.equal(music.state().selected, null);
  assert.equal(music.state().tracks.screamer.fading, true);
  assert.equal(music.state().tracks.shambler, undefined);
  assert.equal(music.prepare('caveguard'), undefined); music.dispose();
});
test('only living Training gate arrivals contribute intro tracks',()=>{
  assert.deepEqual(trainingIntroKinds([
    {typeKey:'shambler',trainingZ:true,trainingIntro:true,alive:true},
    {typeKey:'feral',trainingZ:true,trainingIntro:true,alive:false},
    {typeKey:'spitter',trainingIntro:true,alive:true},
    {typeKey:'shambler',trainingZ:true,alive:true}
  ]),['shambler']);
});
