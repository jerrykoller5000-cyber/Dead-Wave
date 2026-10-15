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
replace("  let toastT = 0;", `  const busyLabel = () => typeof ix.busy === 'string' ? ix.busy : ix.busy && ix.busy.label || 'Working';
  function canMutate() { if (!ix.busy) return true; toast(busyLabel() + ' · wait or Cancel', true); return false; }
  for (const event of ['pointerdown', 'pointermove', 'wheel', 'click', 'dblclick']) root.addEventListener(event, (e) => {
    if (!ix.busy || e.target.closest && e.target.closest('[data-dwi-safe]')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (event !== 'pointermove') toast(busyLabel() + ' · wait or Cancel', true);
  }, true);
  let toastT = 0;`);
replace("el('button', { class: 'dwi-btn', text: 'Close',", "el('button', { class: 'dwi-btn', 'data-dwi-safe': true, text: 'Close',");
replace("el('button', { class: 'dwi-icon', title: 'Keys and mouse (?)'", "el('button', { class: 'dwi-icon', 'data-dwi-safe': true, title: 'Keys, guide and agent commands (?)'");
replace("  async function show(id, o) {\n    try", "  async function show(id, o) {\n    if (!canMutate()) return;\n    try");
const buttonStart = "onclick: async (e) => { const b = e.currentTarget; b.disabled = true;";
if (s.split(buttonStart).length !== 3) throw new Error('Expected generic and move button handlers');
s = s.replaceAll(buttonStart, "onclick: async (e) => { if (!canMutate()) return; const b = e.currentTarget; b.disabled = true;");
replace("  async function playMove(id) {\n    try", "  async function playMove(id) {\n    if (!canMutate()) return;\n    try");
const start = s.indexOf('  async function saveNote() {');
const end = s.indexOf('  function context() {', start);
if (start < 0 || end < 0) throw new Error('No note block');
s = s.slice(0, start) + `  let savingNote = false;
  async function saveNote() {
    const text = noteText.value.trim();
    if (!text) { toast('Write the note first', true); return; }
    if (savingNote || !canMutate()) return;
    savingNote = true;
    const e = ix.entry, ctx = context(), line = '[' + e.id + '] ' + text + ' — ' + ctx;
    let saved = null, copied = false;
    try {
      try { saved = await ix.api.note(text, { context: ctx }); }
      catch (err) {
        if (err.name === 'AbortError') { toast('Note cancelled; your text is still here'); return; }
        try { await copyText(line); copied = true; }
        catch (_) {}
        toast('Not saved to review/ (' + (err.message || err) + ')' + (copied ? ': copied to clipboard' : ': your text is still here'), true);
      }
      if (!saved && !copied) return;
      notes.push({ line, file: saved && saved.file });
      noteList.prepend(el('div', { class: 'dwi-noteitem' }, el('span', { text }), el('span', { class: 'dwi-dim', text: saved ? ' → ' + saved.file : ' (copied)' })));
      if (noteText.value.trim() === text) noteText.value = '';
      if (saved) toast('Saved for ' + (e.owner || 'the owner') + ': ' + saved.file);
    } finally { savingNote = false; }
  }
` + s.slice(end);
replace("btn('Copy all', () => { navigator.clipboard && navigator.clipboard.writeText(notes.map((n) => n.line).join('\\n')); toast('Copied ' + notes.length + ' note(s)'); })", "btn('Copy all', async () => { await copyText(notes.map((n) => n.line).join('\\n')); toast('Copied ' + notes.length + ' note(s)'); })");
replace("const driveBtn =", "const operation = el('span', { class: 'dwi-operation', role: 'status', 'aria-live': 'polite', hidden: true });\n  const cancelBtn = el('button', { class: 'dwi-btn', 'data-dwi-safe': true, text: 'Cancel', hidden: true, title: 'Cancel the current check or capture (Esc)', onclick: () => ix.api && ix.api.cancel && ix.api.cancel() });\n  const driveBtn =");
replace("    views, viewPicker,", "    views, viewPicker, operation, cancelBtn,");
replace("el('button', { class: 'dwi-btn', text: 'Hide (H)'", "el('button', { class: 'dwi-btn', 'data-dwi-safe': true, text: 'Hide (H)'");
replace("  async function savePicture() {\n    root", "  async function savePicture() {\n    if (!canMutate()) return;\n    root");
replace("  async function saveSheet(n = 8) {\n    root", "  async function saveSheet(n = 8) {\n    if (!canMutate()) return;\n    root");
replace("    const now = performance.now(), d = now - lastNow;", "    operation.hidden = cancelBtn.hidden = !ix.busy;\n    if (ix.busy) { const label = busyLabel(); if (operation.textContent !== label) operation.textContent = label; }\n    const now = performance.now(), d = now - lastNow;");
replace("    if (!help.hidden && (k === 'Escape'", "    if (ix.busy && !['KeyH', 'Slash'].includes(e.code) && k !== '?') {\n      if (e.code === 'Escape' && ix.api && ix.api.cancel) ix.api.cancel();\n      else toast(busyLabel() + ' · wait or Cancel', true);\n      return true;\n    }\n    if (!help.hidden && (k === 'Escape'");
if (hash(fs.readFileSync(file, 'utf8')) !== hash(before)) throw new Error('Fresh file changed underneath audit');
fs.writeFileSync(file, s, 'utf8');
console.log(file + ' updated from ' + hash(before) + ' to ' + hash(s));
