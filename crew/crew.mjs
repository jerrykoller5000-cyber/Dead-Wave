#!/usr/bin/env node
// crew/crew.mjs — the Dead-Wave crew board from the command line. No dependencies (Node 22+).
//
//   node crew/crew.mjs                                   who is doing what, and any clashes
//   node crew/crew.mjs in  <agent> <task-id> "<what>" --touch "index.html (boot), tools/x.mjs"
//   node crew/crew.mjs out <agent> --report handoffs/2026-09-23-agent-task.md [--next "<id> ..."]
//   node crew/crew.mjs out <agent> --blocked "<on what>"            leave it blocked, not idle
//   node crew/crew.mjs note <agent> "<one line>"                     add a line to the log
//   node crew/crew.mjs check                                         exit 1 on a clash or stale check-in
//
// Agents: claude, cursor, chatgpt, grokbot.
// The files are the truth; this only reads and writes them. Editing them by hand is fine:
//   crew/status/<agent>.md   your own check-in card. Only you write yours.
//   crew/LOG.md              one line per check-in / check-out. Append only.
//   crew/BOARD.md            orders, decisions and queues. Only Claude (lead) writes it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CREW = path.dirname(fileURLToPath(import.meta.url));
const AGENTS = {
  claude: 'Claude', cursor: 'Cursor', chatgpt: 'ChatGPT', grokbot: 'Grokbot',
};
const FIELDS = ['state', 'model', 'task', 'touching', 'since', 'next', 'blocked-on', 'last-report'];
const STATES = ['active', 'idle', 'blocked', 'away'];
const STALE_HOURS = 8;
const DASH = '—';

const now = () => new Date().toISOString().slice(0, 16) + 'Z';
const statusPath = (a) => path.join(CREW, 'status', a + '.md');
const logPath = path.join(CREW, 'LOG.md');

function readStatus(agent) {
  const file = statusPath(agent);
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
  const fields = {};
  const lines = text.split('\n');
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) break;                     // the notes start here
    const m = /^([a-z-]+):\s*(.*)$/.exec(line);
    if (m && FIELDS.includes(m[1])) fields[m[1]] = m[2].trim();
  }
  const notes = lines.slice(i).join('\n').trimEnd();
  return { agent, fields, notes };
}

function writeStatus({ agent, fields, notes }) {
  const head = ['# ' + AGENTS[agent], ''];
  for (const k of FIELDS) head.push(`${k}: ${fields[k] || DASH}`);
  const body = notes && notes.trim() ? notes : '## Notes\n\n(Anything the next agent should know. Yours to edit.)';
  fs.writeFileSync(statusPath(agent), head.join('\n') + '\n\n' + body + '\n');
}

function appendLog(agent, kind, text) {
  let cur = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '# Crew log\n\nNewest at the bottom. Append only.\n';
  if (!cur.endsWith('\n')) cur += '\n';
  fs.writeFileSync(logPath, cur + `- ${now()} · ${agent} · ${kind} · ${text}\n`);
}

// Commas separate files, except inside a part: "index.html (boot, mergeParts)" is one entry.
const split = (s) => {
  if (!s || s === '—') return [];
  const out = []; let cur = '', depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++; else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
};
const fileOf = (t) => t.replace(/\s*\(.*\)\s*$/, '').replace(/\\/g, '/').toLowerCase();
// Two entries clash when they name the same file and either names no part, either is the
// split freeze, or they share a part: "index.html (boot)" and "index.html (build wheel)"
// can run side by side, "index.html" alone or "index.html (SPLIT FREEZE)" takes the whole file.
// A folder ("world/" or "world/*") clashes with everything inside it.
const partOf = (t) => { const m = /\(([^)]*)\)\s*$/.exec(t); return m ? m[1].trim().toLowerCase() : ''; };
function clash(a, b) {
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

function hoursSince(iso) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? (Date.now() - t) / 36e5 : null;
}
function ago(iso) {
  const h = hoursSince(iso);
  if (h === null) return iso || DASH;
  if (h < 1 / 60) return 'just now';
  if (h < 1) return Math.round(h * 60) + ' min ago';
  if (h < 48) return h.toFixed(1).replace(/\.0$/, '') + ' h ago';
  return Math.round(h / 24) + ' days ago';
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
      if (clash(a, b)) out.push(`CLASH: ${active[i].agent} (${a}) and ${active[j].agent} (${b}) are both in the same file`);
    }
  }
  return out;
}

// The split freeze is on while an active check-in says so in its touching list.
function freezeLine(all = Object.keys(AGENTS).map(readStatus)) {
  const f = all.find((s) => s.fields.state === 'active' && /freeze/i.test(s.fields.touching || ''));
  return f ? `SPLIT FREEZE ON (${AGENTS[f.agent]}, ${ago(f.fields.since)}) — nobody else edits index.html` : 'split freeze off';
}

function panel() {
  const all = Object.keys(AGENTS).map(readStatus);
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  console.log('\nDEAD-WAVE CREW   ·   ' + freezeLine(all));
  console.log('─'.repeat(78));
  for (const s of all) {
    const f = s.fields;
    console.log(pad(AGENTS[s.agent], 9) + pad((f.state || '?').toUpperCase(), 9) + (f.task && f.task !== DASH ? f.task : '(no task)'));
    if (f.state === 'active') console.log(' '.repeat(18) + 'since ' + ago(f.since) + ' · touching: ' + (f.touching || DASH));
    if (f.state === 'blocked') console.log(' '.repeat(18) + 'blocked on: ' + (f['blocked-on'] || DASH));
    if (f.state !== 'active' && f.next && f.next !== DASH) console.log(' '.repeat(18) + 'next: ' + f.next);
  }
  const p = problems(all);
  console.log('─'.repeat(78));
  console.log(p.length ? p.map((x) => '! ' + x).join('\n') : 'No clashes. No stale check-ins.');
  if (fs.existsSync(logPath)) {
    const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter((l) => l.startsWith('- '));
    console.log('\nLast log lines:\n' + lines.slice(-6).join('\n'));
  }
  console.log('\nOrders, decisions and queues: crew/BOARD.md\n');
  return p;
}

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : undefined;
}
function need(agent) {
  if (!AGENTS[agent]) { console.error(`Unknown agent "${agent}". Use one of: ${Object.keys(AGENTS).join(', ')}`); process.exit(2); }
}

const [cmd, agent, ...rest] = process.argv.slice(2);
const VALUE_FLAGS = ['--touch', '--report', '--next', '--blocked', '--model'];
const positional = rest.filter((x, i) => !x.startsWith('--') && !(i > 0 && VALUE_FLAGS.includes(rest[i - 1])));

if (!cmd || cmd === 'panel') {
  panel();
} else if (cmd === 'check') {
  const p = problems(Object.keys(AGENTS).map(readStatus));
  if (p.length) { console.log(p.join('\n')); process.exit(1); }
  console.log('ok');
} else if (cmd === 'in') {
  need(agent);
  const [taskId, what] = positional;
  if (!taskId) { console.error('Usage: crew in <agent> <task-id> "<what>" --touch "file, file"'); process.exit(2); }
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
  Object.assign(s.fields, { state: 'active', task: `${taskId} ${what || ''}`.trim(), touching, since: now(), 'blocked-on': DASH });
  if (arg('model')) s.fields.model = arg('model');
  writeStatus(s);
  appendLog(agent, 'IN', `${s.fields.task}${touching !== DASH ? ' · touching ' + touching : ''}`);
  console.log(`${AGENTS[agent]} checked in: ${s.fields.task}`);
  panel();
} else if (cmd === 'out') {
  need(agent);
  const s = readStatus(agent);
  const blocked = arg('blocked');
  const report = arg('report');
  const finished = s.fields.task;
  Object.assign(s.fields, {
    state: blocked ? 'blocked' : 'idle',
    'blocked-on': blocked || DASH,
    touching: DASH,
    since: now(),
    'last-report': report || s.fields['last-report'] || DASH,
    next: arg('next') || s.fields.next || DASH,
  });
  if (!blocked) s.fields.task = DASH;
  writeStatus(s);
  appendLog(agent, blocked ? 'BLOCKED' : 'OUT', `${finished || DASH}${report ? ' · report ' + report : ''}${blocked ? ' · on ' + blocked : ''}`);
  console.log(blocked ? `${AGENTS[agent]} marked blocked: ${blocked}` : `${AGENTS[agent]} checked out.`);
  panel();
} else if (cmd === 'note') {
  need(agent);
  appendLog(agent, 'NOTE', positional.join(' '));
  console.log('noted');
} else {
  console.error('Commands: (none) | in | out | note | check. See the top of crew/crew.mjs.');
  process.exit(2);
}
