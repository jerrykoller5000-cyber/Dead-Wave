#!/usr/bin/env node
// crew/crew.mjs — the Grave Shift crew board from the command line. No dependencies (Node 22+).
//
// Start every session with:
//   node crew/crew.mjs me <agent>               your briefing: your card, requests waiting for you, your next task,
//                                               the game-test queue, and the commands you'll need (CL-199)
//
//   node crew/crew.mjs                          who is doing what, what needs Jerry, clashes, reviews
//   node crew/crew.mjs next <agent>             your next task you can start now (skips ones that
//                                               say "after XX-n" while XX-n is still open)
//   node crew/crew.mjs newid <agent> "<what>"   the next unused task id for that agent (e.g. CU-77),
//                                               logged so nobody else gets the same one. Always use
//                                               this for a new task; never guess an id.
//
//   node crew/crew.mjs in   <agent> <task-id> "<what>" --model "<the model you run on>" --touch "index.html (part), tools/x.mjs"
//                                               (a task Jerry gave you in chat that isn't on the board yet is added
//                                               under your Now on the board: the board stays current by itself)
//   node crew/crew.mjs note <agent> "<progress: what you found or finished, one line>"
//   node crew/crew.mjs wait <agent> "<what is ready>"   changes ready, waiting for the game-test slot (card + log)
//   node crew/crew.mjs out  <agent> --report handoffs/<note>.md [--done] [--next "<id> <what>"]
//                                    [--review "<why the lead should look>"] [--blocked "<on what>"]
//
//   node crew/crew.mjs requests <agent> [--all]  requests addressed to you that nobody has answered
//   node crew/crew.mjs reply <agent> "<words from the title>" DONE|WONT|LATER|NOTE "<one line>"
//                                               answers it in place in handoffs/requests.md
//   node crew/crew.mjs request <from> <to> "<title>" "<body>"     (or --body-file <path>; --fyi when you're telling, not asking)
//   node crew/crew.mjs ask     <agent> "<a question only Jerry can answer>"
//   node crew/crew.mjs check                                       exit 1 on a clash or stale check-in
//   node crew/crew.mjs slot status
//   node crew/crew.mjs slot request <agent> <task> --checks "<batch>" --minutes <n>
//   node crew/crew.mjs slot run <agent> <task> --checks "<batch>" -- <command>
//   node crew/crew.mjs slot cancel <agent> <request-id>
//
//   Jerry's notes on the studio's review folders (D-40; review/<asset>/notes.md):
//   node crew/crew.mjs review                          every review folder and where its notes stand
//   node crew/crew.mjs review take   <asset>           turn Jerry's waiting note into a request for the
//                                                      folder's owner (from meta.json)
//   node crew/crew.mjs review answer <asset> <agent> "<what changed>" [--version vN]
//                                                      after rendering the new version: the answer goes
//                                                      under Jerry's note with the version to look at
//
//   Lead / Jerry only:
//   node crew/crew.mjs answer   Q-<n> "<answer>"
//   node crew/crew.mjs tidy                     move every finished [x] task off the board into
//                                               crew/archive/board-queues-<today>.md
//   node crew/crew.mjs settle                   every request so far counts as answered (after a clean-up)
//   node crew/crew.mjs archive [--days 3]       move log lines and requests older than that into crew/archive/ and
//                                               handoffs/archive/, so the files everyone reads stay small (CL-199)
//   node crew/crew.mjs reviewed <report path> "<verdict>"
//   node crew/crew.mjs reviewed --before <YYYY-MM-DD> "<verdict>"   every review older than that, at once
//
// Agents: claude, cursor, chatgpt, grokbot, antigravity, muse. Task ids: CL-, CU-, GP-, GB-, AG-, MU-.
// The files are the truth; this only reads and writes them (always as UTF-8). By hand is fine:
//   crew/status/<agent>.md   your own check-in card. Only you write yours.
//   crew/LOG.md              one line per event. Append only.
//   crew/BOARD.md            orders, decisions, queues. Claude writes it; agents change only the
//                            box of their OWN task ([ ] [>] [x] [!]), which `in`/`out --done` do.
//   crew/QUESTIONS.md        questions for Jerry. Append only; Claude or Jerry closes them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNotes, reviewState, notesStub } from './notes.mjs';

const CREW = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(CREW, '..');
const AGENTS = { claude: 'Claude', cursor: 'Cursor', chatgpt: 'ChatGPT', grokbot: 'Grokbot', antigravity: 'Antigravity', muse: 'Muse' };
const PREFIX = { claude: 'CL', cursor: 'CU', chatgpt: 'GP', grokbot: 'GB', antigravity: 'AG', muse: 'MU' };
const FIELDS = ['state', 'model', 'task', 'touching', 'since', 'next', 'blocked-on', 'last-report'];
const STATES = ['active', 'idle', 'blocked', 'away'];
// Append-only files everyone shares. Checking in on them never clashes with anyone.
const SHARED = ['crew/log.md', 'crew/questions.md', 'handoffs/requests.md', 'crew/status/'];
const STALE_HOURS = 8;
// A card blocked on the game-test slot waits on the queue, not on whoever it names ("Changes ready; waiting for testing slot").
const SLOT_WAIT = /(test(ing)?|validation) slot/i;
const DASH = '—';

const now = () => new Date().toISOString().slice(0, 16) + 'Z';
const statusPath = (a) => path.join(CREW, 'status', a + '.md');
const logPath = path.join(CREW, 'LOG.md');
const boardPath = path.join(CREW, 'BOARD.md');
const questionsPath = path.join(CREW, 'QUESTIONS.md');
const requestsPath = path.join(ROOT, 'handoffs', 'requests.md');
const archiveDir = path.join(CREW, 'archive');

const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/^﻿/, '') : '');
// Keep a file's own line endings when we append to or rewrite it.
const eolOf = (text) => (/\r\n/.test(text) ? '\r\n' : '\n');
function append(file, lines, header = '') {
  // Claude, 2026-09-29: append, never rewrite. Two agents checking out at once each read the whole log, added
  // their line and wrote it all back: the second write dropped the first one's lines (GB-75's and GB-78's
  // check-outs went missing). fs.appendFileSync adds to the end without touching what's there.
  const cur = read(file);
  if (!cur) { const eol0 = header && /\r\n/.test(header) ? '\r\n' : '\n'; fs.writeFileSync(file, (header || '') + lines.join(eol0) + eol0, 'utf8'); return; }
  const eol = eolOf(cur);
  fs.appendFileSync(file, (cur.endsWith('\n') ? '' : eol) + lines.join(eol) + eol, 'utf8');
}

function readStatus(agent) {
  const text = read(statusPath(agent)).replace(/\r\n/g, '\n');
  const fields = {};
  const lines = text.split('\n');
  let i = 0;
  for (; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) break;
    const m = /^([a-z-]+):\s*(.*)$/.exec(lines[i]);
    if (m && FIELDS.includes(m[1])) fields[m[1]] = m[2].trim();
  }
  return { agent, fields, notes: lines.slice(i).join('\n').trimEnd() };
}
function writeStatus({ agent, fields, notes }) {
  const head = ['# ' + AGENTS[agent], ''];
  for (const k of FIELDS) head.push(`${k}: ${fields[k] || DASH}`);
  const body = notes && notes.trim() ? notes : '## Notes\n\n(Anything your next session should know. Yours to edit.)';
  fs.writeFileSync(statusPath(agent), head.join('\n') + '\n\n' + body + '\n', 'utf8');
}
const log = (agent, kind, text) => append(logPath, [`- ${now()} · ${agent} · ${kind} · ${text}`], '# Crew log\n\nNewest at the bottom. Append only.\n');

// --- touching lists and clashes ---------------------------------------------------------
// Commas separate files, except inside a part: "index.html (boot, mergeParts)" is one entry.
function split(s) {
  if (!s || s === DASH) return [];
  const out = []; let cur = '', depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++; else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}
const fileOf = (t) => t.replace(/\s*\(.*\)\s*$/, '').replace(/\\/g, '/').toLowerCase();
const partOf = (t) => { const m = /\(([^)]*)\)\s*$/.exec(t); return m ? m[1].trim().toLowerCase() : ''; };
const isShared = (t) => SHARED.some((s) => fileOf(t) === s || (s.endsWith('/') && fileOf(t).startsWith(s)));
// Same file clashes when either names no part, either is the split freeze, or they share a
// part: "index.html (boot)" and "index.html (build wheel)" run side by side. A folder
// ("world/") clashes with everything in it. Shared append-only files never clash.
function clash(a, b) {
  if (isShared(a) || isShared(b)) return false;
  const x = fileOf(a), y = fileOf(b);
  if (x === y) {
    const p = partOf(a), q = partOf(b);
    const ps = p.split(',').map((v) => v.trim()), qs = q.split(',').map((v) => v.trim());
    return !p || !q || /freeze/.test(p) || /freeze/.test(q) || ps.some((v) => qs.includes(v));
  }
  const dir = (p) => p.endsWith('/') || p.endsWith('/*');
  const stem = (p) => p.replace(/\*$/, '');
  return (dir(x) && y.startsWith(stem(x))) || (dir(y) && x.startsWith(stem(y)));
}

function hoursSince(iso) { const t = Date.parse(iso); return Number.isFinite(t) ? (Date.now() - t) / 36e5 : null; }
function ago(iso) {
  const h = hoursSince(iso);
  if (h === null) return iso || DASH;
  if (h < 1 / 60) return 'just now';
  if (h < 1) return Math.round(h * 60) + ' min ago';
  if (h < 48) return h.toFixed(1).replace(/\.0$/, '') + ' h ago';
  return Math.round(h / 24) + ' days ago';
}

// --- the board's task boxes -------------------------------------------------------------
const taskRe = (id) => new RegExp('^(\\s*- \\[)( |x|>|!|~)(\\] \\*\\*' + id.replace(/[-]/g, '\\-') + '\\*\\*)', 'm');
function boardTasks() {
  const out = [];
  // A task is its "- [ ] **XX-n**" line plus the indented lines under it.
  for (const line of read(boardPath).replace(/\r\n/g, '\n').split('\n')) {
    const m = /^\s*- \[( |x|>|!|~)\] \*\*([A-Z]{2}-\d+[a-z]?)\*\*\s*(.*)$/.exec(line);
    if (m) out.push({ box: m[1], id: m[2], text: m[3] });
    else if (out.length && /^\s{2,}\S/.test(line) && !/^\s*- /.test(line) && out[out.length - 1].open !== false) out[out.length - 1].text += ' ' + line.trim();
    else if (out.length && !line.trim()) out[out.length - 1].open = false;
  }
  return out;
}
function markTask(agent, id, box) {
  if (!id || !id.startsWith(PREFIX[agent] + '-')) return false;     // only your own tasks
  const text = read(boardPath);
  const re = taskRe(id);
  if (!re.test(text)) return false;
  const next = text.replace(re, (_, a, _b, c) => a + box + c);
  if (next !== text) fs.writeFileSync(boardPath, next, 'utf8');
  return true;
}

// --- questions and reviews --------------------------------------------------------------
function questions() {
  const out = [];
  for (const m of read(questionsPath).matchAll(/^## (Q-\d+) · (open|answered) · (\S+) · (\w+)\s*$/gm)) out.push({ id: m[1], state: m[2], at: m[3], agent: m[4] });
  return out;
}
function logLines() { return read(logPath).split(/\r?\n/).filter((l) => l.startsWith('- ')).map((l) => { const [at, agent, kind, ...rest] = l.slice(2).split(' · '); return { at, agent, kind, text: rest.join(' · ') }; }); }
function pendingReviews() {
  const want = new Map();
  for (const e of logLines()) {
    const day = e.kind === 'REVIEWED' && bulkBefore(e.text);
    if (day) { for (const [k, w] of want) if (w.at < day) want.delete(k); continue; }
    const rep = (/(handoffs\/\S+\.md)/.exec(e.text) || [])[1];
    if (!rep) continue;
    if (e.kind === 'REVIEW') want.set(rep, e);
    if (e.kind === 'REVIEWED') want.delete(rep);
  }
  return [...want.values()];
}

// --- Jerry's notes on the review folders (D-40, CL-60) ----------------------------------
const reviewDir = path.join(ROOT, 'review');
const reviewsJson = path.join(CREW, 'reviews.json');
function reviewAssets() {
  if (!fs.existsSync(reviewDir)) return [];
  return fs.readdirSync(reviewDir, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(reviewDir, d.name, 'latest.txt'))).map((d) => {
    const dir = path.join(reviewDir, d.name);
    let meta = {};
    try { meta = JSON.parse(read(path.join(dir, 'meta.json')) || '{}'); } catch { meta = {}; }
    const latest = read(path.join(dir, 'latest.txt')).trim() || null;
    const notesFile = path.join(dir, 'notes.md');
    const notes = parseNotes(read(notesFile));
    return { asset: d.name, dir, notesFile, meta, owner: AGENTS[meta.owner] ? meta.owner : 'claude', latest, notes, ...reviewState(notes, latest) };
  }).sort((a, b) => a.asset.localeCompare(b.asset));
}
// The panel can't list folders over http, so it reads this index; it only changes when a folder
// comes or goes (no times in it), so it doesn't churn in git.
function writeReviewIndex(list) {
  const body = JSON.stringify({ note: 'Written by node crew/crew.mjs; the panel reads review/<asset>/notes.md itself.', assets: list.map((r) => ({ asset: r.asset, owner: r.owner, rig: r.meta.rig || null, clip: r.meta.clip || null, reference: r.meta.reference || null })) }, null, 2) + '\n';
  if (read(reviewsJson) !== body) fs.writeFileSync(reviewsJson, body, 'utf8');
}
const REVIEW_WORD = { 'no-notes': 'no notes yet', waiting: "Jerry's note waiting", taken: 'owner is on it', look: 'answered: Jerry to look', 'answered-seen': 'answered', approved: 'approved' };
function reviewLine(r) {
  const extra = r.state === 'waiting' ? ': ' + r.open.map((n) => `${n.version} "${n.text.slice(0, 70)}${n.text.length > 70 ? '…' : ''}"`).join('; ')
    : r.state === 'look' ? ` (look at ${r.lookAt})` : r.state === 'approved' ? ` at ${r.approvedAt}` : '';
  return `${r.asset.padEnd(22)} ${String(r.latest || '?').padEnd(4)} ${AGENTS[r.owner].padEnd(11)} ${REVIEW_WORD[r.state]}${extra}`;
}
// Insert lines at the end of one note's section (before the next "## " heading).
function addUnderNote(file, note, lines) {
  const text = read(file), eol = eolOf(text);
  const all = text.split(/\r?\n/);
  // Headings inside <!-- --> (the stub's example) don't count.
  let inComment = false;
  const at = all.findIndex((l) => {
    if (inComment) { if (l.includes('-->')) inComment = false; return false; }
    if (l.trim().startsWith('<!--')) { inComment = !l.includes('-->'); return false; }
    return l.trim() === note.head;
  });
  if (at < 0) return false;
  let end = at + 1;
  while (end < all.length && !/^## /.test(all[end]) && !/^<!--/.test(all[end])) end++;
  while (end > at + 1 && !all[end - 1].trim()) end--;
  all.splice(end, 0, '', ...lines);
  fs.writeFileSync(file, all.join(eol).replace(/(\r?\n)*$/, eol), 'utf8');
  return true;
}

function problems(all) {
  const out = [];
  const active = all.filter((s) => s.fields.state === 'active');
  for (const s of all) {
    if (s.fields.state && !STATES.includes(s.fields.state)) out.push(`${s.agent}: unknown state "${s.fields.state}"`);
    if (s.fields.state === 'active') {
      const h = hoursSince(s.fields.since);
      if (h !== null && h > STALE_HOURS) out.push(`${s.agent}: checked in ${ago(s.fields.since)} and never checked out — stale? (${s.fields.task})`);
    }
  }
  for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
    for (const a of split(active[i].fields.touching)) for (const b of split(active[j].fields.touching)) {
      if (clash(a, b)) out.push(`CLASH: ${active[i].agent} (${a}) and ${active[j].agent} (${b}) are in the same file`);
    }
  }
  return out;
}
function freezeLine(all) {
  const f = all.find((s) => s.fields.state === 'active' && /freeze/i.test(s.fields.touching || ''));
  return f ? `SPLIT FREEZE ON (${AGENTS[f.agent]}, ${ago(f.fields.since)}) — nobody else edits index.html` : 'split freeze off';
}
// A task that says "after XX-n" (or "once", "until", "waits on") can't start while XX-n is open.
function gateOf(t, all) {
  for (const d of t.text.matchAll(/\b(?:after|once|until|waits? (?:for|on))\s+(?:the\s+)?(?:(split)\b|([A-Z]{2}-\d+))/gi)) {
    const id = d[1] ? 'CU-4' : d[2].toUpperCase();
    const g = all.find((x) => x.id === id);
    if (id !== t.id && g && g.box !== 'x' && g.box !== '~') return g;
  }
  return null;
}
function nextTask(agent) {
  const all = boardTasks();
  const mine = all.filter((t) => t.id.startsWith(PREFIX[agent] + '-') && (t.box === ' ' || t.box === '>'));
  return mine.find((t) => !gateOf(t, all)) || null;
}
function waitingTask(agent) {
  const all = boardTasks();
  const t = all.find((x) => x.id.startsWith(PREFIX[agent] + '-') && (x.box === ' ' || x.box === '>') && gateOf(x, all));
  return t ? { task: t, on: gateOf(t, all) } : null;
}
const ownerOf = (id) => AGENTS[Object.keys(PREFIX).find((a) => id.startsWith(PREFIX[a] + '-'))] || '?';

// --- tidy: finished tasks leave the board for crew/archive/ ----------------------------
// A task is its "- [x] **XX-n**" line plus the indented lines under it. Phase headings
// ("#### ") left with no tasks under them go too. Returns the ids moved.
function tidyBoard() {
  const text = read(boardPath), eol = eolOf(text);
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const keep = [], moved = [];
  let agentHead = null, phaseHead = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^## /.test(l)) { agentHead = null; phaseHead = null; }
    if (/^### /.test(l)) { agentHead = l; phaseHead = null; }
    if (/^#### /.test(l)) phaseHead = l;
    const m = /^\s*- \[x\] \*\*([A-Z]{2}-\d+[a-z]?)\*\*/.exec(l);
    if (!m) { keep.push(l); continue; }
    const block = [l];
    while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !/^\s*- /.test(lines[i + 1])) block.push(lines[++i]);
    if (i + 1 < lines.length && !lines[i + 1].trim() && keep.length && !keep[keep.length - 1].trim()) i++;
    moved.push({ id: m[1], agentHead, phaseHead, block });
  }
  if (!moved.length) return [];
  // Drop phase headings that are now empty (only blank lines before the next heading).
  const out = [];
  for (let i = 0; i < keep.length; i++) {
    if (/^#### /.test(keep[i])) {
      let j = i + 1; while (j < keep.length && !keep[j].trim()) j++;
      if (j >= keep.length || /^#{2,4} /.test(keep[j])) { i = j - 1; continue; }
    }
    out.push(keep[i]);
  }
  const board = out.join('\n').replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(boardPath, board.split('\n').join(eol), 'utf8');
  // Append to today's archive, grouped by agent and phase.
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
  const file = path.join(archiveDir, `board-queues-${now().slice(0, 10)}.md`);
  const add = [];
  let lastA = null, lastP = null;
  for (const t of moved) {
    const a = (t.agentHead || '### (no agent)').replace(/^### /, '## ');
    const p = (t.phaseHead || '#### (no phase)').replace(/^#### /, '### ');
    if (a !== lastA) { add.push('', a); lastA = a; lastP = null; }
    if (p !== lastP) { add.push('', p, ''); lastP = p; }
    add.push(...t.block);
  }
  append(file, [`<!-- crew.mjs tidy, ${now()}: ${moved.length} finished -->`, ...add, ''],
    `# Board queues archived ${now().slice(0, 10)}\n\nFinished tasks moved off crew/BOARD.md (\`node crew/crew.mjs tidy\`). Each one's report is in handoffs/.\n\n`);
  return moved.map((t) => t.id);
}

// --- newid: the next unused task id for an agent -----------------------------------------
// Looks everywhere an id can already live: the board, the archive, the log (including ids
// handed out by newid and not on the board yet), the roadmap and the handoff file names.
function nextId(agent) {
  const pre = PREFIX[agent];
  const re = new RegExp('\\b' + pre + '-(\\d+)', 'g');
  let max = 0;
  const scan = (t) => { for (const m of String(t).matchAll(re)) max = Math.max(max, +m[1]); };
  scan(read(boardPath)); scan(read(logPath)); scan(read(path.join(ROOT, 'docs', 'roadmap.md')));
  if (fs.existsSync(archiveDir)) for (const f of fs.readdirSync(archiveDir)) scan(read(path.join(archiveDir, f)));
  const hd = path.join(ROOT, 'handoffs');
  if (fs.existsSync(hd)) scan(fs.readdirSync(hd).join(' '));
  return `${pre}-${max + 1}`;
}

// --- the mission: the one thing the whole crew is doing now (BOARD.md "## Mission") -----
function mission() {
  const board = read(boardPath).replace(/\r\n/g, '\n');
  const m = /^## Mission\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(board);
  if (!m) return null;
  const body = m[1];
  const title = ((/\*\*([^*]+)\*\*/.exec(body) || [])[1] || 'Mission').replace(/\.$/, '');
  const tasks = boardTasks();
  const rows = [];
  for (const r of body.matchAll(/^- \*\*(\w+)\*\* · ([A-Z]{2}-\d+) · (\S+)\s*$/gm)) {
    const agent = Object.keys(AGENTS).find((a) => AGENTS[a].toLowerCase() === r[1].toLowerCase());
    const t = tasks.find((x) => x.id === r[2]);
    const st = agent ? readStatus(agent).fields : {};
    const turnedIn = fs.existsSync(path.join(ROOT, r[3]));
    // A task that has left the board was finished and archived (crew.mjs tidy).
    const state = !t || t.box === 'x' ? 'turned in' : st.state === 'active' && (st.task || '').startsWith(r[2]) ? 'working' : turnedIn ? 'report written' : 'not started';
    rows.push({ agent, name: r[1], id: r[2], file: r[3], state });
  }
  return { title, rows };
}
function printMission() {
  const ms = mission();
  if (!ms || !ms.rows.length) return;
  const done = ms.rows.filter((r) => r.state === 'turned in').length;
  const mark = { 'turned in': '✓', working: '▶', 'report written': '…', 'not started': '○' };
  console.log(`MISSION · ${ms.title} · ${done} of ${ms.rows.length} done`);
  const byAgent = new Map();
  for (const r of ms.rows) { if (!byAgent.has(r.name)) byAgent.set(r.name, []); byAgent.get(r.name).push(r); }
  const multi = [...byAgent.values()].some((rs) => rs.length > 1);
  if (!multi) for (const r of ms.rows) console.log(`  ${mark[r.state]} ${(r.name + '            ').slice(0, 12)}${(r.id + '       ').slice(0, 7)}${(r.state + '               ').slice(0, 15)}${r.file}`);
  // Several tasks each: one line per agent, "✓ done ▶ working … written ○ not started".
  else for (const [name, rs] of byAgent) console.log(`  ${(name + '            ').slice(0, 12)}${String(rs.filter((r) => r.state === 'turned in').length).padStart(2)}/${rs.length}  ${rs.map((r) => mark[r.state] + ' ' + r.id).join('  ')}`);
  console.log('  ✓ done  ▶ working  … report written  ○ not started.  How: "## Mission" in crew/BOARD.md.');
}

// --- who we're waiting on (the same rules as the panel's top box) ------------------------
function flowSummary(all) {
  const board = read(boardPath);
  const tasks = boardTasks().map((t) => ({ ...t, agent: Object.keys(PREFIX).find((a) => t.id.startsWith(PREFIX[a] + '-')) }));
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const isDone = (id) => byId[id] && (byId[id].box === 'x' || byId[id].box === '~');
  const namesIn = (s) => Object.keys(AGENTS).filter((a) => new RegExp('\\b' + AGENTS[a] + '\\b', 'i').test(s || '')).concat(/\bjerry\b/i.test(s || '') ? ['jerry'] : []);
  const st = Object.fromEntries(all.map((s) => [s.agent, s.fields]));
  const sec = (/^## Waiting on\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(board.replace(/\r\n/g, '\n')) || [, ''])[1];
  const gates = [];
  for (const line of sec.split('\n')) {
    const m = /^- \*\*(\w+)\*\* · (.+?) · waiting: (.+)$/.exec(line.trim());
    if (!m) continue;
    const on = m[1].toLowerCase();
    const ids = [...m[2].matchAll(/\b([A-Z]{2}-\d+)\b/g)].map((x) => x[1]);
    if ((!AGENTS[on] && on !== 'jerry') || (ids.length && ids.every(isDone))) continue;
    gates.push({ on, what: m[2], waiters: namesIn(m[3]).filter((a) => a !== on) });
  }
  const waiting = new Map(), stale = new Map(), ready = [];
  const add = (b, a) => { if (!waiting.has(b)) waiting.set(b, new Set()); waiting.get(b).add(a); };
  for (const a of Object.keys(AGENTS)) {
    const f = st[a] || {}; if (f.state === 'active') continue;
    // A task it can start now counts first; only when every open task is gated does it wait (CL-199).
    const open = tasks.filter((t) => t.agent === a && (t.box === '>' || t.box === ' ' || t.box === '!'));
    const next = open.find((t) => t.box !== '!' && !gateOf(t, tasks)) || open[0];
    let waits = false;
    if (f.state === 'blocked' && !SLOT_WAIT.test(f['blocked-on'] || '')) {
      const why = f['blocked-on'] || '';
      const files = [...why.matchAll(/[\w./-]+\.(?:html|m?js|md|json|css)(?:\s*\([^)]*\))?/g)].map((x) => x[0]);
      for (const b of namesIn(why)) {
        if (b === a) continue;
        const bs = st[b] || {};
        const still = !files.length || b === 'jerry' || (bs.state === 'active' && files.some((x) => split(bs.touching).some((y) => clash(x, y))));
        if (still) { add(b, a); waits = true; } else { if (!stale.has(a)) stale.set(a, []); stale.get(a).push(AGENTS[b] || b); }
      }
    }
    if (next) for (const d of next.text.matchAll(/\b(?:after|once|until|waits? (?:for|on))\s+(?:the\s+)?(?:(split)\b|([A-Z]{2}-\d+))/gi)) {
      const id = d[1] ? 'CU-4' : d[2].toUpperCase();
      if (id !== next.id && byId[id] && !isDone(id) && byId[id].agent !== a) { add(byId[id].agent, a); waits = true; }
    }
    for (const g of gates) if (g.waiters.includes(a)) { add(g.on, a); waits = true; }
    if (!waits && next && f.state !== 'blocked') ready.push(`${AGENTS[a]} (${next.id})`);
  }
  const lines = [];
  for (const [on, w] of [...waiting.entries()].sort((x, y) => y[1].size - x[1].size)) {
    const g = gates.find((x) => x.on === on), f = st[on] || {};
    const what = g ? g.what : f.task || '';
    const state = on === 'jerry' ? 'your answer' : f.state === 'active' ? `${AGENTS[on]} is on it (${ago(f.since)})` : `${AGENTS[on]} has not started: give ${AGENTS[on]} the check-in prompt`;
    lines.push(`⏳ Waiting on ${on === 'jerry' ? 'Jerry' : AGENTS[on]}${what && what !== DASH ? ' · ' + what : ''}: ${[...w].map((a) => AGENTS[a]).join(', ')} wait. ${state}.`);
  }
  if (stale.size) lines.push('↻ Probably free to start: ' + [...stale].map(([a, bs]) => `${AGENTS[a]} (card says blocked on ${bs.join(', ')}, who ${bs.length > 1 ? 'are' : 'is'} out of that file now)`).join('; ') + '.');
  if (ready.length) lines.push('▷ Ready, needs a prompt: ' + ready.join(', ') + '.');
  return lines.length ? lines : ['Nobody is waiting on anyone.'];
}

async function panel() {
  const all = Object.keys(AGENTS).map(readStatus);
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  console.log('\nGRAVE SHIFT CREW · ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC · Jerry\'s view: crew/panel.html');
  console.log('─'.repeat(78));
  // What needs Jerry first: questions, agents that need a prompt, sessions waiting for the slot, problems.
  const need = [];
  for (const q of questions().filter((x) => x.state === 'open')) need.push(`? Question ${q.id} from ${AGENTS[q.agent] || q.agent}: crew/QUESTIONS.md`);
  const waitSlot = all.filter((s) => s.fields.state === 'blocked' && SLOT_WAIT.test(s.fields['blocked-on'] || ''));
  for (const s of waitSlot) need.push(`⏸ ${AGENTS[s.agent]}: changes ready; waiting for testing slot (${s.fields.task}). Resume it when the slot is free.`);
  const p = problems(all);
  for (const x of p) need.push('! ' + x);
  // Only the waits Jerry can do something about: a gate nobody is working on, or one on him.
  const flow = flowSummary(all).filter((l) => !/^Nobody is waiting/.test(l) && !/ is on it \(/.test(l));
  need.push(...flow);
  const jl = reviewAssets().filter((x) => x.state === 'look');
  if (jl.length) need.push(`◉ For Jerry to look at: ${jl.map((x) => `${x.asset} ${x.lookAt}`).join(', ')} (review/<asset>/index.html)`);
  console.log('NEEDS JERRY');
  console.log(need.length ? need.map((x) => '  ' + x).join('\n') : '  Nothing right now.');
  printMission();
  console.log('─'.repeat(78));
  const notes = logLines();
  for (const s of all) {
    const f = s.fields;
    const model = f.model && f.model !== DASH ? f.model.split(/,| \(/)[0] : 'model not given';
    console.log(pad(AGENTS[s.agent], 12) + pad((f.state || '?').toUpperCase(), 9) + (f.task && f.task !== DASH ? f.task.slice(0, 57) : '(no task)'));
    const extra = [];
    if (f.state === 'active') {
      extra.push(`${ago(f.since)} · ${model} · touching ${f.touching || DASH}`);
      const last = [...notes].reverse().find((e) => e.agent === s.agent && e.kind === 'NOTE' && Date.parse(e.at) >= Date.parse(f.since));
      if (last) extra.push('latest: ' + last.text);
    } else if (f.state === 'blocked') extra.push('blocked on: ' + (f['blocked-on'] || DASH));
    else {
      const nt = nextTask(s.agent), wt = waitingTask(s.agent);
      extra.push(`last seen ${ago(f.since)} · next: ` + (nt ? `${nt.id} ${nt.text.replace(/\*\*/g, '').slice(0, 50)}` : wt ? `${wt.task.id} waits on ${wt.on.id} (${ownerOf(wt.on.id)})` : 'queue empty'));
    }
    for (const x of extra) console.log(' '.repeat(21) + x.slice(0, 120));
  }
  console.log('─'.repeat(78));
  console.log('Game-test slot: ' + await slotSummary());
  const r = pendingReviews();
  if (r.length) console.log(`» ${r.length} handoff(s) for Claude to review (node crew/crew.mjs reviewed <report> "<verdict>")`);
  const rv = reviewAssets();
  writeReviewIndex(rv);
  const jw = rv.filter((x) => x.state === 'waiting');
  if (jw.length) console.log(`✎ Jerry's notes waiting: ${jw.map((x) => `${x.asset} ${x.open.map((n) => n.version).join(',')} (${AGENTS[x.owner]})`).join(', ')}. Take one: node crew/crew.mjs review take <asset>`);
  console.log('\nLast log lines:\n' + notes.slice(-5).map((e) => `- ${e.at} · ${e.agent} · ${e.kind} · ${e.text.slice(0, 110)}`).join('\n'));
  console.log('\nYour briefing: node crew/crew.mjs me <you>  ·  Orders, decisions and queues: crew/BOARD.md\n');
  return p;
}

// --- requests (handoffs/requests.md): who still owes an answer (CL-199) -------------------
// A request is its "## <date> · <from> → <to> · <title>" heading and the lines under it. It is
// settled once its body says DONE, WONT or LATER, or one of the people it was sent to replied under
// it ("**Grokbot, 2026-10-15: …**"). Same rules as the panel's.
const NAME_TO = Object.fromEntries(Object.entries(AGENTS).map(([a, n]) => [n.toLowerCase(), a]));
// "<!-- crew: settled above -->" (crew.mjs settle, lead only): every request above it counts as settled.
const SETTLED = '<!-- crew: settled above -->';
const FYI_TITLE = /^(FYI|GRANT|RELEASE|ACK|Record)\b|\bFYI\b/i;
function parseRequests(text) {
  const out = []; const idx = [];
  const settledAt = text.lastIndexOf(SETTLED);
  for (const m of text.matchAll(/^## (.+)$/gm)) idx.push([m.index, m[1]]);
  idx.forEach(([i, head], k) => {
    const end = k + 1 < idx.length ? idx[k + 1][0] : text.length;
    const body = text.slice(i, end);
    const h = /^(\S+)\s*·\s*(.+?)\s*→\s*(.+?)\s*·\s*(.+)$/.exec(head.trim());
    if (!h) return;
    const to = h[3].split(/,|\band\b/).map((s) => s.trim().toLowerCase().replace(/\s*\(.*\)/, '')).map((s) => (s === 'all' || s === 'everyone' || s === 'crew') ? 'all' : NAME_TO[s] || s).filter(Boolean);
    const st = [...body.matchAll(/\b(DONE|WONT|LATER)\b/g)].map((x) => x[1]);
    const replied = to.some((a) => a !== 'all' && new RegExp('\\*\\*' + (AGENTS[a] || a) + '[ ,]', 'i').test(body));
    out.push({ start: i, end, date: h[1], from: h[2].replace(/\s*\(.*\)/, '').trim(), to, title: h[4].trim(),
      status: i < settledAt ? 'SETTLED' : st.length ? st[st.length - 1] : replied ? 'ANSWERED' : (to.includes('all') || FYI_TITLE.test(h[4])) ? 'FYI' : 'OPEN' });
  });
  return out;
}
function requestsFor(agent, { all = false, days = 1 } = {}) {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  return parseRequests(read(requestsPath)).filter((r) => r.status === 'OPEN' && (r.to.includes(agent) || r.to.includes('all')) && (all || r.date >= since));
}
const reqLine = (r, n) => `  ${String(n).padStart(2)}. ${r.date} from ${r.from}: ${r.title}`;

// --- the board's queues: a task Jerry gave in chat goes on the board by itself (CL-199) ----
// Adds "- [>] **XX-n** what" as the first task under "### <Agent>" in "## Queues".
function addTask(agent, id, what, box = '>') {
  const text = read(boardPath), eol = eolOf(text);
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const q = lines.findIndex((l) => /^## Queues\b/.test(l));
  if (q < 0) return false;
  let h = -1;
  for (let i = q + 1; i < lines.length && !/^## /.test(lines[i]); i++) if (new RegExp('^### ' + AGENTS[agent] + '\\b', 'i').test(lines[i])) { h = i; break; }
  if (h < 0) return false;
  let j = h + 1;
  while (j < lines.length && !/^\s*- \[/.test(lines[j]) && !/^#{2,4} /.test(lines[j])) j++;
  const line = `- [${box}] **${id}** ${what || '(from Jerry, in chat)'}`;
  if (/^\s*- \[/.test(lines[j] || '')) lines.splice(j, 0, line);
  else {
    let k = j; while (k > h + 1 && !lines[k - 1].trim()) k--;
    lines.splice(k, 0, ...(lines[k - 1].trim() ? [''] : []), line, ...(k === j ? [''] : []));
  }
  fs.writeFileSync(boardPath, lines.join(eol), 'utf8');
  return true;
}

// --- reviews done in bulk: "REVIEWED · before 2026-10-14 · <verdict>" closes every review asked
// for before that day (Jerry, CL-199: the old backlog was archived, not read one by one).
const bulkBefore = (text) => (/^before (\d{4}-\d{2}-\d{2})\b/.exec(text || '') || [])[1];

// --- the game-test slot, read-only, for the briefing ---------------------------------------
async function slotSummary() {
  try {
    const { defaultGameTestSlot } = await import('../tools/game-test-slot.mjs');
    const s = await defaultGameTestSlot.status({ reconcile: false });
    const h = s.holder ? `${AGENTS[s.holder.agent] || s.holder.agent} has it (${s.holder.task}, since ${ago(s.holder.startedAt)})` : 'free';
    const q = s.queue.length ? ' · queue: ' + s.queue.map((x) => `${x.position}. ${AGENTS[x.agent] || x.agent} ${x.task}${x.ready ? '' : ' (prepared; its agent must resume it)'}`).join(', ') : ' · queue empty';
    return `${h}${q}`;
  } catch (e) { return `unknown here (${e.message.split('\n')[0]})`; }
}

// --- archive: keep the files everyone reads small (CL-199) ---------------------------------
// LOG lines and requests older than --days move to crew/archive/log-YYYY-MM.md and
// handoffs/archive/requests-YYYY-MM.md (by the day in their heading). Anything another
// agent appends while this runs is kept: the file is re-read just before the write.
function rewriteKeepingTail(file, before, after) {
  const again = read(file);
  if (!again.startsWith(before)) throw new Error(`${path.relative(ROOT, file)} changed under us; run archive again`);
  fs.writeFileSync(file, after + again.slice(before.length), 'utf8');
}
function archiveOld(days) {
  const cut = new Date(Date.now() - days * 864e5).toISOString();
  const moved = { log: 0, req: 0 };
  // log
  const logText = read(logPath), eol = eolOf(logText);
  const keep = [], byMonth = {};
  // A review Claude still owes stays in the log until it's done.
  const owed = new Set(pendingReviews().map((e) => (/(handoffs\/\S+\.md)/.exec(e.text) || [])[1]));
  for (const l of logText.split(/\r?\n/)) {
    const [at, , kind, ...rest] = l.startsWith('- ') ? l.slice(2).split(' · ') : [''];
    if (kind === 'REVIEW' && owed.has((/(handoffs\/\S+\.md)/.exec(rest.join(' · ')) || [])[1])) { keep.push(l); continue; }
    if (at && /^\d{4}-\d{2}-\d{2}T/.test(at) && at < cut) { (byMonth[at.slice(0, 7)] ||= []).push(l); moved.log++; } else keep.push(l);
  }
  if (moved.log) {
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
    for (const [m, ls] of Object.entries(byMonth)) append(path.join(archiveDir, `log-${m}.md`), ls, `# Crew log, ${m} (archived)\n\nMoved here from crew/LOG.md by \`node crew/crew.mjs archive\`. Oldest first.\n\n`);
    // The text after the last line we read is kept as it is (an agent may have just appended).
    const body = keep.join(eol);
    rewriteKeepingTail(logPath, logText, body.endsWith(eol) || !logText.endsWith(eol) ? body : body + eol);
  }
  // requests
  const reqText = read(requestsPath);
  // Every dated section goes, requests and notes alike ("## 2026-09-23 · Claude (lead) · state of play").
  const secs = []; const heads = [...reqText.matchAll(/^## (\d{4}-\d{2}-\d{2})\b.*$/gm)];
  // A section runs to the next dated heading: undated "## " lines inside a request are part of it.
  heads.forEach((m, k) => secs.push({ start: m.index, end: k + 1 < heads.length ? heads[k + 1].index : reqText.length, date: m[1] }));
  const go = secs.filter((r) => r.date < cut.slice(0, 10));
  if (go.length) {
    const hd = path.join(ROOT, 'handoffs', 'archive');
    if (!fs.existsSync(hd)) fs.mkdirSync(hd, { recursive: true });
    const reqEol = eolOf(reqText);
    const byM = {};
    for (const r of go) (byM[r.date.slice(0, 7)] ||= []).push(reqText.slice(r.start, r.end).replace(/(\r?\n)+$/, ''));
    for (const [m, parts] of Object.entries(byM)) append(path.join(hd, `requests-${m}.md`), parts.flatMap((p) => ['', ...p.split(/\r?\n/)]), `# Requests, ${m} (archived)\n\nMoved here from handoffs/requests.md by \`node crew/crew.mjs archive\`.\n`);
    let out = '', pos = 0;
    for (const r of go) { out += reqText.slice(pos, r.start); pos = r.end; }
    out += reqText.slice(pos);
    rewriteKeepingTail(requestsPath, reqText, out.replace(/(\r?\n){3,}/g, reqEol + reqEol));
    moved.req = go.length;
  }
  return moved;
}

// --- me: the start-of-session briefing (CL-199) -------------------------------------------
async function briefing(agent) {
  const s = readStatus(agent), f = s.fields;
  const out = [];
  out.push(`\n${AGENTS[agent].toUpperCase()} · ${(f.state || '?')}${f.task && f.task !== DASH ? ' · ' + f.task : ''} · last seen ${ago(f.since)}`);
  if (f.state === 'blocked') out.push(`  blocked on: ${f['blocked-on']}`);
  out.push('─'.repeat(78));
  const board = read(boardPath).replace(/\r\n/g, '\n');
  const orders = (/^## Orders from Jerry\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(board) || [, ''])[1].split('\n').filter((l) => /^- /.test(l)).slice(0, 4);
  if (orders.length) { out.push("Jerry's latest orders (crew/BOARD.md):"); for (const o of orders) out.push('  ' + o.replace(/\*\*/g, '').slice(0, 150)); }
  const reqs = requestsFor(agent);
  out.push(reqs.length ? `Requests waiting for your answer (${reqs.length}):` : 'Requests waiting for your answer: none.');
  reqs.slice(-8).forEach((r, i) => out.push(reqLine(r, i + 1)));
  if (reqs.length) out.push(`  Answer each: node crew/crew.mjs reply ${agent} "<words from its title>" DONE|WONT|LATER|NOTE "<one line>"`);
  const mineRev = reviewAssets().filter((r) => r.owner === agent && (r.state === 'waiting' || r.state === 'taken'));
  if (mineRev.length) out.push(`Jerry's notes on your review folders: ${mineRev.map((r) => r.asset).join(', ')} (node crew/crew.mjs next ${agent} says how)`);
  const all = boardTasks().filter((t) => t.id.startsWith(PREFIX[agent] + '-') && t.box !== 'x' && t.box !== '~');
  out.push(all.length ? 'Your queue (crew/BOARD.md):' : 'Your queue is empty: Claude adds work to the board, or Jerry gives it in chat.');
  const mk = { ' ': '○', '>': '▶', '!': '!' };
  for (const t of all.slice(0, 8)) { const g = gateOf(t, boardTasks()); out.push(`  ${mk[t.box] || t.box} ${t.id} ${t.text.replace(/\*\*/g, '').slice(0, 110)}${g ? ` (waits on ${g.id})` : ''}`); }
  out.push('Game-test slot: ' + await slotSummary());
  const notes = s.notes.replace(/^## Notes\s*/, '').trim();
  if (notes) {
    const ls = notes.split('\n').filter((l) => l.trim());
    out.push(`Your card's notes (crew/status/${agent}.md, ${ls.length} lines${notes.length > 6000 ? `, ${Math.round(notes.length / 1024)} KB: please trim it to what your next session needs` : ''}):`);
    for (const l of ls.slice(0, 12)) out.push('  ' + l.slice(0, 150));
    if (ls.length > 12) out.push(`  … ${ls.length - 12} more lines in the file`);
  }
  const p = problems(Object.keys(AGENTS).map(readStatus)).filter((x) => x.startsWith(agent) || x.includes(agent + ' ('));
  for (const x of p) out.push('! ' + x);
  out.push('─'.repeat(78));
  out.push(`Work:   node crew/crew.mjs in ${agent} <id> "<what>" --model "<model>" --touch "<files>"   (new task? node crew/crew.mjs newid ${agent} "<what>")`);
  out.push(`        node crew/crew.mjs note ${agent} "<one line>"`);
  out.push(`Test:   node crew/crew.mjs slot run ${agent} <id> --checks "<what you check>" -- <command>   (one instance, --jobs 1; Jerry first)`);
  out.push(`        session ending before your turn? node crew/crew.mjs wait ${agent} "<what is ready>"`);
  out.push(`Finish: node crew/crew.mjs out ${agent} --report handoffs/<date>-${agent}-<id>.md --done`);
  out.push(`Ask:    node crew/crew.mjs request ${agent} <to> "<title>" "<body>"   ·   Jerry only: node crew/crew.mjs ask ${agent} "<question>"`);
  console.log(out.join('\n') + '\n');
}

function arg(name) { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : undefined; }
function need(agent) {
  if (!AGENTS[agent]) { console.error(`Unknown agent "${agent}". Use one of: ${Object.keys(AGENTS).join(', ')}`); process.exit(2); }
}
function checkReport(rep) {
  const file = path.join(ROOT, rep);
  if (!fs.existsSync(file)) return [`the report ${rep} does not exist yet — write it before checking out`];
  const t = read(file);
  const missing = ['Changed:', 'Tests:', 'Not verified:'].filter((k) => !t.includes(k));
  return missing.length ? [`the report is missing ${missing.join(', ')} — use the template in AGENTS.md`] : [];
}

const [cmd, agent, ...rest] = process.argv.slice(2);
const VALUE_FLAGS = ['--touch', '--report', '--next', '--blocked', '--model', '--review', '--body-file', '--version', '--before', '--days'];
const positional = rest.filter((x, i) => !x.startsWith('--') && !(i > 0 && VALUE_FLAGS.includes(rest[i - 1])));

if (!cmd || cmd === 'panel') {
  await panel();
} else if (cmd === 'slot') {
  const { main: gameTestSlotMain } = await import('../tools/game-test-slot.mjs');
  await gameTestSlotMain(process.argv.slice(3));
} else if (cmd === 'mission') {
  const ms = mission();
  if (!ms) console.log('No mission on the board right now.'); else printMission();
} else if (cmd === 'check') {
  const p = problems(Object.keys(AGENTS).map(readStatus));
  if (p.length) { console.log(p.join('\n')); process.exit(1); }
  console.log('ok');
} else if (cmd === 'next') {
  need(agent);
  // Jerry's notes on your review folders come before the queue: he is waiting on them.
  const mine = reviewAssets().filter((r) => r.owner === agent && (r.state === 'waiting' || r.state === 'taken'));
  if (mine.length) {
    const r = mine[0];
    console.log(`Jerry's note on review/${r.asset}/ (${[...r.open, ...r.taken].map((n) => n.version + ': ' + n.text).join(' | ')})\n` +
      (r.state === 'waiting' ? `  First: node crew/crew.mjs review take ${r.asset}   (the request it writes says the rest)` : `  You've taken it: change the clip, render it (node tools/studio.mjs render ... --asset ${r.asset}), then node crew/crew.mjs review answer ${r.asset} ${agent} "<what changed>"`));
    process.exit(0);
  }
  const t = nextTask(agent), w = waitingTask(agent);
  if (t) console.log(`${t.id} ${t.text.replace(/\*\*/g, '')}`);
  else if (w) console.log(`Nothing you can start yet. ${w.task.id} waits on ${w.on.id} (${ownerOf(w.on.id)}). Stop here: the board will change when it's ready.`);
  else console.log('Your queue is empty. Stop here; Claude adds work to the board.');
} else if (cmd === 'in') {
  need(agent);
  const [taskId, what] = positional;
  if (!taskId) { console.error('Usage: crew in <agent> <task-id> "<what>" --model "<model>" --touch "file (part), file"'); process.exit(2); }
  // Jerry moves agents between models, so every check-in says which model is doing the work.
  const model = (arg('model') || '').trim();
  if (!model) {
    console.error('Not checked in: say which model this session runs on, for example\n' +
      `  node crew/crew.mjs in ${agent} ${taskId} "${what || '<what>'}" --model "Claude Sonnet 4.6" --touch "<files>"\n` +
      'Use the model name your editor or app shows for this session. If you are not sure, say so in the name: --model "unsure (editor says X)".');
    process.exit(2);
  }
  const touching = arg('touch') || DASH;
  const others = Object.keys(AGENTS).filter((a) => a !== agent).map(readStatus).filter((s) => s.fields.state === 'active');
  const hits = [];
  for (const o of others) for (const a of split(touching)) for (const b of split(o.fields.touching)) if (clash(a, b)) hits.push(`${o.agent} is active in ${b} (${o.fields.task}, ${ago(o.fields.since)})`);
  if (hits.length && !process.argv.includes('--force')) {
    console.error('Not checked in — someone is already in that file:\n  ' + hits.join('\n  ') +
      '\nPick another task, or ask in handoffs/requests.md. If their check-in is stale, add --force and say why in a note.');
    process.exit(1);
  }
  const s = readStatus(agent);
  const oldModel = s.fields.model || DASH;
  Object.assign(s.fields, { state: 'active', task: `${taskId} ${what || ''}`.trim(), touching, since: now(), 'blocked-on': DASH });
  s.fields.model = model;
  writeStatus(s);
  // A task Jerry gave in chat that isn't on the board yet goes under your name on it (CL-199).
  const onBoard = markTask(agent, taskId, '>');
  if (!onBoard && taskId.startsWith(PREFIX[agent] + '-') && addTask(agent, taskId, what)) console.log(`${taskId} was not on the board: added under ${AGENTS[agent]} in crew/BOARD.md.`);
  // "Claude Sonnet 4.6, in Antigravity (...)" and "Claude Sonnet 4.6" are the same model.
  const modelKey = (m) => String(m).split(/,| \(/)[0].trim().toLowerCase();
  if (modelKey(oldModel) !== modelKey(model)) log(agent, 'MODEL', `${oldModel} → ${model}`);
  log(agent, 'IN', `${s.fields.task} · on ${model}${touching !== DASH ? ' · touching ' + touching : ''}`);
  console.log(`${AGENTS[agent]} checked in: ${s.fields.task}`);
  await panel();
} else if (cmd === 'note') {
  need(agent);
  const text = positional.join(' ').trim();
  if (!text) { console.error('Usage: crew note <agent> "<one line of progress>"'); process.exit(2); }
  log(agent, 'NOTE', text);
  console.log('noted');
} else if (cmd === 'out') {
  need(agent);
  const s = readStatus(agent);
  const blocked = arg('blocked'), report = arg('report'), review = arg('review');
  const finished = s.fields.task;
  const taskId = (finished || '').split(' ')[0];
  const warn = report ? checkReport(report) : ['no --report given: every task ends with a handoff note (AGENTS.md rule 8)'];
  Object.assign(s.fields, {
    state: blocked ? 'blocked' : 'idle',
    'blocked-on': blocked || DASH,
    touching: DASH,
    since: now(),
    'last-report': report || s.fields['last-report'] || DASH,
  });
  if (!blocked) s.fields.task = DASH;
  if (process.argv.includes('--done')) markTask(agent, taskId, 'x');
  else if (blocked) markTask(agent, taskId, '!');
  const nt = nextTask(agent);
  s.fields.next = arg('next') || (nt ? `${nt.id} ${nt.text.replace(/\*\*/g, '').slice(0, 60)}` : waitingTask(agent) ? `waits on ${waitingTask(agent).on.id}` : DASH);
  writeStatus(s);
  log(agent, blocked ? 'BLOCKED' : (process.argv.includes('--done') ? 'DONE' : 'OUT'), `${finished || DASH}${report ? ' · report ' + report : ''}${blocked ? ' · on ' + blocked : ''}`);
  if (review) log(agent, 'REVIEW', `${report || DASH} · ${review}`);
  console.log(blocked ? `${AGENTS[agent]} marked blocked: ${blocked}` : `${AGENTS[agent]} checked out.`);
  for (const w of warn) console.log('! ' + w);
  const wt = waitingTask(agent);
  console.log(blocked ? '' : nt ? `Next on your queue: ${nt.id}. Keep going unless Jerry said otherwise (AGENTS.md).`
    : wt ? `Stop here. Your next task, ${wt.task.id}, waits on ${wt.on.id} (${ownerOf(wt.on.id)}).` : 'Your queue is empty. Stop here.');
  await panel();
} else if (cmd === 'ask') {
  need(agent);
  const text = positional.join(' ').trim();
  if (!text) { console.error('Usage: crew ask <agent> "<question for Jerry>"'); process.exit(2); }
  const n = questions().reduce((m, q) => Math.max(m, +q.id.slice(2)), 0) + 1;
  append(questionsPath, ['', `## Q-${n} · open · ${now()} · ${agent}`, '', text], '# Questions for Jerry\n\nAsked with `node crew/crew.mjs ask`. Claude or Jerry answers under the question and closes it.\n');
  log(agent, 'ASK', `Q-${n} ${text.slice(0, 120)}`);
  console.log(`Asked as Q-${n}. Carry on with other work; the answer will be in crew/QUESTIONS.md.`);
} else if (cmd === 'answer') {
  const id = agent, text = positional.join(' ').trim();
  const t = read(questionsPath);
  const re = new RegExp(`^## ${id} · open · (.*)$`, 'm');
  if (!re.test(t)) { console.error(`No open question ${id}.`); process.exit(2); }
  const eol = eolOf(t);
  let next = t.replace(re, `## ${id} · answered · $1`);
  // The answer goes at the end of that question's section.
  const start = next.search(new RegExp(`^## ${id} · `, 'm'));
  const after = next.slice(start + 3).search(/^## /m);
  const cut = after < 0 ? next.length : start + 3 + after;
  next = next.slice(0, cut).trimEnd() + eol + eol + `**Answer (${now()}):** ${text}` + eol + (after < 0 ? '' : eol + next.slice(cut));
  fs.writeFileSync(questionsPath, next, 'utf8');
  log('claude', 'ANSWER', `${id} ${text.slice(0, 120)}`);
  console.log('answered ' + id);
} else if (cmd === 'reviewed') {
  const before = arg('before');
  if (before) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(before)) { console.error('Usage: crew reviewed --before YYYY-MM-DD "<verdict>"'); process.exit(2); }
    const n = pendingReviews().filter((w) => w.at < before).length;
    const verdict = [agent, ...positional].filter((x) => x && x !== before).join(' ').trim() || 'archived';
    log('claude', 'REVIEWED', `before ${before} · ${verdict}`);
    console.log(`${n} older review${n === 1 ? '' : 's'} closed (asked for before ${before}).`);
  } else {
    const rep = agent, verdict = positional.join(' ').trim() || 'ok';
    log('claude', 'REVIEWED', `${rep} · ${verdict}`);
    console.log('review recorded');
  }
} else if (cmd === 'review') {
  // agent is the sub-command here: (none) | take | answer
  const sub = agent;
  const list = reviewAssets();
  writeReviewIndex(list);
  if (!sub) {
    if (!list.length) { console.log('No review folders yet. The studio makes them: node tools/studio.mjs render <clip.json>'); process.exit(0); }
    for (const r of list) if (!fs.existsSync(r.notesFile)) fs.writeFileSync(r.notesFile, notesStub(r.asset, r.latest, now().slice(0, 10)), 'utf8');
    console.log('asset                  now  owner       notes');
    for (const r of list) console.log(reviewLine(r));
    const w = list.filter((r) => r.state === 'waiting');
    if (w.length) console.log(`\n${w.length} waiting. The owner (or Claude) takes one: node crew/crew.mjs review take ${w[0].asset}`);
  } else if (sub === 'take') {
    const [name] = positional;
    const r = list.find((x) => x.asset === name);
    if (!r) { console.error(`No review folder "${name}". Folders: ${list.map((x) => x.asset).join(', ') || 'none'}`); process.exit(2); }
    if (!r.open.length) { console.log(`Nothing waiting on ${name} (${REVIEW_WORD[r.state]}).`); process.exit(0); }
    const owner = r.owner, day = now().slice(0, 10);
    const clip = r.meta.clip ? `studio/clips/${r.meta.rig || 'guardian'}/${r.meta.clip}.json` : null;
    const body = [
      `Jerry's note${r.open.length > 1 ? 's' : ''} on review/${name}/ (now at ${r.latest}), from review/${name}/notes.md:`,
      '',
      ...r.open.map((n) => `> ${n.date} · ${n.version}: ${n.text}`),
      '',
      `Owner: ${AGENTS[owner]}${r.meta.task && !/^CU-44$/.test(r.meta.task) ? ` (task ${r.meta.task})` : ''}.${r.meta.reference ? ` Reference: ${r.meta.reference} (assets/anim/reference/).` : ''}`,
      `1. Change ${clip ? '`' + clip + '`' : 'the asset'} to answer the note. Check it on the strip, not by guesswork: the stats say where a joint snaps or a foot slides.`,
      `2. Render the next version: \`node tools/studio.mjs render ${clip || '<clip.json>'} --asset ${name}${r.meta.reference ? ' --vs ' + r.meta.reference : ''}\``,
      `3. Answer under Jerry's note: \`node crew/crew.mjs review answer ${name} ${owner} "<what changed, in one line>"\``,
    ].join('\n');
    const title = `Jerry's note on ${name} (${r.open.map((n) => n.version).join(', ')})`;
    append(requestsPath, ['', `## ${day} · Claude → ${AGENTS[owner]} · ${title}`, '', ...body.split('\n')]);
    for (const n of r.open) addUnderNote(r.notesFile, n, [`> ${owner} · taken · ${day}`]);
    log('claude', 'REQUEST', `→ ${AGENTS[owner]}: ${title}`);
    console.log(`Taken: a request for ${AGENTS[owner]} is in handoffs/requests.md, and notes.md says so under Jerry's note.`);
  } else if (sub === 'answer') {
    const [name, who, ...words] = positional;
    const text = words.join(' ').trim();
    need(who);
    const r = list.find((x) => x.asset === name);
    if (!r || !text) { console.error('Usage: crew review answer <asset> <agent> "<what changed>" [--version vN]'); process.exit(2); }
    const version = arg('version') || r.latest;
    const todo = r.notes.filter((n) => n.state === 'waiting' || n.state === 'taken');
    if (!todo.length) { console.error(`No open note on ${name} to answer (${REVIEW_WORD[r.state]}).`); process.exit(2); }
    if (todo.some((n) => +n.version.slice(1) >= +String(version).slice(1)) && !process.argv.includes('--force')) {
      console.error(`Not answered: ${name} is still at ${version}, the version Jerry wrote about. Render the change first (node tools/studio.mjs render <clip.json> --asset ${name}) so he has a new version to look at. (--force to answer without one, e.g. "can't be done, here's why".)`);
      process.exit(2);
    }
    const day = now().slice(0, 10);
    for (const n of todo) addUnderNote(r.notesFile, n, [`> ${who} · ${version} · ${day}: ${text}`]);
    log(who, 'NOTE', `answered Jerry's note on ${name}: look at ${version} · ${text.slice(0, 100)}`);
    console.log(`Answered under Jerry's note in review/${name}/notes.md: look at ${version}.`);
  } else { console.error('Usage: crew review | review take <asset> | review answer <asset> <agent> "<what changed>"'); process.exit(2); }
} else if (cmd === 'newid') {
  need(agent);
  const what = positional.join(' ').trim();
  if (!what) { console.error('Usage: crew newid <agent> "<what the task is, a few words>"'); process.exit(2); }
  const id = nextId(agent);
  log(agent, 'ID', `${id} ${what.slice(0, 120)}`);
  console.log(id);
} else if (cmd === 'tidy') {
  const ids = tidyBoard();
  if (!ids.length) { console.log('Nothing finished on the board.'); process.exit(0); }
  log('claude', 'NOTE', `tidy: ${ids.length} finished task${ids.length > 1 ? 's' : ''} moved to crew/archive/board-queues-${now().slice(0, 10)}.md (${ids.join(', ')})`);
  console.log(`Moved ${ids.length} finished task${ids.length > 1 ? 's' : ''} to crew/archive/board-queues-${now().slice(0, 10)}.md: ${ids.join(', ')}`);
} else if (cmd === 'me') {
  need(agent);
  await briefing(agent);
} else if (cmd === 'requests') {
  need(agent);
  const list = requestsFor(agent, { all: process.argv.includes('--all') });
  if (!list.length) console.log(`No open requests for ${AGENTS[agent]}${process.argv.includes('--all') ? '' : ' from today and yesterday (--all for older ones)'}.`);
  else { list.forEach((r, i) => console.log(reqLine(r, i + 1))); console.log(`\nAnswer: node crew/crew.mjs reply ${agent} <number or words from the title> DONE|WONT|LATER|NOTE "<one line>"`); }
} else if (cmd === 'reply') {
  need(agent);
  const [which, status0, ...words] = positional;
  const status = String(status0 || '').toUpperCase();
  const text = words.join(' ').trim();
  if (!which || !['DONE', 'WONT', 'LATER', 'NOTE'].includes(status) || !text) {
    console.error('Usage: crew reply <agent> <number from `requests`, or words from the title> DONE|WONT|LATER|NOTE "<one line>"'); process.exit(2);
  }
  const all = process.argv.includes('--all');
  const mine = requestsFor(agent, { all: true });
  const recent = requestsFor(agent, { all });
  let hit = /^\d+$/.test(which) ? recent[+which - 1] : null;
  if (!hit) {
    const w = which.toLowerCase();
    const found = [...mine].reverse().filter((r) => r.title.toLowerCase().includes(w));
    if (found.length > 1 && !found.every((r) => r.title === found[0].title)) {
      console.error(`"${which}" matches ${found.length} requests; use more words or the number:\n` + found.slice(0, 6).map((r, i) => reqLine(r, i + 1)).join('\n')); process.exit(2);
    }
    hit = found[0];
  }
  if (!hit) {
    // Also allow answering one already answered, or one not addressed to you by name.
    const w = which.toLowerCase();
    hit = [...parseRequests(read(requestsPath))].reverse().find((r) => r.title.toLowerCase().includes(w));
    if (hit) console.log(`(Not one of your open requests: answering "${hit.title}", ${hit.from} → ${hit.to.map((a) => AGENTS[a] || a).join(', ')}.)`);
  }
  if (!hit) { console.error(`No request whose title has "${which}". node crew/crew.mjs requests ${agent} --all lists yours.`); process.exit(2); }
  const cur = read(requestsPath), eol = eolOf(cur);
  // Re-find it in the file as it is now, then add the answer at the end of its section.
  const fresh = parseRequests(cur).find((r) => r.date === hit.date && r.title === hit.title && r.from === hit.from);
  const end = fresh.end;
  const sectionText = cur.slice(fresh.start, end).replace(/(\r?\n)+$/, '');
  const word = status === 'NOTE' ? '' : ` ${status}.`;
  const line = `**${AGENTS[agent]}, ${now().slice(0, 10)}:${word}** ${text}`;
  const next = cur.slice(0, fresh.start) + sectionText + eol + eol + line + eol + (end < cur.length ? eol + cur.slice(end).replace(/^(\r?\n)+/, '') : '');
  rewriteKeepingTail(requestsPath, cur, next);
  log(agent, 'REPLY', `${status} · ${hit.from}: ${hit.title.slice(0, 90)} · ${text.slice(0, 100)}`);
  console.log(`Answered "${hit.title}" (${hit.from}, ${hit.date}) with ${status}.`);
} else if (cmd === 'wait') {
  // Jerry, 2026-10-15: a session that ends before its turn in the game-test queue says so, not "done".
  need(agent);
  const what = positional.join(' ').trim();
  if (!what) { console.error('Usage: crew wait <agent> "<what is ready to test>"'); process.exit(2); }
  const s = readStatus(agent);
  Object.assign(s.fields, { state: 'blocked', 'blocked-on': `game-test slot · changes ready: ${what}`, since: now() });
  writeStatus(s);
  markTask(agent, (s.fields.task || '').split(' ')[0], '!');
  log(agent, 'WAIT', `${s.fields.task || DASH} · changes ready; waiting for testing slot · ${what}`);
  console.log(`Changes ready; waiting for testing slot. Your card says so; Jerry's panel shows it with a resume prompt.`);
} else if (cmd === 'settle') {
  // Lead only: after a clean-up, every request so far counts as answered; what's still to do is on the board.
  append(requestsPath, ['', SETTLED, '']);
  log('claude', 'NOTE', 'requests: everything before now marked settled (crew.mjs settle); open work is on the board');
  console.log('Every request so far is marked settled.');
} else if (cmd === 'archive') {
  const days = Math.max(1, +(arg('days') || 3));
  const m = archiveOld(days);
  if (!m.log && !m.req) console.log(`Nothing older than ${days} days to move.`);
  else { log('claude', 'NOTE', `archive: ${m.log} log lines and ${m.req} requests older than ${days} days moved to crew/archive/ and handoffs/archive/`); console.log(`Moved ${m.log} log lines to crew/archive/log-*.md and ${m.req} requests to handoffs/archive/requests-*.md.`); }
} else if (cmd === 'request') {
  need(agent);
  const [to, title, body] = positional;
  const text = arg('body-file') ? read(path.resolve(arg('body-file'))) : body;
  if (!to || !title || !text) { console.error('Usage: crew request <from> <to> "<title>" "<body>"  (or --body-file <path>)'); process.exit(2); }
  const toName = to.split(',').map((t) => AGENTS[t.trim()] || t.trim()).join(', ');
  // --fyi: telling, not asking. It shows in the log and the file but on nobody's "waiting for your answer" list.
  const fyi = process.argv.includes('--fyi') && !/^FYI\b/i.test(title) ? 'FYI: ' : '';
  append(requestsPath, ['', `## ${now().slice(0, 10)} · ${AGENTS[agent]} → ${toName} · ${fyi}${title}`, '', ...text.replace(/\r\n/g, '\n').trim().split('\n')]);
  log(agent, 'REQUEST', `→ ${toName}: ${fyi}${title}`);
  console.log('request added to handoffs/requests.md');
} else {
  console.error('Commands: me | (none) | next | newid | in | note | wait | out | requests | reply | request | ask | slot | check | mission | review | answer | reviewed | tidy | settle | archive. See the top of crew/crew.mjs.');
  process.exit(2);
}
