// crew/request-status.test.mjs — a request is settled only by a signed reply line (CB-369 loan).   node --test crew/
import test from 'node:test';
import assert from 'node:assert/strict';
import { requestStatus } from './request-status.mjs';

const head = '## 2026-11-21 · Claude 2 → Antigravity · run: CB-358 probe\r\n\r\n';

test('a DONE in the request\'s own words does not settle it (the "Reply DONE" bug)', () => {
  const body = head + 'About 20 min. Reply DONE with the last line of each log. The MOVE TO SHELF / DONE bar too.\r\n';
  assert.deepEqual(requestStatus(body, ['Antigravity']), { status: null, replied: false });
  // Its title saying DONE does not either.
  assert.equal(requestStatus('## 2026-11-21 · A → B · AG-356 DONE: plan sheet\n\nLook at it.\n', ['B']).status, null);
  // Nor a quoted line or a DONE in the middle of a signed-looking line.
  assert.equal(requestStatus(head + '> **Antigravity, 2026-11-21: DONE.** quoted\n  **Antigravity, 2026-11-21: DONE.**\n', ['Antigravity']).status, null);
});

test('crew.mjs reply lines settle it, the last one wins', () => {
  let body = head + 'Please run it.\r\n\r\n**Antigravity, 2026-11-21: LATER.** the slot is busy\r\n';
  assert.deepEqual(requestStatus(body, ['Antigravity']), { status: 'LATER', replied: true });
  body += '\r\n**Antigravity, 2026-11-21: DONE.** 12 checks: 12 pass, 0 fail\r\n';
  assert.deepEqual(requestStatus(body, ['Antigravity']), { status: 'DONE', replied: true });
  assert.equal(requestStatus(head + '**Claude 2, 2026-11-21: WONT.** not mine\n', ['Claude 2']).status, 'WONT');
});

test('a hand-written signed line: status as the first word after the bold', () => {
  assert.equal(requestStatus(head + '**ChatGPT, 2026-11-21:** DONE. Landed 48/48.\n', ['ChatGPT']).status, 'DONE');
  assert.equal(requestStatus(head + '**ChatGPT, 2026-11-21:** Landed; DONE later today.\n', ['ChatGPT']).status, null);
});

test('a signed note answers it without a status; only a recipient\'s note counts as answered', () => {
  const body = head + '**Claude, 2026-10-23 (on GB-220):** Yes, blanket: approved.\n';
  assert.deepEqual(requestStatus(body, ['CLAUDE DIRECTOR', 'Claude']), { status: null, replied: true });
  assert.deepEqual(requestStatus(body, ['Antigravity']), { status: null, replied: false });
  // A signature by someone else with a status still settles it (the sender withdrawing it, the lead closing it).
  assert.deepEqual(requestStatus(head + '**CLAUDE DIRECTOR, 2026-11-21: DONE.** superseded\n', ['Antigravity']), { status: 'DONE', replied: false });
  // Names match whole: "Claude 2" is not "Claude".
  assert.equal(requestStatus(head + '**Claude 2, 2026-11-21:** on it\n', ['Claude']).replied, false);
});

test('LF and CRLF files read the same', () => {
  const lf = head.replace(/\r\n/g, '\n') + '**Antigravity, 2026-11-21: DONE.** ok\n';
  assert.deepEqual(requestStatus(lf, ['Antigravity']), requestStatus(lf.replace(/\n/g, '\r\n'), ['Antigravity']));
});
