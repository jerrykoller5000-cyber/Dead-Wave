#!/usr/bin/env node
// crew/crew.mjs — the Dead-Wave crew board from the command line. No dependencies (Node 22+).
//
//   node crew/crew.mjs                          who is doing what, clashes, questions, reviews
//   node crew/crew.mjs next <agent>             your next open task on the board
//
//   node crew/crew.mjs in   <agent> <task-id> "<what>" --model "<the model you run on>" --touch "index.html (part), tools/x.mjs"
//   node crew/crew.mjs note <agent> "<progress: what you found or finished, one line>"
//   node crew/crew.mjs out  <agent> --report handoffs/<note>.md [--done] [--next "<id> <what>"]
//                                    [--review "<why the lead should look>"] [--blocked "<on what>"]
//
//   node crew/crew.mjs ask     <agent> "<a question only Jerry can answer>"
//   node crew/crew.mjs request <from> <to> "<title>" "<body>"     (or --body-file <path>)
//   node crew/crew.mjs check                                       exit 1 on a clash or stale check-in
//
//   Lead / Jerry only:
//   node crew/crew.mjs answer   Q-<n> "<answer>"
//   node crew/crew.mjs reviewed <report path> "<verdict>"
//
// Agents: claude, cursor, chatgpt, grokbot, antigravity. Task ids: CL-, CU-, GP-, GB-, AG-.
// The files are the truth; this only reads and writes them (always as UTF-8). By hand is fine:
//   crew/status/<agent>.md   your own check-in card. Only you write yours.
//   crew/LOG.md              one line per event. Append only.
//   crew/BOARD.md            orders, decisions, queues. Claude writes it; agents change only the
//                            box of their OWN task ([ ] [>] [x] [!]), which `in`/`out --done` do.
//   crew/QUESTIONS.md        questions for Jerry. Append only; Claude or Jerry closes them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CREW = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(CREW, '..');
const AGENTS = { claude: 'Claude', cursor: 'Cursor', chatgpt: 'ChatGPT', grokbot: 'Grokbot', antigravity: 'Antigravity' };
const PREFIX = { claude: 'CL', cursor: 'CU', chatgpt: 'GP', grokbot: 'GB', antigravity: 'AG' };
const FIELDS = ['state', 'model', 'task', 'touching', 'since', 'next', 'blocked-on', 'last-report'];
const STATES = ['active', 'idle', 'blocked', 'away'];
// Append-only files everyone shares. Checking in on them never clashes with anyone.
const SHARED = ['crew/log.md', 'crew/questions.md', 'handoffs/requests.md', 'crew/status/'];
const STALE_HOURS = 8;
const DASH = '—';

const now = () => new Date().toISOString().slice(0, 16) + 'Z';
const statusPath = (a) => path.join(CREW, 'status', a + '.md');
const logPath = path.join(CREW, 'LOG.md');
const boardPath = path.join(CREW, 'BOARD.md');
const questionsPath = path.join(CREW, 'QUESTIONS.md');
const requestsPath = path.join(ROOT, 'handoffs', 'requests.md');

const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/^﻿/, '') : '');
// Keep a file's own line endings when we append to or rewrite it.
const eolOf = (text) => (/\r\n/.test(text) ? '\r\n' : '\n');
function append(file, lines, header = '') {
  let cur = read(file) || header;
  const eol = eolOf(cur);
  if (cur && !cur.endsWith('\n')) cur += eol;
  fs.writeFileSync(file, cur + lines.join(eol) + eol, 'utf8');
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
  for (const m of read(boardPath).matchAll(/^\s*- \[( |x|>|!|~)\] \*\*([A-Z]{2}-\d+[a-z]?)\*\*\s*(.*)$/gm)) out.push({ box: m[1], id: m[2], text: m[3] });
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
    const rep = (/(handoffs\/\S+\.md)/.exec(e.text) || [])[1];
    if (!rep) continue;
    if (e.kind === 'REVIEW') want.set(rep, e);
    if (e.kind === 'REVIEWED') want.delete(rep);
  }
  return [...want.values()];
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
function nextTask(agent) {
  return boardTasks().find((t) => t.id.startsWith(PREFIX[agent] + '-') && (t.box === ' ' || t.box === '>'));
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
    const next = tasks.find((t) => t.agent === a && (t.box === '>' || t.box === ' ' || t.box === '!'));
    let waits = false;
    if (f.state === 'blocked') {
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

function panel() {
  const all = Object.keys(AGENTS).map(readStatus);
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  console.log('\nDEAD-WAVE CREW   ·   ' + freezeLine(all));
  console.log('─'.repeat(78));
  const notes = logLines();
  for (const s of all) {
    const f = s.fields;
    console.log(pad(AGENTS[s.agent], 12) + pad((f.state || '?').toUpperCase(), 9) + (f.task && f.task !== DASH ? f.task : '(no task)'));
    console.log(' '.repeat(21) + 'on ' + (f.model && f.model !== DASH ? f.model : '(model not given)'));
    if (f.state === 'active') {
      console.log(' '.repeat(21) + 'since ' + ago(f.since) + ' · touching: ' + (f.touching || DASH));
      const last = [...notes].reverse().find((e) => e.agent === s.agent && e.kind === 'NOTE' && Date.parse(e.at) >= Date.parse(f.since));
      if (last) console.log(' '.repeat(21) + 'latest: ' + last.text);
    }
    if (f.state === 'blocked') console.log(' '.repeat(21) + 'blocked on: ' + (f['blocked-on'] || DASH));
    const nt = nextTask(s.agent);
    if (f.state !== 'active') console.log(' '.repeat(21) + 'next: ' + (nt ? `${nt.id} ${nt.text.replace(/\*\*/g, '').slice(0, 58)}` : (f.next || DASH)));
  }
  const p = problems(all);
  console.log('─'.repeat(78));
  console.log(p.length ? p.map((x) => '! ' + x).join('\n') : 'No clashes. No stale check-ins.');
  console.log(flowSummary(all).join('\n'));
  const q = questions().filter((x) => x.state === 'open');
  if (q.length) console.log(`? ${q.length} open question(s) for Jerry: crew/QUESTIONS.md (${q.map((x) => x.id).join(', ')})`);
  const r = pendingReviews();
  if (r.length) console.log(`» ${r.length} handoff(s) waiting for the lead's review: ${r.map((x) => (/(handoffs\/\S+\.md)/.exec(x.text) || [])[1]).join(', ')}`);
  console.log('\nLast log lines:\n' + notes.slice(-6).map((e) => `- ${e.at} · ${e.agent} · ${e.kind} · ${e.text}`).join('\n'));
  console.log('\nOrders, decisions and queues: crew/BOARD.md\n');
  return p;
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
const VALUE_FLAGS = ['--touch', '--report', '--next', '--blocked', '--model', '--review', '--body-file'];
const positional = rest.filter((x, i) => !x.startsWith('--') && !(i > 0 && VALUE_FLAGS.includes(rest[i - 1])));

if (!cmd || cmd === 'panel') {
  panel();
} else if (cmd === 'check') {
  const p = problems(Object.keys(AGENTS).map(readStatus));
  if (p.length) { console.log(p.join('\n')); process.exit(1); }
  console.log('ok');
} else if (cmd === 'next') {
  need(agent);
  const t = nextTask(agent);
  console.log(t ? `${t.id} ${t.text.replace(/\*\*/g, '')}` : 'Your queue is empty. Check out, and say so in your card\'s next: field.');
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
  markTask(agent, taskId, '>');
  // "Claude Sonnet 4.6, in Antigravity (...)" and "Claude Sonnet 4.6" are the same model.
  const modelKey = (m) => String(m).split(/,| \(/)[0].trim().toLowerCase();
  if (modelKey(oldModel) !== modelKey(model)) log(agent, 'MODEL', `${oldModel} → ${model}`);
  log(agent, 'IN', `${s.fields.task} · on ${model}${touching !== DASH ? ' · touching ' + touching : ''}`);
  console.log(`${AGENTS[agent]} checked in: ${s.fields.task}`);
  panel();
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
  s.fields.next = arg('next') || (nt ? `${nt.id} ${nt.text.replace(/\*\*/g, '').slice(0, 60)}` : DASH);
  writeStatus(s);
  log(agent, blocked ? 'BLOCKED' : (process.argv.includes('--done') ? 'DONE' : 'OUT'), `${finished || DASH}${report ? ' · report ' + report : ''}${blocked ? ' · on ' + blocked : ''}`);
  if (review) log(agent, 'REVIEW', `${report || DASH} · ${review}`);
  console.log(blocked ? `${AGENTS[agent]} marked blocked: ${blocked}` : `${AGENTS[agent]} checked out.`);
  for (const w of warn) console.log('! ' + w);
  console.log(nt && !blocked ? `Next on your queue: ${nt.id}. Keep going unless Jerry said otherwise (AGENTS.md).` : '');
  panel();
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
  const rep = agent, verdict = positional.join(' ').trim() || 'ok';
  log('claude', 'REVIEWED', `${rep} · ${verdict}`);
  console.log('review recorded');
} else if (cmd === 'request') {
  need(agent);
  const [to, title, body] = positional;
  const text = arg('body-file') ? read(path.resolve(arg('body-file'))) : body;
  if (!to || !title || !text) { console.error('Usage: crew request <from> <to> "<title>" "<body>"  (or --body-file <path>)'); process.exit(2); }
  const toName = to.split(',').map((t) => AGENTS[t.trim()] || t.trim()).join(', ');
  append(requestsPath, ['', `## ${now().slice(0, 10)} · ${AGENTS[agent]} → ${toName} · ${title}`, '', ...text.replace(/\r\n/g, '\n').trim().split('\n')]);
  log(agent, 'REQUEST', `→ ${toName}: ${title}`);
  console.log('request added to handoffs/requests.md');
} else {
  console.error('Commands: (none) | next | in | note | out | ask | request | check | answer | reviewed. See the top of crew/crew.mjs.');
  process.exit(2);
}
