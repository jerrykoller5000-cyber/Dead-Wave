import fs from 'node:fs';
function edit(path, fn) { const old=fs.readFileSync(path,'utf8'), next=fn(old); if(fs.readFileSync(path,'utf8')!==old)throw Error(path+' changed');fs.writeFileSync(path,next,'utf8'); }
function replace(s,a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,80));return s.replace(a,b);}
edit('core/takes.js', s=>{
  s="import { isZombieDeathTake, scheduleDeathCryFade } from '../ui/zombie-death-envelope.js';\n"+s;
  return replace(s,'    src.start(ctx.currentTime + Math.max(0, when || 0));',`    const start = ctx.currentTime + Math.max(0, when || 0);
    const deathEnd = isZombieDeathTake(id) ? scheduleDeathCryFade(g.gain, start, t.seconds / src.playbackRate.value, g.gain.value) : null;
    src.start(start);
    if (deathEnd != null) src.stop(deathEnd + .02);`);
});
edit('core/audio.js', s=>{
  s="import { scheduleDeathCryFade } from '../ui/zombie-death-envelope.js';\n"+s;
  s=replace(s,'  let routeBus = null;',`  let routeBus = null;
  // Only the current death cry, including its wet tail, shares this envelope.
  let deathRoute = null;
  const cryStop = at => deathRoute ? Math.min(at, deathRoute.end + .02) : at;`);
  s=replace(s,'    g.connect(reverbNode);',`    if (deathRoute) {
      if (!deathRoute.wet) {
        const wet = ctx.createGain(), verb = ctx.createConvolver();
        verb.buffer = reverbNode.buffer; verb.normalize = reverbNode.normalize;
        verb.connect(wet); wet.connect(sfxGain);
        scheduleDeathCryFade(wet.gain, deathRoute.start, 2, reverbGain.gain.value);
        deathRoute.wet = wet; deathRoute.verb = verb;
      }
      g.connect(deathRoute.verb); deathRoute.sends.push(g);
    } else g.connect(reverbNode);`);
  // Limit actual sources too: inaudible layers must not keep running after the fade.
  for(const a of ['osc.stop(t0 + dur + 0.02)','src.stop(t0 + dur + 0.02)','src.stop(t0 + dur + .025)','vb.stop(t0 + dur + 0.05)','air.stop(t0+dur+.05)','o.stop(t0 + dur + 0.05)','lfo.stop(t0+dur+.05)']) {
    // The generic o.stop form occurs elsewhere: edit only the zombie voice section.
    const at=a.slice(a.indexOf('(')+1,-1), b=a.slice(0,a.indexOf('('))+'(cryStop('+at+'))';
    if(a.startsWith('o.stop')){const i=s.indexOf('  function deadVoice(');s=s.slice(0,i)+replace(s.slice(i),a,b);}else s=replace(s,a,b);
  }
  s=replace(s,'    const t0 = c.currentTime + when;\n    const osc', '    const t0 = c.currentTime + when;\n    if (deathRoute && t0 >= deathRoute.end) return;\n    const osc');
  s=replace(s,'    const t0 = c.currentTime + when;\n    const src', '    const t0 = c.currentTime + when;\n    if (deathRoute && t0 >= deathRoute.end) return;\n    const src');
  s=replace(s,'    const t0 = c.currentTime + when, dur = a.dur;', '    const t0 = c.currentTime + when, dur = a.dur;\n    if (deathRoute && t0 >= deathRoute.end) return;');
  s=replace(s,'      const dur = rr(spec.dur[0], spec.dur[1]), f0', '      if (deathRoute && t0 >= deathRoute.end) continue;\n      const dur = rr(spec.dur[0], spec.dur[1]), f0');
  s=replace(s,"    const call = chooseZombieVoice(type,state,emitter);",`    if (state !== 'death') return synthZombieCry(type, state, v, pan, when, emitter);
    const c = ensure(); if (!c || muted) return false;
    const previousBus = routeBus, previousDeath = deathRoute;
    const dry = c.createGain(); dry.connect(outBus());
    const start = c.currentTime + Math.max(0, when);
    const scope = { dry, start, end: scheduleDeathCryFade(dry.gain, start, 2), wet: null, verb: null, sends: [] };
    routeBus = dry; deathRoute = scope;
    try { return synthZombieCry(type, state, v, pan, when, emitter); }
    finally {
      routeBus = previousBus; deathRoute = previousDeath;
      setTimeout(() => { for (const node of [dry, scope.wet, scope.verb, ...scope.sends]) { try { node?.disconnect(); } catch (_) {} } }, (Math.max(0, when) + 2.2) * 1000);
    }
  }
  function synthZombieCry(type, state, v, pan, when, emitter) {
    const call = chooseZombieVoice(type,state,emitter);`);
  return s;
});
