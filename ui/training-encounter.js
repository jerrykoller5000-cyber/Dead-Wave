// GP-192: recorded encounter music shares Training's existing music bus.
const recordings = new WeakMap();
export const TRAINING_TRACKS = Object.freeze(['shambler', 'feral', 'leaper', 'spider', 'drowned', 'military', 'brute', 'spitter', 'screamer', 'bomber', 'demon', 'colossus', 'guardian']);
// Only the group called through the gate owns an intro; summoned adds do not.
export function trainingIntroKinds(zombies) {
  return zombies.filter(z => z.trainingZ && z.trainingIntro && z.alive).map(z => z.typeKey);
}
function recording(ctx, kind = 'demon') {
  if (!recordings.has(ctx)) recordings.set(ctx, new Map());
  const cache = recordings.get(ctx);
  if (!cache.has(kind)) cache.set(kind, fetch(new URL(`./audio/training-${kind}.ogg`, import.meta.url)).then(r => {
    if (!r.ok) throw new Error(`${kind} intro: HTTP ${r.status}`);
    return r.arrayBuffer();
  }).then(bytes => ctx.decodeAudioData(bytes)));
  return cache.get(kind);
}
export function createTrainingEncounter(ctx, output, load = recording) {
  let wanted = false, disposed = false, buffer = null, current = null, error = null;
  const voices = new Set();
  const ramp = (gain, value, seconds) => {
    gain.cancelAndHoldAtTime(ctx.currentTime);
    gain.linearRampToValueAtTime(value, ctx.currentTime + seconds);
  };
  function start() {
    if (!wanted || disposed || !buffer || current) return;
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = buffer; source.loop = true; gain.gain.value = 0;
    source.connect(gain); gain.connect(output);
    const voice = { source, gain }; current = voice; voices.add(voice);
    source.onended = () => { voices.delete(voice); source.disconnect(); gain.disconnect(); };
    source.start(); ramp(gain.gain, 1, .12);
  }
  // Created when this type is called: the gate alarm covers decoding.
  const ready = Promise.resolve().then(() => load(ctx)).then(b => { buffer = b; start(); })
    .catch(e => { error = String(e); console.warn('Training intro unavailable', e); });
  return {
    ready,
    setActive(active) {
      if (disposed || wanted === !!active) return;
      wanted = !!active;
      if (wanted) start();
      else if (current) {
        ramp(current.gain.gain, 0, 2);
        current.source.stop(ctx.currentTime + 2.02); current = null;
      }
    },
    state: () => ({ wanted, playing: !!current, looping: !!current?.source.loop, fading: voices.size > (current ? 1 : 0),
      ready: !!buffer, seconds: buffer?.duration || 0, error }),
    dispose() {
      disposed = true; wanted = false; current = null;
      for (const { source, gain } of voices) { source.stop(); source.disconnect(); gain.disconnect(); }
      voices.clear();
    }
  };
}

// One group at a time; the caller passes only eligible gate arrivals.
export function createTrainingEncounters(ctx, output, load = recording) {
  const tracks = new Map(); let selected = null, disposed = false;
  const prepare = kind => {
    if (disposed || !TRAINING_TRACKS.includes(kind)) return;
    if (!tracks.has(kind)) tracks.set(kind, createTrainingEncounter(ctx, output, c => load(c, kind)));
    return tracks.get(kind);
  };
  return {
    prepare,
    sync(kinds) {
      if (disposed) return;
      if (!kinds.includes(selected)) selected = kinds.find(kind => TRAINING_TRACKS.includes(kind)) || null;
      if (selected) prepare(selected);
      for (const [kind, track] of tracks) track.setActive(kind === selected);
    },
    state: () => ({ selected, tracks: Object.fromEntries([...tracks].map(([kind, track]) => [kind, track.state()])) }),
    dispose() { disposed = true; selected = null; for (const track of tracks.values()) track.dispose(); }
  };
}
