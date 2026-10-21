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
import { randomUUID } from 'node:crypto';
import { notesStub } from '../crew/notes.mjs';

const REF = /^[a-z]+\/[a-z0-9-]+$/;

// GP-19919: malformed JSON or a failed disk write must not take down the local server.
function readNoteJson(req, res, maxBytes, accept) {
  const fail = (code, error) => { if (!res.headersSent) res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ ok: false, error })); };
  const origin = req.headers.origin, type = String(req.headers['content-type'] || '');
  const localHost = /^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/i.test(String(req.headers.host || ''));
  if (!localHost || (origin && origin !== `http://${req.headers.host}`) || !/^application\/json(?:\s*;|\s*$)/i.test(type)) {
    fail(403, 'notes come from a same-origin page using JSON'); req.resume(); return;
  }
  let body = '', bytes = 0, oversized = false;
  req.setEncoding('utf8');
  req.on('data', (part) => {
    bytes += Buffer.byteLength(part, 'utf8');
    if (oversized) return;
    if (bytes > maxBytes) { oversized = true; body = ''; fail(413, 'the note is too large'); return; }
    body += part;
  });
  req.on('end', () => {
    if (oversized) return;
    let j;
    try { j = JSON.parse(body); } catch { fail(400, 'not JSON'); return; }
    if (!j || typeof j !== 'object' || Array.isArray(j)) { fail(400, 'the note must be a JSON object'); return; }
    try { accept(j); } catch { fail(500, 'the note could not be written; check the review folder permissions and available disk space'); }
  });
  req.on('error', () => fail(400, 'the note request was interrupted'));
}

export function handleStudioNote(req, res, base) {
  // Only the lab, on this server: a page from anywhere else in Jerry's browser could otherwise post a
  // note, and notes are what agents act on. A cross-site page can't send JSON without asking first
  // (and this server never says yes), and its Origin isn't this host.
  readNoteJson(req, res, 20000, (j) => {
    const fail = (code, msg) => res.writeHead(code, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: false, error: msg }));
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

// CL-196: Jerry's notes from the inspector (studio/inspector/, index.html?inspect), into the subject's own review
// folder: review/inspect-<subject>/notes.md, with meta.json naming the subject's owner (from the inspector's catalog)
// and a picture of the view the note was written on beside it. POST /__inspect/note
//   { subject, name, owner, asset: 'inspect-<subject>', source, text, context, image?: 'data:image/jpeg;base64,...', who? }
// Same rules as the lab's: this server's own pages only, JSON only, only under review/inspect-*.
const INSPECT_ASSET = /^inspect-[a-z0-9][a-z0-9-]{0,80}$/;
const OWNERS = new Set(['claude', 'cursor', 'chatgpt', 'grokbot', 'antigravity']);
export function handleInspectNote(req, res, base) {
  readNoteJson(req, res, 12e6, (j) => {
    const fail = (code, msg) => res.writeHead(code, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: false, error: msg }));
    const asset = String(j.asset || ''), text = String(j.text || '').trim(), context = String(j.context || '').trim();
    if (!INSPECT_ASSET.test(asset)) return fail(400, 'asset must be "inspect-<subject>"');
    if (!text) return fail(400, 'the note is empty');
    const owner = OWNERS.has(String(j.owner)) ? String(j.owner) : 'claude';
    const who = /^[A-Za-z][A-Za-z ]{0,20}$/.test(String(j.who || '')) ? String(j.who) : 'Jerry';
    const dir = path.join(base, 'review', asset), today = new Date().toISOString().slice(0, 10);
    fs.mkdirSync(dir, { recursive: true });
    const meta = path.join(dir, 'meta.json');
    if (!fs.existsSync(meta)) fs.writeFileSync(meta, JSON.stringify({ asset, owner, subject: String(j.subject || ''), name: String(j.name || ''), source: String(j.source || ''), task: 'CL-196', look: 'index.html?inspect=' + String(j.subject || '') }, null, 2) + '\n');
    const latest = path.join(dir, 'latest.txt');
    if (!fs.existsSync(latest)) fs.writeFileSync(latest, 'v1\n');
    const v = (fs.readFileSync(latest, 'utf8').trim() || 'v1');
    const notes = path.join(dir, 'notes.md');
    if (!fs.existsSync(notes)) fs.writeFileSync(notes, `# Notes on ${j.name || asset} (${j.subject || asset})\n\n<!--\nWritten from the inspector (Open Marine Inspector.bat, index.html?inspect=${j.subject || ''}). Each note has the picture of the view it\nwas written on beside it in this folder, and where it was (the move, the speed, the camera). The owner answers under\nthe note: node crew/crew.mjs review answer ${asset} <agent> "<what changed>"\n-->\n`);
    let pic = '';
    const m = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(String(j.image || ''));
    if (m) {
      const name = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8) + (m[1] === 'png' ? '.png' : '.jpg');
      try { fs.writeFileSync(path.join(dir, name), Buffer.from(m[2], 'base64')); pic = name; } catch { /* the note matters more */ }
    }
    const clean = text.replace(/\r\n/g, '\n').replace(/^#+/gm, '').replace(/^>/gm, '');
    const entry = `\n## ${today} · ${who} · ${v} · inspector\n${clean}\n(In the inspector: ${String(j.subject || asset)}${context ? ', ' + context.replace(/\n/g, ' ') : ''}${pic ? '; picture: ' + pic : ''})\n`;
    const cur = fs.readFileSync(notes, 'utf8');
    const cut = cur.lastIndexOf('-->');
    const at = cut >= 0 ? cut + 3 : cur.indexOf('\n') + 1;
    fs.writeFileSync(notes, cur.slice(0, at) + '\n' + entry + cur.slice(at));
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true, file: `review/${asset}/notes.md`, picture: pic ? `review/${asset}/${pic}` : null, owner, version: v }));
  });
}
