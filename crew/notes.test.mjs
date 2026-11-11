// crew/notes.test.mjs — Jerry's notes parser (CL-60).   node --test crew/
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNotes, reviewState, notesStub } from './notes.mjs';
import { chooseReplyRequest, refindReplyRequest } from './reply-match.mjs';

test('the stub has no notes in it (its example is in a comment)', () => {
  assert.equal(parseNotes(notesStub('guardian-drag', 'v1')).length, 0);
  assert.equal(reviewState([], 'v1').state, 'no-notes');
});

test('a note goes waiting → taken → answered (look) → approved', () => {
  let t = '# Notes\r\n\r\n## 2026-09-27 · Jerry · v1\r\nThe drag feels floaty.\r\nDig in harder.\r\n';
  let n = parseNotes(t);
  assert.equal(n.length, 1);
  assert.equal(n[0].text, 'The drag feels floaty. Dig in harder.');
  assert.equal(reviewState(n, 'v1').state, 'waiting');
  t += '\r\n> claude · taken · 2026-09-27\r\n';
  assert.equal(reviewState(parseNotes(t), 'v1').state, 'taken');
  t += '> claude · v2 · 2026-09-27: both hind feet plant on each heave\r\n';
  n = parseNotes(t);
  assert.equal(n[0].answer.version, 'v2');
  assert.equal(n[0].answer.text, 'both hind feet plant on each heave');
  const s = reviewState(n, 'v2');
  assert.equal(s.state, 'look');
  assert.equal(s.lookAt, 'v2');
  t = '## 2026-09-28 · Jerry · v2\nGood. Ship it.\n\n' + t;
  const done = reviewState(parseNotes(t), 'v2');
  assert.equal(done.state, 'approved');
  assert.equal(done.approvedAt, 'v2');
});

test('a new note on the answered version is waiting again', () => {
  const t = '## 2026-09-28 · Jerry · v2\nBetter, but the head bobs.\n\n## 2026-09-27 · Jerry · v1\nFloaty.\n\n> claude · v2 · 2026-09-27: heavier\n';
  const s = reviewState(parseNotes(t), 'v2');
  assert.equal(s.state, 'waiting');
  assert.deepEqual(s.open.map((x) => x.version), ['v2']);
});

test('headings that are not notes are ignored', () => {
  const n = parseNotes('# Notes on x\n\n## Some heading\ntext\n\n## 2026-09-27 · Jerry · v3\nok then\n');
  assert.equal(n.length, 1);
  assert.equal(n[0].version, 'v3');
});

test('a heading typed by hand in Notepad still counts', () => {
  for (const h of ['## 2026-09-27 - Jerry - v2', '## 2026-09-27 · Jerry · V2', '## Jerry v2', '## v2 2026-09-27 Jerry', '## 2026-09-27 | Jerry | v2']) {
    const n = parseNotes(h + '\nToo floaty.\n');
    assert.equal(n.length, 1, h);
    assert.equal(n[0].version, 'v2', h);
    assert.equal(n[0].who, 'Jerry', h);
    assert.equal(n[0].text, 'Too floaty.', h);
  }
});

test('reply picks the replier among duplicate titles and re-finds that recipient', () => {
  const common = {date:'2026-11-11', from:'CLAUDE DIRECTOR', title:'Four-light review', status:'OPEN'};
  const before = [
    {...common, to:['antigravity'], start:10, end:80},
    {...common, to:['chatgpt'], start:80, end:150},
    {...common, to:['chatgpt2'], start:150, end:220},
  ];
  const {hit,error} = chooseReplyRequest(before, 'chatgpt', 'Four-light review', {since:'2026-11-10'});
  assert.equal(error, null);
  assert.equal(hit.start, 80);
  const current = before.map(r => ({...r, start:r.start+40, end:r.end+40}));
  assert.equal(refindReplyRequest(before, current, hit).start, 120);
  assert.equal(chooseReplyRequest(before, 'claude4', 'Four-light review').hit, undefined);
});

test('reply preserves order for identical requests and rejects an ambiguous phrase', () => {
  const common = {date:'2026-11-11', from:'Claude 2', to:['chatgpt'], title:'Same title', status:'OPEN'};
  const before = [{...common,start:10}, {...common,start:90}, {...common,title:'Same title later',start:160}];
  const chosen = chooseReplyRequest(before, 'chatgpt', 'Same title', {since:'2026-11-10'});
  assert.equal(chosen.hit, null);
  assert.match(chosen.error, /matches 3 requests/);
  const {hit} = chooseReplyRequest(before.slice(0,2), 'chatgpt', 'Same title', {since:'2026-11-10'});
  assert.equal(hit.start, 90);
  assert.equal(refindReplyRequest(before.slice(0,2), before.slice(0,2).map(r => ({...r,start:r.start+5})), hit).start, 95);
  assert.match(chooseReplyRequest(before, 'chatgpt', '9', {since:'2026-11-10'}).error, /No open request numbered/);
});
