// crew/request-status.mjs: is a request in handoffs/requests.md settled? (CB-369 loan, Director 21 Nov)
// Only SIGNED reply lines count. A signed line starts the line with a bold name and date:
//   **Claude 2, 2026-11-21: DONE.** one line           (crew.mjs reply writes this)
//   **ChatGPT, 2026-11-21:** DONE. one line             (hand-written)
//   **Claude, 2026-10-23 (on GB-220):** Approved ...    (a note: answered, no status)
// A DONE, WONT or LATER anywhere else (the request's own title or text, "reply DONE when ...", a quoted log line) is
// not an answer: it used to close requests nobody had answered.
const SIGNED = /^\*\*([A-Za-z][A-Za-z0-9 ]*?), (\d{4}-\d{2}-\d{2})([^*\n]*)\*\*([^\n]*)$/gm;
const WORD = /^(DONE|WONT|LATER)\b/;

// body: the request's text (heading included is fine). recipients: the names that count as the people it was sent to
// (display names, old aliases too). Returns { status: 'DONE'|'WONT'|'LATER'|null (the last signed one), replied }.
export function requestStatus(body, recipients = []) {
  const want = new Set(recipients.map((n) => String(n).toLowerCase()));
  let status = null, replied = false;
  for (const m of String(body).replace(/\r\n/g, '\n').matchAll(SIGNED)) {
    const name = m[1].trim().toLowerCase(), inBold = m[3], after = m[4];
    if (want.has(name)) replied = true;
    // In the bold: "...: DONE." at its end. After the bold: the first word.
    const a = /:\s*(DONE|WONT|LATER)\.?\s*$/.exec(inBold) || WORD.exec(after.trim());
    if (a) status = a[1];
  }
  return { status, replied };
}
