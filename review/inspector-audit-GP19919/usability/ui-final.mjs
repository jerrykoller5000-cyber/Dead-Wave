import fs from 'node:fs';
import crypto from 'node:crypto';
const file = 'studio/inspector/ui.js';
const before = fs.readFileSync(file, 'utf8'); const hash = s => crypto.createHash('sha256').update(s).digest('hex'); let s = before;
const replace = (a, b) => { if (s.split(a).length !== 2) throw new Error('Expected one: ' + a.slice(0, 80)); s = s.replace(a, b); };
replace("try { download(await ix.capture('image/png'),", "try { download(await ix.api.shot(),");
replace("  async function saveSheet(n = 8) {\n    if (!canMutate()) return;\n    root.classList.add('shooting');", "  async function saveSheet(n = 8) {\n    if (!canMutate()) return;");
replace("    catch (e) { toast('Sheet: ' + (e.message || e), true); }\n    finally { root.classList.remove('shooting'); }", "    catch (e) { toast(e.name === 'AbortError' ? 'Sheet cancelled' : 'Sheet: ' + (e.message || e), e.name !== 'AbortError'); }");
replace("() => gph, (v) => { gph = v; M.hold('grenade', [gph, 0]); }", "() => (M.holdState('grenade') || [gph])[0], (v) => { gph = v; M.hold('grenade', [gph, 0]); }");
replace("(t) => M.hold('grenade', [gph, t])", "(t) => M.hold('grenade', [(M.holdState('grenade') || [gph])[0], t])");
replace("    if (String(ix.clock.speed()) !== speedSel.value) speedSel.value = String(ix.clock.speed());", `    const currentSpeed = String(ix.clock.speed());
    if (!Array.from(speedSel.options).some((option) => option.value === currentSpeed)) {
      for (const old of speedSel.querySelectorAll('[data-custom-speed]')) old.remove();
      speedSel.append(el('option', { value: currentSpeed, 'data-custom-speed': true, text: currentSpeed + 'x' }));
    }
    if (currentSpeed !== speedSel.value) speedSel.value = currentSpeed;`);
replace("const i = speeds.indexOf(ix.clock.speed()); ix.speed(speeds[Math.max(0, (i < 0 ? 4 : i) - 1)]);", "const lower = speeds.filter((k) => k < ix.clock.speed()); ix.speed(lower.length ? lower[lower.length - 1] : speeds[0]);");
replace("const i = speeds.indexOf(ix.clock.speed()); ix.speed(speeds[Math.min(speeds.length - 1, (i < 0 ? 4 : i) + 1)]);", "ix.speed(speeds.find((k) => k > ix.clock.speed()) ?? speeds[speeds.length - 1]);");
replace("onclick: () => ix.orbit.view(k)", "onclick: () => { viewPicker.value = k; ix.orbit.view(k); }");
replace("o.view(keys[+e.code.slice(5) - 1]); return true;", "viewPicker.value = keys[+e.code.slice(5) - 1]; o.view(viewPicker.value); return true;");
replace("case e.code === 'Digit0': o.view(marine ? 'full' : 'three'); return true;", "case e.code === 'Digit0': viewPicker.value = marine ? 'full' : 'three'; o.view(viewPicker.value); return true;");
if (hash(fs.readFileSync(file, 'utf8')) !== hash(before)) throw new Error('Fresh source changed');
fs.writeFileSync(file, s, 'utf8'); console.log(file + ' updated ' + hash(s));
