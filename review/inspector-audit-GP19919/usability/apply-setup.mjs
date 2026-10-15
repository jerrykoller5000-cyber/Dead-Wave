import fs from 'node:fs';
import crypto from 'node:crypto';
const file = 'studio/inspector/ui.js';
const before = fs.readFileSync(file, 'utf8'); const hash = s => crypto.createHash('sha256').update(s).digest('hex'); let s = before;
const replace = (a, b) => { if (s.split(a).length !== 2) throw new Error('Expected one: ' + a.slice(0, 80)); s = s.replace(a, b); };
replace("  ['F5', 'after a change to the game: reload it, back on the same subject']", "  ['F5', 'after a change to the game: reload it, back on the same subject'],\n  ['Save / Load setup', 'View panel: save the subject, kit, camera and lighting as JSON. Loading restarts the active move; a setup is not a simulation checkpoint.']");
replace("  function viewSection() {", `  const setupFile = el('input', { type: 'file', accept: '.json,application/json', hidden: true, 'aria-label': 'Load inspector setup JSON' });
  root.append(setupFile);
  let loadingSetup = false;
  async function saveSetup() {
    const recipe = ix.api.session();
    download('data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(recipe, null, 2)), (ix.entry ? ix.entry.id : 'inspector') + '-setup-' + stamp() + '.json');
    toast('Setup saved: subject, kit, view and light');
  }
  async function loadSetup() {
    const file = setupFile.files && setupFile.files[0];
    if (!file || loadingSetup) return;
    loadingSetup = true;
    try {
      if (!canMutate()) return;
      if (!Number.isFinite(file.size) || file.size > 65536) throw new Error('setup must be at most 64 KB');
      const text = await file.text();
      if (new TextEncoder().encode(text).length > 65536) throw new Error('setup must be at most 64 KB');
      let recipe; try { recipe = JSON.parse(text); } catch (_) { throw new Error('setup is not valid JSON'); }
      if (!canMutate()) return;
      await ix.api.restore(recipe);
      toast('Setup loaded; its move restarts from the beginning');
    } catch (e) { toast(e.name === 'AbortError' ? 'Load setup cancelled' : 'Load setup: ' + (e.message || e), e.name !== 'AbortError'); }
    finally { loadingSetup = false; setupFile.value = ''; }
  }
  setupFile.addEventListener('change', loadSetup);
  function viewSection() {`);
replace("(v) => Math.round(v) + '°'));\n    refreshScope", "(v) => Math.round(v) + '°'),\n      el('div', { class: 'dwi-row' }, btn('Save setup', saveSetup, { title: 'Download a versioned JSON review recipe' }), btn('Load setup', () => { setupFile.value = ''; setupFile.click(); }, { title: 'Load a local JSON recipe; the active move starts again' })),\n      el('div', { class: 'dwi-dim', text: 'Setup = subject, kit, view and light. Loading restarts a move.' }));\n    refreshScope");
if (hash(fs.readFileSync(file, 'utf8')) !== hash(before)) throw new Error('Fresh source changed');
fs.writeFileSync(file, s, 'utf8'); console.log(file + ' updated ' + hash(s));
