// crew/notes.mjs — reads Jerry's notes on a review folder (review/<asset>/notes.md, D-40, CL-60).
// Pure text in, plain objects out: crew.mjs uses it in Node and crew/panel.html imports it in the
// browser, so both say the same thing about the same file.
//
// The format (docs/studio.md §5) is a heading per note and plain sentences under it:
//
//   ## 2026-09-27 · Jerry · v1
//   The drag feels floaty. It should dig in harder on each heave.
//
//   > claude · taken · 2026-09-27
//   > claude · v2 · 2026-09-27: each heave now plants both hind feet and throws the shoulders back.
//
// A note with no `>` line under it is waiting. `> <agent> · taken` means the owner has it on the
// board. `> <agent> · vN` is an answer: look at vN. A note that starts "good" or "approved" closes
// the asset at that version. Anything inside <!-- --> is ignored (the stub's example lives there).

// A note's heading: "## 2026-09-27 · Jerry · v1". Typed by hand in Notepad, so be kind: dashes, bars or
// commas work as well as the dot, the order doesn't matter, "V2" is v2, and no date or name is fine.
const HEAD_VERSION = /\bv(\d+)\b/i;
const HEAD_DATE = /\b(\d{4}-\d{2}-\d{2})\b/;
function readHead(line) {
  const t = line.trim();
  if (!/^## /.test(t)) return null;
  const v = HEAD_VERSION.exec(t);
  if (!v) return null;
  const d = HEAD_DATE.exec(t);
  const rest = t.slice(3).replace(HEAD_DATE, ' ').replace(HEAD_VERSION, ' ').replace(/[·|,\-–—:]+/g, ' ').trim();
  return { head: t, date: d ? d[1] : '', who: rest || 'Jerry', version: 'v' + (+v[1]) };
}
const REPLY = /^> *(\w+) *· *(taken|v\d+) *· *([^:]*?)\s*(?::\s*(.*))?$/;
const vnum = (v) => (v ? +String(v).slice(1) : 0);

export function parseNotes(text) {
  const clean = String(text || '').replace(/^﻿/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\r\n/g, '\n');
  const notes = [];
  let cur = null;
  for (const line of clean.split('\n')) {
    const h = readHead(line);
    if (h) { cur = { ...h, text: [], replies: [] }; notes.push(cur); continue; }
    if (/^## /.test(line)) { cur = null; continue; }
    if (!cur) continue;
    const r = REPLY.exec(line.trim());
    if (r) cur.replies.push({ agent: r[1].toLowerCase(), kind: r[2] === 'taken' ? 'taken' : 'answer', version: r[2] === 'taken' ? null : r[2], date: r[3], text: (r[4] || '').trim() });
    else if (line.trim() && !line.trim().startsWith('>')) cur.text.push(line.trim());
  }
  for (const n of notes) {
    n.text = n.text.join(' ');
    const answer = [...n.replies].reverse().find((r) => r.kind === 'answer');
    n.approved = /^(good|approved)\b/i.test(n.text);
    n.answer = answer || null;
    n.state = n.approved ? 'approved' : answer ? 'answered' : n.replies.some((r) => r.kind === 'taken') ? 'taken' : 'waiting';
  }
  return notes;
}

// Where an asset stands, given its notes and the version its latest.txt names.
//   state: 'no-notes' | 'waiting' (Jerry wrote, nobody has it) | 'taken' (the owner is on it)
//        | 'look' (answered: a newer version is there for Jerry) | 'approved'
export function reviewState(notes, latest) {
  const open = notes.filter((n) => n.state === 'waiting');
  const taken = notes.filter((n) => n.state === 'taken');
  const newest = [...notes].sort((a, b) => vnum(b.version) - vnum(a.version) || (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))[0];
  const answered = notes.filter((n) => n.state === 'answered');
  const lookAt = answered.length ? answered.map((n) => n.answer.version).sort((a, b) => vnum(b) - vnum(a))[0] : null;
  let state = 'no-notes';
  if (open.length) state = 'waiting';
  else if (taken.length) state = 'taken';
  else if (newest && newest.approved) state = 'approved';
  // Answered and Jerry hasn't written about that version yet: his move.
  else if (lookAt && !notes.some((n) => vnum(n.version) >= vnum(lookAt))) state = 'look';
  else if (newest) state = 'answered-seen';
  return { state, open, taken, lookAt, approvedAt: newest && newest.approved ? newest.version : null, latest: latest || null, count: notes.length };
}

// The stub a new notes.md starts as. Everything in the comment is ignored by the parser.
export function notesStub(asset, latest, today) {
  const v = latest || 'v1', d = today || '2026-09-27';
  return `# Notes on ${asset}

<!--
Jerry: open index.html in this folder and watch. Then, below this box, write a line starting with
## and the date, your name and the version you watched (the big "${v}" at the top of index.html),
and your note under it in plain sentences. Dashes are fine. Write "good" when it's right.
For example:

## ${d} - Jerry - ${v}
The start is too quick, and the head bobs. It should feel heavy.

Save the file. The owner answers under your note with the version to look at next.
The guide: docs/studio-guide.md
-->
`;
}
