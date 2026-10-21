import fs from 'node:fs';
import crypto from 'node:crypto';
const file = 'studio/inspector/inspector.css';
const before = fs.readFileSync(file, 'utf8');
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const add = `
/* GP-19919: keyboard access, visible asynchronous work and smaller inspector windows. */
.dwi-group, .dwi-item { width: 100%; border: 0; background: transparent; text-align: left; font-family: inherit; }
.dwi-item { color: var(--ink); font-size: inherit; }
.dwi button:focus-visible, .dwi-id:focus-visible, .dwi select:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.dwi button:disabled { cursor: wait; opacity: .6; }
.dwi [aria-busy="true"] { border-color: var(--gold); }
.dwi-move-status { min-height: 30px; font-size: 11px; padding: 3px 0; }
.dwi-view-picker { display: none; }
.dwi-operation { color: var(--gold); font-size: 11px; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dwi-help-card { max-width: min(760px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto; }
@media (max-width: 1100px) { .dwi-view-picker { display: inline-block; max-width: 100px; } .dwi-bar { gap: 6px; } .dwi-time { min-width: 85px; max-width: 120px; } }
@media (max-width: 850px) {
  .dwi-bar { height: auto; min-height: 76px; flex-wrap: wrap; padding: 6px; }
  .dwi-transport { min-width: 220px; flex-basis: 100%; }
  .dwi-panel { bottom: 96px; }
  .dwi-left { width: 180px; }
  .dwi-right { width: 250px; padding: 8px; }
  .dwi-field { grid-template-columns: 85px 1fr; }
  .dwi-slider { grid-template-columns: 85px 1fr 36px; }
  .dwi-grid { grid-template-columns: repeat(3, 1fr); }
}
`;
if (before.includes('GP-19919: keyboard access')) throw new Error('Already applied');
if (hash(fs.readFileSync(file, 'utf8')) !== hash(before)) throw new Error('Fresh file changed underneath audit');
fs.writeFileSync(file, before + add, 'utf8');
console.log(file + ' updated from ' + hash(before) + ' to ' + hash(before + add));
