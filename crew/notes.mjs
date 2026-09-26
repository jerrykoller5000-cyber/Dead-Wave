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

const HEAD = /^## +(\S+) *· *([^·]+?) *· *(v\d+)\s*$/;
const REPLY = /^> *(\w+) *· *(taken|v\d+) *· *([^:]*?)\s*(?::\s*(.*))?$/;
const vnum = (v) => (v ? +String(v).slice(1) : 0);

export function parseNotes(text) {
  const clean = String(text || '').replace(/^﻿/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\r\n/g, '\n');
  const notes = [];
  let cur = null;
  for (const line of clean.split('\n')) {
    const h = HEAD.exec(line.trim());
    if (h) { cur = { date: h[1], who: h[2].trim(), version: h[3], text: [], replies: [] }; notes.push(cur); continue; }
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
export function notesStub(asset, latest) {
  return `# Notes on ${asset}

<!--
How to write a note (Jerry): open index.html in this folder, watch, then write under a heading
with today's date, your name and the version you watched (it's in latest.txt). Plain sentences.
Write "good" when it's right. Put the newest note at the top. For example:

## 2026-09-27 · Jerry · ${latest || 'v1'}
The drag feels floaty. It should dig in harder on each heave.

The owner answers under your note with the version to look at next.
-->
`;
}
