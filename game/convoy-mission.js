// GP-19937: the medical convoy's jack and the sleeper in its cab.
// Pure game-time rules. The caller owns input, sound, damage, rendering and rewards.
export const CONVOY = Object.freeze({ beat: 0.75, window: 0.46, pumps: 8,
  warning: 0.5, doorOpen: 1.5, spitAt: 0.3, spitFraction: 0.75 });

export function createConvoyMission(config = {}) {
  const rule = { ...CONVOY, ...config };
  let phase = 'idle', pumps = 0, misses = 0, clock = 0, cuePlayed = false;
  let phaseTime = 0, sleeperAlive = true, spat = false;
  const halfWindow = rule.window / 2;
  const emit = (kind) => ({ kind, pumps, misses });
  const read = () => {
    const untilBeat = rule.beat - clock;
    return { phase, pumps, misses, sleeperAlive, done: phase === 'ready',
      doorOpen: phase === 'open', untilBeat: phase === 'pumping' ? untilBeat : null,
      beatReady: phase === 'pumping' && Math.abs(untilBeat) <= halfWindow,
      pulse: phase === 'pumping' ? Math.max(0, 1 - Math.abs(untilBeat) / (rule.beat * 0.65)) : 0,
      phaseTime };
  };
  const reset = () => { phase = 'idle'; pumps = 0; misses = 0; clock = 0; cuePlayed = false;
    phaseTime = 0; sleeperAlive = true; spat = false; };
  const slip = () => {
    pumps = Math.max(0, pumps - 1);
    misses++;
    const events = [emit('slip'), emit('cab-bang')];
    clock = 0; cuePlayed = false;
    if (misses >= 2 && sleeperAlive) {
      phase = 'warning'; phaseTime = 0; events.push(emit('heavy-thump'));
    }
    return events;
  };
  const start = () => {
    if (phase !== 'idle') return [];
    phase = 'pumping'; clock = 0; cuePlayed = false;
    return [emit('start')];
  };
  const tap = () => {
    if (phase === 'idle') return start();
    if (phase !== 'pumping') return [];
    if (Math.abs(clock - rule.beat) > halfWindow) return slip();
    pumps++; misses = 0; clock = 0; cuePlayed = false;
    const events = [emit('pump')];
    if (pumps >= rule.pumps) { pumps = rule.pumps; phase = 'ready'; events.push(emit('ready')); }
    return events;
  };
  const killSleeper = () => {
    if (phase !== 'open' || !sleeperAlive) return [];
    sleeperAlive = false;
    return [emit('sleeper-killed')];
  };
  const step = (dt, { engaged = true } = {}) => {
    const events = [];
    let left = Math.max(0, Number.isFinite(dt) ? dt : 0);
    // Fixed event boundaries make a dropped frame obey the same rhythm and warning.
    for (let guard = 0; left > 1e-8 && guard < 32; guard++) {
      if (phase === 'pumping') {
        if (!engaged) break;
        const boundary = cuePlayed ? rule.beat + halfWindow : rule.beat - halfWindow;
        const used = Math.min(left, Math.max(0, boundary - clock));
        clock += used; left -= used;
        if (clock + 1e-8 < boundary) break;
        if (!cuePlayed) { cuePlayed = true; events.push(emit('beat-cue')); }
        else {
          // An unpressed beat is harmless: only a mistimed key press slips the jack.
          // Keep the oscillator in time so the next green light and tick is .75 s later.
          clock -= rule.beat; cuePlayed = false;
        }
      } else if (phase === 'warning') {
        const used = Math.min(left, Math.max(0, rule.warning - phaseTime));
        phaseTime += used; left -= used;
        if (phaseTime + 1e-8 >= rule.warning) {
          phase = 'open'; phaseTime = 0; spat = false; events.push(emit('door-open'));
        } else break;
      } else if (phase === 'open') {
        const next = !spat && sleeperAlive ? rule.spitAt : rule.doorOpen;
        const used = Math.min(left, Math.max(0, next - phaseTime));
        phaseTime += used; left -= used;
        if (!spat && sleeperAlive && phaseTime + 1e-8 >= rule.spitAt) {
          spat = true; events.push(emit('spit'));
        } else if (phaseTime + 1e-8 >= rule.doorOpen) {
          phase = 'pumping'; phaseTime = 0; clock = 0; cuePlayed = false; misses = 0;
          events.push(emit('door-close'));
        } else break;
      } else break;
    }
    return events;
  };
  return { read, reset, start, tap, step, killSleeper };
}
