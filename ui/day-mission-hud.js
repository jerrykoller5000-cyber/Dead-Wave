// ui/day-mission-hud.js — AH-15: unified diegetic Branch CRT field-kit HUD for all daytime quests,
// minigames, and active day bounties (docs/ui-principles.md §0, §1, §3, §5).
// Pure view model (describeDayMissionHud) + lightweight DOM mount (createDayMissionHud).
// Never captures pointer or keyboard input; hides completely when no daytime quest is active.

const HUD_CSS = `
#dayMissionHud{
  position:fixed;left:50%;bottom:136px;transform:translateX(-50%);z-index:22;
  width:min(410px,calc(100vw - 28px));box-sizing:border-box;
  padding:9px 13px 10px;pointer-events:none;display:none;
  background:linear-gradient(180deg,rgba(15,21,15,.93),rgba(9,13,9,.95));
  border:1px solid rgba(124,138,104,.65);border-left:3px solid #ffd24a;
  clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%);
  box-shadow:0 10px 28px rgba(0,0,0,.62),inset 0 1px 0 rgba(255,255,255,.07);
  color:#e7e3ce;font-family:var(--font-hud,'Consolas','Courier New',monospace);
}
#dayMissionHud::after{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.06) 0 1px,transparent 1px 3px);
}
#dayMissionHud.on{display:block;animation:dmhIn .16s ease-out}
#dayMissionHud [hidden]{display:none!important}
#dayMissionHud[data-tone="danger"]{border-left-color:#ff5a3a;border-color:rgba(255,90,58,.62)}
#dayMissionHud[data-tone="ready"]{border-left-color:#7cff8a;border-color:rgba(124,255,138,.58)}
#dayMissionHud[data-tone="river"]{border-left-color:#68d0e0;border-color:rgba(104,208,224,.55)}
#dayMissionHud[data-tone="bounty"]{border-left-color:#9ed7dc;border-color:rgba(158,215,220,.55)}
body:not(.playing) #dayMissionHud{display:none}
@keyframes dmhIn{from{opacity:0;transform:translate(-50%,5px)}to{opacity:1;transform:translate(-50%,0)}}
#dayMissionHud .dmh-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:6px;position:relative;z-index:1}
#dayMissionHud .dmh-title{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ffd24a;text-shadow:0 0 8px rgba(255,210,74,.25)}
#dayMissionHud[data-tone="danger"] .dmh-title{color:#ff7b61;text-shadow:0 0 8px rgba(255,90,58,.3)}
#dayMissionHud[data-tone="ready"] .dmh-title{color:#8dff95;text-shadow:0 0 8px rgba(124,255,138,.3)}
#dayMissionHud[data-tone="river"] .dmh-title{color:#86e2f0}
#dayMissionHud[data-tone="bounty"] .dmh-title{color:#a8e2e8}
#dayMissionHud .dmh-stat{font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;color:#f4eed8;white-space:nowrap}
#dayMissionHud .dmh-bar-wrap{position:relative;height:12px;background:rgba(6,10,7,.85);border:1px solid rgba(114,126,96,.55);border-radius:2px;overflow:hidden;margin-bottom:6px;z-index:1}
#dayMissionHud .dmh-bar-fill{height:100%;width:0%;background:linear-gradient(90deg,#d89a1e,#ffd24a);transition:width .07s linear}
#dayMissionHud[data-tone="danger"] .dmh-bar-fill{background:linear-gradient(90deg,#c93424,#ff6a45)}
#dayMissionHud[data-tone="ready"] .dmh-bar-fill{background:linear-gradient(90deg,#39b856,#8dff95)}
#dayMissionHud[data-tone="river"] .dmh-bar-fill{background:linear-gradient(90deg,#2e8da0,#7ce5f5)}
#dayMissionHud .dmh-rhythm{position:relative;height:20px;background:#080e09;border:1px solid rgba(110,126,98,.6);border-radius:2px;overflow:hidden;margin-bottom:6px;z-index:1}
#dayMissionHud .dmh-zone{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:30%;background:rgba(124,255,138,.16);border-left:1px solid rgba(124,255,138,.55);border-right:1px solid rgba(124,255,138,.55)}
#dayMissionHud .dmh-rhythm.ready .dmh-zone{background:rgba(124,255,138,.38);box-shadow:0 0 12px rgba(124,255,138,.45)}
#dayMissionHud .dmh-rhythm.slip{border-color:#ff5a3a;box-shadow:inset 0 0 14px rgba(255,90,58,.5)}
#dayMissionHud .dmh-rhythm.pump{border-color:#8dff95;box-shadow:inset 0 0 12px rgba(141,255,149,.45)}
#dayMissionHud .dmh-center-tick{position:absolute;top:2px;bottom:2px;left:50%;width:2px;margin-left:-1px;background:rgba(255,255,255,.32)}
#dayMissionHud .dmh-cursor{position:absolute;top:2px;bottom:2px;width:6px;margin-left:-3px;border-radius:1px;background:#ffd24a;box-shadow:0 0 8px #ffd24a}
#dayMissionHud .dmh-rhythm.ready .dmh-cursor{background:#8dff95;box-shadow:0 0 10px #8dff95}
#dayMissionHud .dmh-pips{display:flex;gap:4px;margin-bottom:5px;position:relative;z-index:1}
#dayMissionHud .dmh-pip{flex:1;height:6px;border-radius:1px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14)}
#dayMissionHud .dmh-pip.done{background:#7cff8a;border-color:#aaffb4;box-shadow:0 0 5px rgba(124,255,138,.4)}
#dayMissionHud .dmh-pip.cur{background:#ffd24a;border-color:#ffe791;box-shadow:0 0 6px rgba(255,210,74,.45)}
#dayMissionHud .dmh-pip.bad{background:#ff5a3a;border-color:#ff9078;box-shadow:0 0 6px rgba(255,90,58,.45)}
#dayMissionHud .dmh-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:11px;line-height:1.3;color:#c7ccb8;position:relative;z-index:1}
#dayMissionHud .dmh-sub{color:#b7bea6}
#dayMissionHud .dmh-tag{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:2px 6px;border-radius:2px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);color:#e4e0cc;white-space:nowrap}
#dayMissionHud .dmh-tag.warn{background:rgba(255,178,26,.16);border-color:rgba(255,178,26,.55);color:#ffd24a}
#dayMissionHud .dmh-tag.danger{background:rgba(255,74,50,.22);border-color:rgba(255,90,58,.75);color:#ff8a73}
#dayMissionHud .dmh-tag.ok{background:rgba(61,255,106,.16);border-color:rgba(124,255,138,.6);color:#98ffaa}
#dayMissionVignette{
  position:fixed;inset:0;pointer-events:none;z-index:19;opacity:0;transition:opacity .12s ease-out;
}
@media(max-width:600px){
  #dayMissionHud{bottom:108px;padding:7px 10px 8px}
  #dayMissionHud .dmh-title{font-size:10px}
  #dayMissionHud .dmh-foot{font-size:10px}
}
`;

const clamp01 = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

/**
 * Pure view-model projector: turns live daytime quest/minigame state into a concise
 * diegetic HUD descriptor (or null when nothing should be displayed).
 */
export function describeDayMissionHud(snapshot) {
  if (!snapshot || !snapshot.active || snapshot.modalOpen) return null;

  // 1. Convoy hydraulic jack (highest priority when actively engaged or cab open/warning)
  const cv = snapshot.convoy;
  if (cv && cv.engaged && cv.phase !== 'idle' && cv.phase !== 'ready') {
    const pumps = Math.max(0, cv.pumps | 0);
    const total = Math.max(1, cv.total | 0);
    const beat = Number.isFinite(cv.beat) && cv.beat > 0 ? cv.beat : 0.75;
    const until = Number.isFinite(cv.untilBeat) ? cv.untilBeat : beat;
    // Map phase into 0..1 where 0.50 is exact beat centre (ping-pong sweep or smooth approach).
    const progress = clamp01(1 - until / beat);
    const cursorPos = clamp01(0.1 + progress * 0.4 + (cv.beatReady ? 0.08 : 0));
    let tone = cv.beatReady ? 'ready' : 'amber';
    let tag = cv.sleeperAlive ? 'CAB QUIET' : 'CAB CLEAR';
    let tagTone = cv.sleeperAlive ? '' : 'ok';
    let sub = cv.beatReady ? 'TAP E NOW' : 'WAIT FOR GREEN PULSE';
    if (cv.phase === 'warning') {
      tone = 'danger'; tag = 'CAB BANGING!'; tagTone = 'danger'; sub = 'DOOR GIVING WAY — READY WEAPON';
    } else if (cv.phase === 'open') {
      tone = cv.sleeperAlive ? 'danger' : 'ready';
      tag = cv.sleeperAlive ? 'SLEEPER EXPOSED' : 'SLEEPER DOWN';
      tagTone = cv.sleeperAlive ? 'danger' : 'ok';
      sub = cv.sleeperAlive ? 'SHOOT INTO THE OPEN CAB!' : 'AMBULANCE CAB SILENT';
    } else if (cv.misses === 1 && cv.sleeperAlive) {
      tag = 'CAB STIRRING'; tagTone = 'warn'; sub = 'ONE MORE MISS WAKES IT';
    }
    return {
      mode: 'convoy',
      tone,
      title: 'AMBULANCE 04 · HYDRAULIC JACK',
      stat: `${pumps} / ${total} PUMPS`,
      rhythm: {
        pos: cv.phase === 'pumping' ? clamp01(0.5 - (until / beat) * 0.45) : 0.5,
        ready: !!cv.beatReady,
        feedback: cv.feedback || ''
      },
      pips: { count: total, done: pumps, current: cv.phase === 'pumping' ? pumps : -1, bad: cv.phase === 'warning' || (cv.phase === 'open' && cv.sleeperAlive) },
      sub,
      tag,
      tagTone
    };
  }

  // 2. Trapper's bear-trap safe path (inside the yard or clamped in a trap)
  const tr = snapshot.trapper;
  if (tr && (tr.inYard || tr.held) && !tr.unlocked) {
    const rows = Math.max(1, tr.rows | 0);
    const prog = Math.max(0, Math.min(rows, tr.progress | 0));
    if (tr.held) {
      const holdT = Math.max(0, Number(tr.holdT) || 0);
      const holdMax = Math.max(0.1, Number(tr.holdMax) || 3);
      return {
        mode: 'trapper-held',
        tone: 'danger',
        title: 'IRON LEG-HOLD TRAP · CLAMPED',
        stat: `${holdT.toFixed(1)}s`,
        bar: clamp01(1 - holdT / holdMax),
        pips: { count: rows, done: prog, current: -1, bad: true },
        sub: 'TAP SPACE OR E TO PRY JAWS — FREE TO SHOOT',
        tag: 'HOSTILES INBOUND',
        tagTone: 'danger'
      };
    }
    return {
      mode: 'trapper',
      tone: prog >= rows - 1 ? 'ready' : 'amber',
      title: "TRAPPER'S YARD · IRON PATH",
      stat: `ROW ${prog} / ${rows}`,
      pips: { count: rows, done: prog, current: prog < rows ? prog : -1, bad: false },
      sub: tr.snaps > 0 ? 'STAY ON STONES BESIDE THE HORSESHOES' : 'FOLLOW THE HORSESHOES TO THE IRON CELLAR',
      tag: tr.snaps > 0 ? `${tr.snaps} SPRUNG` : 'WATCH LEAVES',
      tagTone: tr.snaps > 0 ? 'warn' : ''
    };
  }

  // 3. Utility truck chain cut & 20 s car alarm
  const tk = snapshot.truck;
  if (tk && (tk.cutting || tk.alarm > 0)) {
    if (tk.cutting) {
      const pct = Math.round(clamp01(tk.cutFrac) * 100);
      return {
        mode: 'truck-cut',
        tone: 'amber',
        title: "CLARKE'S TOOLBOX · CUTTING CHAIN",
        stat: `${pct}%`,
        bar: clamp01(tk.cutFrac),
        sub: 'HOLD E — HEAVY LINKS ABOUT TO SNAP',
        tag: 'BOLT CUTTERS',
        tagTone: 'warn'
      };
    }
    const left = Math.max(0, Number(tk.alarm) || 0);
    const total = Math.max(1, Number(tk.alarmTotal) || 20);
    return {
      mode: 'truck-alarm',
      tone: 'danger',
      title: "CLARKE'S TRUCK · CAR ALARM",
      stat: `${Math.ceil(left)}s`,
      bar: clamp01(left / total),
      sub: 'GRAB THE AMMO — DEAD DRAWN TO THE BEND',
      tag: 'HOSTILES INBOUND',
      tagTone: 'danger'
    };
  }

  // 4. Fuel depot fill & leaking jerrycan carry
  const fu = snapshot.fuel;
  if (fu && !fu.done && (fu.filling || fu.carried || fu.downNear)) {
    if (fu.filling) {
      const pct = Math.round(clamp01(fu.fillShare) * 100);
      return {
        mode: 'fuel-fill',
        tone: 'amber',
        title: "PRICE'S DIESEL PUMP · FILLING CAN",
        stat: `${pct}%`,
        bar: clamp01(fu.fillShare),
        sub: 'HOLD E — CRANKING FUEL FROM SHED TANK',
        tag: '20L JERRYCAN',
        tagTone: ''
      };
    }
    if (fu.carried) {
      const dist = Math.max(0, Math.round(Number(fu.hqDist) || 0));
      const danger = !!fu.hazardNear;
      return {
        mode: 'fuel-carry',
        tone: danger ? 'danger' : dist <= 6 ? 'ready' : 'amber',
        title: danger ? 'FUEL CAN · IGNITION HAZARD!' : 'LEAKING JERRYCAN · CARRY TO HQ',
        stat: dist <= 4 ? 'AT GENERATOR' : `${dist}m TO HQ`,
        bar: clamp01(1 - Math.min(dist, 90) / 90),
        sub: danger ? 'FIRE OR ACID WILL DETONATE CAN — DROP (E)!' : 'E SET DOWN TO FIGHT · SCENT CALLS THE DEAD',
        tag: danger ? 'FLAMMABLE!' : `${fu.drips | 0} DRIPS`,
        tagTone: danger ? 'danger' : 'warn'
      };
    }
    return {
      mode: 'fuel-down',
      tone: 'amber',
      title: 'JERRYCAN SET DOWN',
      stat: `${Math.max(0, Math.round(Number(fu.hqDist) || 0))}m TO HQ`,
      sub: 'CLEAR THE DEAD — E BESIDE CAN TO RESUME CARRY',
      tag: 'KEEP CLEAR OF FIRE',
      tagTone: 'warn'
    };
  }

  // 5. Hikers' bear bag — river drift chase / snag ambush
  const hk = snapshot.hikers;
  if (hk && !hk.done && (hk.phase === 'floating' || hk.phase === 'snagged' || hk.nearHanging)) {
    if (hk.phase === 'floating') {
      const left = Math.max(0, Number(hk.untilSnag) || 0);
      const total = Math.max(1, Number(hk.floatS) || 40);
      const dist = Math.max(0, Math.round(Number(hk.dist) || 0));
      const urgent = left <= 10;
      return {
        mode: 'hikers-river',
        tone: urgent ? 'danger' : 'river',
        title: "HIKERS' KIT · DRIFTING DOWNRIVER",
        stat: `${Math.ceil(left)}s · ${dist}m`,
        bar: clamp01(left / total),
        sub: dist <= 3 ? 'PRESS E TO GRAB THE PACK!' : 'CHASE ALONG THE BANK BEFORE THE WATERFALL SNAG',
        tag: urgent ? 'ALMOST SNAGGED!' : 'IN CURRENT',
        tagTone: urgent ? 'danger' : 'warn'
      };
    }
    if (hk.phase === 'snagged') {
      const dist = Math.max(0, Math.round(Number(hk.dist) || 0));
      return {
        mode: 'hikers-snag',
        tone: 'danger',
        title: "HIKERS' KIT · SNAGGED IN POOL",
        stat: `${dist}m`,
        sub: hk.risen ? 'DROWNED RISEN — CLEAR THE POOL AND GRAB PACK' : 'SOMETHING WAITS UNDER THE WATERFALL',
        tag: hk.risen ? 'DROWNED ACTIVE' : 'AMBUSH POOL',
        tagTone: 'danger'
      };
    }
    return {
      mode: 'hikers-hang',
      tone: 'amber',
      title: "HIKERS' BEAR BAG · 5M UP",
      stat: hk.river ? 'OVER RIVER' : 'OVER BANK',
      sub: 'AIM UP AND SHOOT THE ROPE TO DROP MAYA’S PACK',
      tag: 'RIGHT-CLICK AIM',
      tagTone: ''
    };
  }

  // 6. Story-gate winch / vines (?gates=1)
  const gt = snapshot.gate;
  if (gt && (gt.winching || gt.chops > 0)) {
    if (gt.winching) {
      const pct = Math.round(clamp01(gt.winchT) * 100);
      return {
        mode: 'gate-winch',
        tone: 'amber',
        title: 'RECOVERY WINCH · DRAGGING TRUCK',
        stat: `${pct}%`,
        bar: clamp01(gt.winchT),
        sub: 'HOLD E AT REMOTE — CABLE UNDER TENSION',
        tag: 'NOISE CALLS DEAD',
        tagTone: 'warn'
      };
    }
    return {
      mode: 'gate-vines',
      tone: 'amber',
      title: 'MAST GATE · CUTTING VINES',
      stat: `${gt.chops | 0} / ${gt.chopsNeed || 3}`,
      pips: { count: gt.chopsNeed || 3, done: gt.chops | 0, current: gt.chops | 0, bad: false },
      sub: 'PRESS E TO CHOP CLEAR WITH BLADE',
      tag: 'OVERGROWN GATE',
      tagTone: ''
    };
  }

  // 7. Mast boots yank
  const bt = snapshot.boots;
  if (bt && bt.active && bt.pulls > 0 && bt.pulls < bt.need) {
    return {
      mode: 'boots-yank',
      tone: 'amber',
      title: 'MAST PERCH · INSULATED BOOTS',
      stat: `${bt.pulls} / ${bt.need}`,
      pips: { count: bt.need, done: bt.pulls, current: bt.pulls, bad: false },
      sub: 'KEEP YANKING (E) — ROTTEN LANYARD GIVING WAY',
      tag: 'DEAD SOLDIER',
      tagTone: 'warn'
    };
  }

  // 8. Live daytime bounty engagement or Wandering Colossus proximity
  const bn = snapshot.bounty;
  if (bn && bn.open) {
    if (bn.wanderer) {
      const dist = Math.max(0, Math.round(Number(bn.dist) || 0));
      return {
        mode: 'bounty-wanderer',
        tone: dist < 24 ? 'danger' : 'bounty',
        title: 'THE WANDERER · COLOSSUS ON TRAIL',
        stat: `${dist}m · +${bn.reward | 0} SKULLS`,
        sub: 'HEAVY FOOTSTEPS — GIVE IT ROOM OR GIVE IT EVERYTHING',
        tag: 'DAY BOUNTY',
        tagTone: dist < 24 ? 'danger' : 'warn'
      };
    }
    const alive = Math.max(0, bn.alive | 0);
    const total = Math.max(1, bn.guards | 0);
    return {
      mode: 'bounty-site',
      tone: 'bounty',
      title: `DAY BOUNTY · ${(bn.label || 'OUTPOST').toUpperCase()}`,
      stat: `${alive} / ${total} LEFT · +${bn.reward | 0}`,
      bar: clamp01(1 - alive / total),
      sub: bn.survivor ? 'CLEAR ALL HOSTILES TO REACH SURVIVOR' : 'CLEAR SITE FOR SKULL BOUNTY (BANK AT HQ)',
      tag: bn.survivor ? 'SURVIVOR ON SITE' : 'CLEAR POST',
      tagTone: bn.survivor ? 'ok' : ''
    };
  }

  return null;
}

export function createDayMissionHud({ doc = document } = {}) {
  if (!doc.getElementById('dayMissionHudCss')) {
    const style = doc.createElement('style');
    style.id = 'dayMissionHudCss';
    style.textContent = HUD_CSS;
    (doc.head || doc.body).append(style);
  }
  const el = doc.createElement('aside');
  el.id = 'dayMissionHud';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML =
    '<div class="dmh-head"><span class="dmh-title"></span><span class="dmh-stat"></span></div>' +
    '<div class="dmh-rhythm" hidden><div class="dmh-zone"></div><div class="dmh-center-tick"></div><div class="dmh-cursor"></div></div>' +
    '<div class="dmh-bar-wrap" hidden><div class="dmh-bar-fill"></div></div>' +
    '<div class="dmh-pips" hidden></div>' +
    '<div class="dmh-foot"><span class="dmh-sub"></span><span class="dmh-tag"></span></div>';
  (doc.getElementById('hud') || doc.body).append(el);

  const vig = doc.createElement('div');
  vig.id = 'dayMissionVignette';
  (doc.getElementById('hud') || doc.body).append(vig);

  const q = (s) => el.querySelector(s);
  const titleEl = q('.dmh-title');
  const statEl = q('.dmh-stat');
  const rhythmEl = q('.dmh-rhythm');
  const cursorEl = q('.dmh-cursor');
  const barWrapEl = q('.dmh-bar-wrap');
  const barFillEl = q('.dmh-bar-fill');
  const pipsEl = q('.dmh-pips');
  const subEl = q('.dmh-sub');
  const tagEl = q('.dmh-tag');

  let lastPipCount = -1;
  let pipNodes = [];
  let vigTimer = null;

  function flashVignette(kind = 'acid', durationMs = 650) {
    if (vigTimer) clearTimeout(vigTimer);
    if (kind === 'acid') {
      vig.style.background = 'radial-gradient(ellipse at center, transparent 42%, rgba(92, 224, 58, 0.52) 100%)';
    } else if (kind === 'trap') {
      vig.style.background = 'radial-gradient(ellipse at center, transparent 46%, rgba(215, 38, 24, 0.56) 100%)';
    } else {
      vig.style.background = 'radial-gradient(ellipse at center, transparent 58%, rgba(255, 210, 74, 0.28) 100%)';
    }
    vig.style.opacity = '1';
    vigTimer = setTimeout(() => { vig.style.opacity = '0'; vigTimer = null; }, durationMs);
  }

  function render(snapshot) {
    const view = describeDayMissionHud(snapshot);
    if (!view) {
      if (el.classList.contains('on')) el.classList.remove('on');
      return null;
    }
    if (!el.classList.contains('on')) el.classList.add('on');
    el.dataset.mode = view.mode;
    el.dataset.tone = view.tone || 'amber';
    titleEl.textContent = view.title;
    statEl.textContent = view.stat || '';

    if (view.rhythm) {
      rhythmEl.hidden = false;
      rhythmEl.classList.toggle('ready', !!view.rhythm.ready);
      rhythmEl.classList.toggle('slip', view.rhythm.feedback === 'slip');
      rhythmEl.classList.toggle('pump', view.rhythm.feedback === 'pump');
      cursorEl.style.left = (clamp01(view.rhythm.pos) * 100).toFixed(1) + '%';
    } else {
      rhythmEl.hidden = true;
    }

    if (typeof view.bar === 'number') {
      barWrapEl.hidden = false;
      barFillEl.style.width = (clamp01(view.bar) * 100).toFixed(1) + '%';
    } else {
      barWrapEl.hidden = true;
    }

    if (view.pips && view.pips.count > 0) {
      pipsEl.hidden = false;
      if (lastPipCount !== view.pips.count) {
        pipsEl.replaceChildren();
        pipNodes = [];
        for (let i = 0; i < view.pips.count; i++) {
          const span = doc.createElement('span');
          span.className = 'dmh-pip';
          pipsEl.append(span);
          pipNodes.push(span);
        }
        lastPipCount = view.pips.count;
      }
      for (let i = 0; i < pipNodes.length; i++) {
        const p = pipNodes[i];
        p.className = 'dmh-pip' +
          (i < view.pips.done ? ' done' : '') +
          (i === view.pips.current ? ' cur' : '') +
          (view.pips.bad && i === view.pips.done ? ' bad' : '');
      }
    } else {
      pipsEl.hidden = true;
    }

    subEl.textContent = view.sub || '';
    tagEl.textContent = view.tag || '';
    tagEl.hidden = !view.tag;
    tagEl.className = 'dmh-tag' + (view.tagTone ? ' ' + view.tagTone : '');
    return view;
  }

  return {
    element: el,
    vignette: vig,
    render,
    flashVignette,
    hide() { el.classList.remove('on'); },
    destroy() { if (vigTimer) clearTimeout(vigTimer); el.remove(); vig.remove(); }
  };
}
