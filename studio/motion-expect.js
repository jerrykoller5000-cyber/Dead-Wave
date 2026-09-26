// studio/motion-expect.js — what a preset must do to each battery hit, written in the preset (D-42).
// Claude's (studio/*).
//
// A preset's "expect" is the part of its reaction Jerry has approved, as a list the tests can check:
//
//   "expect": [
//     { "hit": "rifle", "want": "flinch" },
//     { "hit": "shotgun-close", "from": "back", "want": "down", "note": "shot in the back, it pitches over" }
//   ]
//
// `hit` is a battery hit (studio/motion-battery.js: rifle, shotgun-far, shotgun-close, machete,
// brute-swing, grenade, kill), `from` is front (the default), back or side, and `want` is none, flinch,
// stagger, down or dead. `note` says why, for the next agent. An agent tuning a preset changes its
// numbers until the battery agrees again; changing an expectation is changing what Jerry approved,
// so it goes to the lead for review (AGENTS.md rule 13).
import { BATTERY, BATTERY_NAMES, SIDES, OUTCOMES, runBattery, resolvePreset, presetRef } from './motion-battery.js';
import { loadMotion } from './motion.js';

export const EXPECT_FIELDS = ['hit', 'from', 'want', 'note'];

// Every problem as a sentence, as validateMotion does, so an agent can fix an entry from the error.
export function validateExpect(list) {
  const errs = [];
  if (list === undefined) return errs;
  if (!Array.isArray(list)) return ['"expect" is a list of { "hit": "<battery hit>", "want": "<outcome>" }'];
  const seen = new Map();
  list.forEach((e, i) => {
    const at = `expect[${i}]`;
    if (!e || typeof e !== 'object' || Array.isArray(e)) { errs.push(`${at} must be an object like { "hit": "rifle", "want": "flinch" }`); return; }
    for (const k of Object.keys(e)) if (!EXPECT_FIELDS.includes(k)) errs.push(`${at}.${k} is not a field: an entry has ${EXPECT_FIELDS.join(', ')}`);
    const hitOk = BATTERY_NAMES.includes(e.hit), wantOk = OUTCOMES.includes(e.want);
    if (!hitOk) errs.push(`${at}.hit ${e.hit === undefined ? 'is missing' : JSON.stringify(e.hit) + ' is not a battery hit'}: the hits are ${BATTERY_NAMES.join(', ')}`);
    if (!wantOk) errs.push(`${at}.want ${e.want === undefined ? 'is missing' : JSON.stringify(e.want) + ' is not an outcome'}: the outcomes are ${OUTCOMES.join(', ')}`);
    if (e.from !== undefined && !SIDES.includes(e.from)) errs.push(`${at}.from ${JSON.stringify(e.from)} is not a side: a hit comes from the ${SIDES.join(', the ')}`);
    if (e.note !== undefined && typeof e.note !== 'string') errs.push(`${at}.note is a sentence (a string)`);
    if (hitOk && wantOk) {
      const kill = BATTERY.find((b) => b.name === e.hit).kill;
      if (kill && e.want !== 'dead') errs.push(`${at}: "kill" always ends "dead", so it can't want "${e.want}"`);
      if (!kill && e.want === 'dead') errs.push(`${at}: only "kill" ends "dead"; ${e.hit} wants none, flinch, stagger or down`);
    }
    if (hitOk) {
      const key = `${e.hit} from the ${e.from || 'front'}`;
      if (seen.has(key)) errs.push(`${at} says ${key} again (first at expect[${seen.get(key)}]): say each once`);
      else seen.set(key, i);
    }
  });
  return errs;
}

const plural = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;

// Why a run came out as it did, in the preset's own numbers, so an agent knows which one to change.
// A hit at or over its kind's knockdown drops the body at once; below it, the body steps once it's
// balance.step off balance and falls past balance.fall or after balance.steps steps.
export function explain(run, preset) {
  const p = preset.format ? preset : loadMotion(preset);
  const h = p.hits[run.kind], b = p.balance;
  const pw = run.power * h.scale / p.mass;
  const hitIs = `this hit is ${run.power} × hits.${run.kind}.scale ${h.scale} / mass ${p.mass} = ${+pw.toFixed(2)} against hits.${run.kind}.knockdown ${h.knockdown}`;
  switch (run.outcome) {
    case 'dead': return `killed${run.settled ? `; it settled ${run.time} s after the hit` : ''}`;
    case 'none': return 'it never woke (a full pool refuses a hit)';
    case 'down':
      if (!run.kill && pw >= h.knockdown) return `it fell at once: ${hitIs}`;
      return `it fell off balance after ${plural(run.steps, 'step')} (most off balance ${run.offBalance} m; balance.fall ${b.fall}, balance.steps ${b.steps}); ${hitIs}`;
    case 'stagger':
      return `${plural(run.steps, 'step')}; most off balance ${run.offBalance} m (it steps at balance.step ${b.step}, falls at balance.fall ${b.fall}); ${hitIs}${run.recovered ? `; itself again ${run.time} s after the hit` : '; not recovered within the run'}`;
    default:
      return `no step; most off balance ${run.offBalance} m (it steps at balance.step ${b.step}); ${hitIs}${run.recovered ? `; itself again ${run.time} s after the hit` : '; not recovered within the run'}`;
  }
}

// Runs the battery hits a preset expects and says, for each, whether it did what it should.
// Returns { preset, version, errors (the entries' problems), results, failures (sentences) }.
export function checkExpect(ref, opts = {}) {
  const json = resolvePreset(ref);
  const name = `${presetRef(json)} v${json.version || 1}`;
  const list = json.expect || [];
  const errors = validateExpect(json.expect).map((e) => `${name}: ${e}`);
  if (errors.length || !list.length) return { preset: presetRef(json), version: json.version || 1, errors, results: [], failures: [...errors] };
  const preset = loadMotion(json);
  // Only the outcome is checked, so a run stops once it can't change: at the fall or the kill. The
  // report still plays each hit through to the get-up or the settle for its numbers.
  const until = opts.until || ((name) => name === 'fall' || name === 'dead');
  const bat = runBattery(json, { ...opts, until, entries: list.map((e) => ({ hit: e.hit, from: e.from || 'front' })) });
  const results = list.map((e, i) => {
    const run = bat.runs[i];
    const ok = run.outcome === e.want;
    const what = `${e.hit} from the ${e.from || 'front'}`;
    const sentence = ok
      ? `${what}: ${run.outcome}, as expected`
      : `${name}: ${what} should be "${e.want}" but it was "${run.outcome}": ${explain(run, preset)}.`;
    return { hit: e.hit, from: e.from || 'front', want: e.want, got: run.outcome, ok, note: e.note || null, sentence, run };
  });
  return { preset: presetRef(json), version: json.version || 1, errors, results, failures: results.filter((r) => !r.ok).map((r) => r.sentence) };
}
