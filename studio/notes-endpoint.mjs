// studio/notes-endpoint.mjs — Jerry's notes from the motion lab, straight into the review folders
// (D-42; the folders and their notes.md are docs/studio.md §5). Claude's. tools/serve.mjs hands it
// POST /__studio/note; nothing else writes through the server, and only under review/motion-*.
//
//   POST /__studio/note  { "preset": "zombie/shambler", "text": "...", "context": "..." }
//   → review/motion-zombie-shambler/notes.md gets "## <date> · Jerry · v<preset version> · lab" and the
//     note, under the stub if the folder is new (with meta.json naming the preset's owner, and
//     latest.txt). crew.mjs review and the panel then show it as waiting, like any note.
import fs from 'node:fs';
import path from 'node:path';
import { notesStub } from '../crew/notes.mjs';

const REF = /^[a-z]+\/[a-z0-9-]+$/;

export function handleStudioNote(req, res, base) {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (d) => { body += d; if (body.length > 20000) req.destroy(); });
  req.on('end', () => {
    const fail = (code, msg) => res.writeHead(code, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: false, error: msg }));
    let j;
    try { j = JSON.parse(body); } catch { return fail(400, 'not JSON'); }
    const ref = String(j.preset || ''), text = String(j.text || '').trim(), context = String(j.context || '').trim();
    if (!REF.test(ref)) return fail(400, 'preset must be "rig/name"');
    if (!text) return fail(400, 'the note is empty');
    let preset;
    try { preset = JSON.parse(fs.readFileSync(path.join(base, 'studio', 'motion', ref + '.json'), 'utf8')); } catch { return fail(404, 'no preset ' + ref); }
    const asset = 'motion-' + ref.replace('/', '-');
    const dir = path.join(base, 'review', asset);
    const v = 'v' + (preset.version || 1);
    const today = new Date().toISOString().slice(0, 10);
    fs.mkdirSync(dir, { recursive: true });
    const meta = path.join(dir, 'meta.json');
    if (!fs.existsSync(meta)) fs.writeFileSync(meta, JSON.stringify({ asset, owner: preset.owner || 'grokbot', rig: preset.rig, motion: ref, file: `studio/motion/${ref}.json`, task: 'D-42', look: 'studio/motion-lab.html?preset=' + ref }, null, 2) + '\n');
    const latest = path.join(dir, 'latest.txt');
    if (!fs.existsSync(latest)) fs.writeFileSync(latest, v + '\n');
    const notes = path.join(dir, 'notes.md');
    if (!fs.existsSync(notes)) fs.writeFileSync(notes, notesStub(asset, v, today));
    const clean = text.replace(/\r\n/g, '\n').replace(/^#+/gm, '').replace(/^>/gm, '');
    const entry = `\n## ${today} · Jerry · ${v} · lab\n${clean}\n${context ? `(In the lab: ${context.replace(/\n/g, ' ')})\n` : ''}`;
    // Newest at the top: after the stub's comment block, before the notes already there.
    const cur = fs.readFileSync(notes, 'utf8');
    const cut = cur.lastIndexOf('-->');
    const at = cut >= 0 ? cut + 3 : cur.indexOf('\n') + 1;
    fs.writeFileSync(notes, cur.slice(0, at) + '\n' + entry + cur.slice(at));
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true, file: `review/${asset}/notes.md`, owner: preset.owner || 'grokbot', version: v }));
  });
}
