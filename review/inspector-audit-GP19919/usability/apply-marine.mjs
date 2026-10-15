import fs from 'node:fs';
import crypto from 'node:crypto';
const file = 'studio/inspector/marine.js';
const before = fs.readFileSync(file, 'utf8');
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
let s = before;
function replace(old, value) {
  if (!s.includes(old) || s.indexOf(old) !== s.lastIndexOf(old)) throw new Error('Expected one match: ' + old.slice(0, 90));
  s = s.replace(old, value);
}
replace("const st = { move: null, loop: true, next: 0, running: false, keys: new Set(), treadmill: false, props: [], token: 0, ko: null };", "const st = { move: null, loop: true, next: 0, running: false, keys: new Set(), treadmill: false, props: [], token: 0, ko: null, abort: new AbortController(), holds: {}, error: null };");
replace("const wait = (sec) => ix.waitGame(sec);", "// Each move owns its pending waits. Switching moves cancels them before any later input can run.\n  const wait = (sec) => ix.waitGame(sec, st.abort.signal);");
replace("async function grenade(hold = 0.4) { if (host.state().akimbo) akimbo(null); if (T.setGrenadesDbg) T.setGrenadesDbg(6); key('keydown', 'KeyG'); await wait(hold); key('keyup', 'KeyG'); }", "async function grenade(hold = 0.4) { if (host.state().akimbo) akimbo(null); if (T.setGrenadesDbg) T.setGrenadesDbg(6); holdKey('KeyG', true); await wait(hold); holdKey('KeyG', false); }");
const start = s.indexOf('  function stop() {');
const end = s.indexOf('  // The desk\'s frame:', start);
if (start < 0 || end < 0) throw new Error('No play block');
s = s.slice(0, start) + `  function reportMoveError(m, e) {
    st.error = String(e && e.message || e);
    if (ix.errors) ix.errors.push({ id: 'marine.' + m.id, error: st.error, stage: 'move' });
    ix.ui && ix.ui.toast('That move did not run: ' + st.error, true);
    console.warn('[inspector] move', m.id, e);
  }
  function stop() {
    const m = st.move;
    st.token++;
    st.abort.abort(); st.abort = new AbortController();
    // The game's blur handler cancels a charging grenade. Releasing G first would throw it.
    if (st.keys.has('KeyG')) window.dispatchEvent(new Event('blur'));
    releaseAll();
    for (const kind of Object.keys(st.holds)) { try { hold(kind, null); } catch (e) { console.warn('[inspector] release hold', kind, e); } }
    if (m && m.stop) { try { m.stop(desk); } catch (e) { console.warn('[inspector] stopping', m.id, e); } }
    if (T.setZoomHeldDbg) T.setZoomHeldDbg(false);
    st.move = null; st.treadmill = false; st.running = false;
  }
  async function runOnce(m, token) {
    if (!m.run) return true;
    st.running = true;
    let ok = true;
    try { await m.run(desk); } catch (e) {
      ok = false;
      if (e.name !== 'AbortError' && token === st.token) reportMoveError(m, e);
    }
    if (token === st.token) st.running = false;
    return ok;
  }
  async function play(id, { loop } = {}) {
    const m = MOVES.find((x) => x.id === id);
    if (!m) throw new Error('no move "' + id + '" (DWInspect.marine.moves())');
    stop(); st.error = null;
    if (loop != null) st.loop = !!loop;
    const token = st.token;
    st.move = m;
    home();
    try {
      if (m.setup) await m.setup(desk);
      if (token !== st.token) return null;
      for (const k of m.keys || []) holdKey(k, true);
      st.treadmill = !!(m.keys && m.keys.some((k) => /Key[WASD]|Arrow/.test(k)));
      if (m.after) await wait(m.after);
      if (token !== st.token) return null;
      st.next = ix.clock.gameTime + (m.every || 1e9);
      const ran = await runOnce(m, token);
      if (token !== st.token) return null;
      if (!ran && st.error) { const error = new Error(st.error); stop(); throw error; }
      return m;
    } catch (e) {
      if (e.name === 'AbortError' || token !== st.token) return null;
      if (!st.error) reportMoveError(m, e);
      stop(); throw e;
    }
  }
` + s.slice(end);
replace("    const G = T.gaitDbg && T.gaitDbg.GAIT;\n    switch (kind) {", `    const G = T.gaitDbg && T.gaitDbg.GAIT;
    if (!['walk', 'run', 'reload', 'knife', 'draw', 'grenade'].includes(kind)) throw new Error('no hold "' + kind + '" (walk, run, reload, knife, draw, grenade)');
    if (u != null) {
      if (kind === 'grenade') {
        if (!Array.isArray(u) || !['grab', 'raise', 'cocked', 'throw', 'back'].includes(u[0]) || !Number.isFinite(+u[1])) throw new Error('grenade hold needs [phase, finite seconds]');
        u = [u[0], Math.max(0, Math.min(0.6, +u[1]))];
      } else {
        if (!Number.isFinite(+u)) throw new Error(kind + ' hold needs a finite phase');
        u = Math.max(0, Math.min(kind === 'draw' ? 1.2 : 1, +u));
      }
    }
    switch (kind) {`);
replace("      case 'walk': if (G) { G.holdU = u == null ? null : +u; G.holdRun = 0; } break;", "      case 'walk': if (!G) throw new Error('the game has no gait hold'); G.holdU = u; G.holdRun = 0; delete st.holds.run; break;");
replace("      case 'run': if (G) { G.holdU = u == null ? null : +u; G.holdRun = u == null ? 0 : 1; } break;", "      case 'run': if (!G) throw new Error('the game has no gait hold'); G.holdU = u; G.holdRun = u == null ? 0 : 1; delete st.holds.walk; break;");
replace("    return kind;\n  }\n  function state()", "    if (u == null) delete st.holds[kind]; else st.holds[kind] = Array.isArray(u) ? [...u] : u;\n    return kind;\n  }\n  function holdState(kind) { const value = st.holds[kind]; return Array.isArray(value) ? [...value] : value ?? null; }\n  function state()");
replace("treadmill: st.treadmill, blade:", "treadmill: st.treadmill, running: st.running, holds: Object.fromEntries(Object.keys(st.holds).map((k) => [k, holdState(k)])), error: st.error, blade:");
replace("Object.assign(desk, { play, stop, frame, hold, state, prepare, setLoop: (on) => { st.loop = !!on; return st.loop; }, get move() { return st.move; }, get loop() { return st.loop; } });", "Object.assign(desk, { play, stop, frame, hold, holdState, state, prepare, setLoop: (on) => { st.loop = !!on; return st.loop; } });\n  Object.defineProperties(desk, { move: { enumerable: true, get: () => st.move }, loop: { enumerable: true, get: () => st.loop } });");
if (hash(fs.readFileSync(file, 'utf8')) !== hash(before)) throw new Error('Fresh file changed underneath audit');
fs.writeFileSync(file, s, 'utf8');
console.log(file + ' updated from ' + hash(before) + ' to ' + hash(s));
