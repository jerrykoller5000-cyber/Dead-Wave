import fs from 'node:fs';
import crypto from 'node:crypto';
const file = 'studio/inspector/ui.js';
const before = fs.readFileSync(file, 'utf8');
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
let s = before;
function replace(old, value) {
  if (!s.includes(old) || s.indexOf(old) !== s.lastIndexOf(old)) throw new Error('Expected one match: ' + old.slice(0, 90));
  s = s.replace(old, value);
}
replace("const fmt =", `// A damaged browser setting must never prevent inspection from starting.
export function readListSetting(raw, allowed) {
  try { const values = JSON.parse(raw || '[]'); return Array.isArray(values) ? [...new Set(values.filter((v) => typeof v === 'string' && allowed.includes(v)))] : []; }
  catch (_) { return []; }
}
export function readChoiceSetting(raw, allowed, fallback) { return allowed.includes(raw) ? raw : fallback; }

const fmt =`);
replace("const collapsed = new Set(JSON.parse(localGet('dwi.collapsed') || '[]'));", "const collapsed = new Set(readListSetting(localGet('dwi.collapsed'), ix.GROUPS));");
replace("const head = el('div', { class: 'dwi-group' + (open ? ' open' : ''), onclick:", "const head = el('button', { type: 'button', class: 'dwi-group' + (open ? ' open' : ''), 'aria-expanded': !!open, onclick:");
replace("const it = el('div', { class: 'dwi-item' +", "const it = el('button', { type: 'button', class: 'dwi-item' +");
replace("subjId.addEventListener('click', () => { navigator.clipboard && navigator.clipboard.writeText(subjId.textContent); toast('Copied ' + subjId.textContent); });", `async function copyText(text) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard unavailable; select and copy the text');
    await navigator.clipboard.writeText(text);
  }
  subjId.tabIndex = 0; subjId.setAttribute('role', 'button');
  const copyId = async () => { try { await copyText(subjId.textContent); toast('Copied ' + subjId.textContent); } catch (err) { toast(err.message || String(err), true); } };
  subjId.addEventListener('click', copyId);
  subjId.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); copyId(); } });`);
replace("onclick: async (e) => { try { await onclick(e); } catch (err) { toast(text + ': ' + (err.message || err), true); } refreshSoon(); }", "onclick: async (e) => { const b = e.currentTarget; b.disabled = true; b.setAttribute('aria-busy', 'true'); try { await onclick(e); } catch (err) { if (err.name !== 'AbortError') toast(text + ': ' + (err.message || err), true); } finally { b.disabled = false; b.removeAttribute('aria-busy'); refreshSoon(); } }");
replace("box.addEventListener('change', () => { try { set(box.checked); } catch (err) { toast(label + ': ' + (err.message || err), true); box.checked = !!safe(get); } refreshSoon(); });", "box.addEventListener('change', async () => { box.disabled = true; try { await set(box.checked); } catch (err) { toast(label + ': ' + (err.message || err), true); box.checked = !!safe(get); } finally { box.disabled = false; refreshSoon(); } });");
replace("s.addEventListener('change', () => { try { set(s.value); } catch (err) { toast(label + ': ' + (err.message || err), true); } refreshSoon(); });", "s.addEventListener('change', async () => { s.disabled = true; try { await set(s.value); } catch (err) { toast(label + ': ' + (err.message || err), true); } finally { s.disabled = false; refreshSoon(); } });");
replace("    return el('label', { class: 'dwi-field dwi-slider' }", "    addRefresher(() => { const v = safe(get); if (v != null && document.activeElement !== r) { r.value = v; out.textContent = fmtv(v); } });\n    return el('label', { class: 'dwi-field dwi-slider' }");
replace("let refreshers = [], refreshAt = 0, drawingPane = false;", "let refreshers = [], refreshAt = 0, drawingPane = false, refreshScope = 'subject', moveStatus = null;");
replace("const addRefresher = (f) => { f.pane = drawingPane; refreshers.push(f); };", "const addRefresher = (f) => { f.pane = drawingPane; f.scope = drawingPane ? 'pane' : refreshScope; refreshers.push(f); };");
replace("let tab = localGet('dwi.marineTab') || 'Moves';", "let tab = readChoiceSetting(localGet('dwi.marineTab'), tabs, 'Moves');");
replace("      tabBar.textContent = ''; for (const t", "      moveStatus = null;\n      tabBar.textContent = ''; for (const t");
replace("        add(el('div', { class: 'dwi-row' }, loop, btn('Stop', () => M.stop()), btn('Stand him on the stage', () => M.home())));", "        moveStatus = el('div', { class: 'dwi-move-status dwi-dim', role: 'status', 'aria-live': 'polite' });\n        add(el('div', { class: 'dwi-row' }, loop, btn('Stop / clear holds', () => M.stop()), btn('Stage centre', () => M.home())), moveStatus);");
replace("onclick: () => playMove(mv.id)", "onclick: async (e) => { const b = e.currentTarget; b.disabled = true; b.setAttribute('aria-busy', 'true'); try { await playMove(mv.id); } finally { b.disabled = false; b.removeAttribute('aria-busy'); } }");
replace("() => (T.isKatanaOwned && T.isKatanaOwned() ? 'katana' : M.state().blade === 'katana' ? 'katana' : (ix._blade || 'machete')), (v) => { ix._blade = v; M.blade(v); }", "() => M.state().blade, (v) => M.blade(v)");
replace("        let gait = null;\n", "");
replace("() => 0, (u) => { gait = 'walk'; M.hold('walk', u); }", "() => M.holdState('walk') ?? 0, (u) => M.hold('walk', u)");
replace("() => 0, (u) => { gait = 'run'; M.hold('run', u); }", "() => M.holdState('run') ?? 0, (u) => M.hold('run', u)");
replace("() => 0, (u) => M.hold('reload', u)", "() => M.holdState('reload') ?? 0, (u) => M.hold('reload', u)");
replace("() => 0, (u) => M.hold('knife', u)", "() => M.holdState('knife') ?? 0, (u) => M.hold('knife', u)");
replace("() => 0, (u) => M.hold('draw', u)", "() => M.holdState('draw') ?? 0, (u) => M.hold('draw', u)");
replace("() => 0, (t) => M.hold('grenade', [gph, t])", "() => (M.holdState('grenade') || [gph, 0])[1], (t) => M.hold('grenade', [gph, t])");
replace("catch (e) { toast(e.message || String(e), true); }\n    for (const b", "catch (e) { if (e.name !== 'AbortError') toast(e.message || String(e), true); }\n    for (const b");
replace("    viewBox.textContent = '';\n    const st = ix.stage;", "    refreshers = refreshers.filter((f) => f.scope !== 'view');\n    const previousScope = refreshScope; refreshScope = 'view';\n    viewBox.textContent = '';\n    const st = ix.stage;");
replace("(v) => Math.round(v) + '°'));\n  }", "(v) => Math.round(v) + '°'));\n    refreshScope = previousScope;\n  }");
replace("const views = el('div', { class: 'dwi-views' });", "const views = el('div', { class: 'dwi-views' });\n  const viewPicker = el('select', { class: 'dwi-view-picker', title: 'View (1–7)', 'aria-label': 'Camera view' });\n  viewPicker.addEventListener('change', () => ix.orbit.view(viewPicker.value));");
replace("    views.textContent = '';", "    views.textContent = ''; viewPicker.textContent = '';", );
replace("    keys.forEach((k, i) => views.append", "    keys.forEach((k, i) => viewPicker.append(el('option', { value: k, text: (i + 1) + ': ' + human(k) })));\n    keys.forEach((k, i) => views.append");
replace("    views,\n    el('div', { class: 'dwi-pics' }", "    views, viewPicker,\n    el('div', { class: 'dwi-pics' }");
replace("    finally { root.classList.remove('shooting'); }\n  }\n  async function saveSheet", "    catch (e) { toast('Picture: ' + (e.message || e), true); }\n    finally { root.classList.remove('shooting'); }\n  }\n  async function saveSheet");
replace("    const s = ix.subject;\n    const sb", `    const s = ix.subject;
    if (moveStatus && ix.entry && ix.entry.kind === 'marine') {
      const M = ix.marine, state = M.state();
      const message = M.move ? M.move.name + (state.running ? ' · running' : state.loop ? ' · looping' : ' · once') : state.error ? 'Stopped: ' + state.error : 'Choose a move · Space pauses · , / . step frames';
      if (moveStatus.textContent !== message) moveStatus.textContent = message;
      for (const b of right.querySelectorAll('.dwi-move')) b.classList.toggle('on', b.dataset.move === (M.move && M.move.id));
    }
    const sb`);
if (hash(fs.readFileSync(file, 'utf8')) !== hash(before)) throw new Error('Fresh file changed underneath audit');
fs.writeFileSync(file, s, 'utf8');
console.log(file + ' updated from ' + hash(before) + ' to ' + hash(s));
