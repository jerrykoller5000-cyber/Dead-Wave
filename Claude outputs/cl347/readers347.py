# CL-347: the readers of the game-test slot show every lease (crew/panel.html, crew/crew.mjs). Idempotent; repo root.
import io, sys
def load(P):
    raw = io.open(P, 'r', encoding='utf-8', newline='').read(); crlf = '\r\n' in raw[:5000]
    return (raw.replace('\r\n', '\n') if crlf else raw), crlf
def edit(P, fn, tag):
    s, crlf = load(P); t = fn(s)
    if t != s: io.open(P, 'w', encoding='utf-8', newline='').write(t.replace('\n', '\r\n') if crlf else t); print(tag + ': applied')
    else: print(tag + ': already applied')
def rep(s, a, b):
    if b in s: return s
    if s.count(a) != 1: print('anchor not found (' + str(s.count(a)) + '):', a[:100]); sys.exit(1)
    return s.replace(a, b)

def panel(s):
    s = rep(s, """  const h = S.holder;
  box.className = 'box slot' + (h ? ' busy' : '') + (h?.agent === 'jerry' ? ' jerry' : '');
  badge.textContent = h ? `test slot: ${NAME[h.agent] || h.agent} ${h.task}` : `test slot free · ${S.queue.length} queued`;
  badge.className = 'badge ' + (h ? (h.agent === 'jerry' ? 'on' : 'warnb') : 'good');""", """  // CL-347: several leases at once on a computer with the room (tools/game-test-slot.mjs); Jerry's always alone.
  const hs = S.holders || (S.holder ? [S.holder] : []);
  const cap = (S.slots && S.slots.cap) || 1;
  const h = hs[0];
  const jerryHolds = hs.some(x => x.agent === 'jerry');
  box.className = 'box slot' + (h ? ' busy' : '') + (jerryHolds ? ' jerry' : '');
  badge.textContent = h ? (hs.length > 1 || cap > 1 ? `test slots: ${hs.length} of ${cap} in use` : `test slot: ${NAME[h.agent] || h.agent} ${h.task}`) : `test slot${cap > 1 ? 's' : ''} free · ${S.queue.length} queued`;
  badge.className = 'badge ' + (h ? (jerryHolds ? 'on' : 'warnb') : 'good');
  const nm = (a) => NAME[a] || String(a || '').replace(/^./, (c) => c.toUpperCase());   // a retired agent's name, capitalised
  const holderHtml = (h) => `<div class="holder" style="margin-bottom:8px"><div><div class="name">${esc(nm(h.agent))} · ${esc(h.task)}${h.exclusive ? ' <span class="faint">(alone)</span>' : ''}</div><div class="muted">PID ${esc(h.pid)} · started ${esc(ago(h.startedAt))} · queued ${esc(ago(h.queuedAt))}${h.minutes ? ` · planned ${esc(h.minutes)} min` : ''}</div><div>${esc(h.checks || 'checks not described')}</div></div><div><div class="cmd">${esc(h.command || '(command not recorded)')}</div><div class="faint">${(h.processes || []).map(p => `${esc(p.role)} PID ${esc(p.pid)}`).join(' · ')}</div></div></div>`;
  const m = S.slots && S.slots.machine;
  const capLine = cap > 1 || hs.length > 1 ? `<div class="faint" style="margin-bottom:8px">${hs.length} of ${cap} running at once on this computer${m ? ` (${esc(m.memoryGB)} GB, ${esc(m.cores)} cores${m.gpu ? ', ' + esc(m.gpu) : ''})` : ''}. Each is one game and one worker; Jerry's game runs alone.</div>` : '';
  const backoff = S.slots && S.slots.backoffUntil && Date.parse(S.slots.backoffUntil) > Date.now() ? `<div class="item bad" style="margin-top:10px"><b>One at a time until ${esc(ago(S.slots.backoffUntil).replace(' ago', ''))}.</b> A test ended without closing (a crash or a killed session).</div>` : '';
  const why = S.slots && S.slots.next && S.queue.length ? `<div class="faint" style="margin-top:8px">Next: ${esc(nm(S.slots.next.agent))} ${esc(S.slots.next.task)} waits: ${esc(S.slots.next.why)}.</div>` : '';""")
    s = rep(s, """  document.getElementById('slot').innerHTML = h
    ? `<div class="holder"><div><div class="name">${esc(NAME[h.agent] || h.agent)} · ${esc(h.task)}</div><div class="muted">PID ${esc(h.pid)} · started ${esc(ago(h.startedAt))} · queued ${esc(ago(h.queuedAt))}${h.minutes ? ` · planned ${esc(h.minutes)} min` : ''}</div><div>${esc(h.checks || 'checks not described')}</div></div><div><div class="cmd">${esc(h.command || '(command not recorded)')}</div><div class="faint">${(h.processes || []).map(p => `${esc(p.role)} PID ${esc(p.pid)}`).join(' · ')}</div></div></div>${S.queue.some(q => q.agent === 'jerry') ? '<div class="item bad" style="margin-top:10px"><b>Jerry is waiting.</b> Holder: finish the current batch, close owned processes and release promptly. Never close Jerry’s processes.</div>' : ''}${queue}`""", """  document.getElementById('slot').innerHTML = h
    ? `${capLine}${hs.map(holderHtml).join('')}${S.queue.some(q => q.agent === 'jerry') ? '<div class="item bad" style="margin-top:10px"><b>Jerry is waiting.</b> Nothing new starts. Holders: finish the current batch, close owned processes and release promptly. Never close Jerry’s processes.</div>' : ''}${backoff}${why}${queue}`""")
    s = rep(s, "const live = new Set([...(slotState?.queue || []).filter((q) => q.ready).map((q) => q.agent), slotState?.holder?.agent].filter(Boolean));",
               "const live = new Set([...(slotState?.queue || []).filter((q) => q.ready).map((q) => q.agent), ...(slotState?.holders || [slotState?.holder]).map((x) => x && x.agent)].filter(Boolean));")
    s = rep(s, "const slotFree = slotState?.ok && !slotState.holder;",
               "const slotFree = slotState?.ok && (slotState.holders || [slotState.holder].filter(Boolean)).length < ((slotState.slots && slotState.slots.cap) || 1);")
    s = rep(s, "<h3>Game-test slot <small>one game test at a time on this computer · Jerry first · automatic</small></h3>",
               "<h3>Game-test slots <small>one game per test, as many at once as this computer has room for · Jerry first, and alone · automatic</small></h3>")
    s = rep(s, "const holds = slotState?.holder?.agent === a;", "const holds = (slotState?.holders || [slotState?.holder]).some((x) => x && x.agent === a);")
    return s
edit('crew/panel.html', panel, 'crew/panel.html')

edit('crew/crew.mjs', lambda s: rep(s,
  "    const h = s.holder ? `${AGENTS[s.holder.agent] || s.holder.agent} has it (${s.holder.task}, since ${ago(s.holder.startedAt)})` : 'free';",
  "    const hs = s.holders || (s.holder ? [s.holder] : []), cap = (s.slots && s.slots.cap) || 1;   // CL-347: more than one at a time\n"
  "    const h = hs.length ? hs.map((x) => `${AGENTS[x.agent] || x.agent} has ${cap > 1 ? 'one' : 'it'} (${x.task}, since ${ago(x.startedAt)})`).join('; ') + (cap > 1 ? ` · ${hs.length} of ${cap} in use` : '') : (cap > 1 ? `free (${cap} at once)` : 'free');"),
  'crew/crew.mjs')
