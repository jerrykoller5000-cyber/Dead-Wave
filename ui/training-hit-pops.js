// CL-171 (Jerry: "that little plate/hit counter that is currently living in the top left-hand corner of the training
// area ... translate that to little hits appear above the targets and then disappear"). A hit on a target shows its
// points just over that target's plate: it pops in, drifts up a little and fades. The number follows the target in the
// view (it is placed by projecting a point in the world every frame), so it sits over the plate however he turns.
// No game state: the host calls add() on a hit, update(dt, project) every frame and clear() when he leaves.

export const HIT_POP = Object.freeze({ life: 1.25, rise: 0.55, max: 8 });

const ZONE_LABEL = { head: 'Head', bull: 'Bullseye', ring: 'Ring', plate: 'Plate' };
const ZONE_CLASS = { head: 'gold', bull: 'gold', ring: 'amber', plate: 'grey' };

// What a pop says: the points scored, and under it the zone (and the lane's multiplier when it is not 1).
export function hitPopText(sc, label = (zone) => ZONE_LABEL[zone] || zone) {
  if (!sc) return null;
  if (sc.popup) return sc.popup; // timed drill contact can be real but earn no points
  const total = Math.round(sc.total || 0);
  const sub = label(sc.zone) + (sc.mult && sc.mult !== 1 ? ' ×' + sc.mult : '');
  return { main: '+' + total, sub, tone: ZONE_CLASS[sc.zone] || 'grey' };
}

// How it looks u (0..1) of the way through its life: a quick pop in, a hold, then it thins away while it rises.
export function hitPopFrame(u) {
  const t = Math.min(1, Math.max(0, u));
  const scale = t < 0.12 ? 0.6 + 0.55 * (t / 0.12) : t < 0.22 ? 1.15 - 0.15 * ((t - 0.12) / 0.1) : 1;
  const fade = t < 0.55 ? 1 : Math.max(0, (1 - t) / 0.45);
  const opacity = fade <= 1e-9 ? 0 : fade * fade * (3 - 2 * fade);
  const lift = 1 - Math.pow(1 - t, 2);   // eases out: quick at first, settling
  return { scale, opacity, lift };
}

const CSS = `
.training-hit-pop{position:fixed;left:0;top:0;pointer-events:none;z-index:7;text-align:center;white-space:nowrap;
  font:700 22px/1 var(--font-hud,Impact,'Arial Black',sans-serif);letter-spacing:.04em;will-change:transform,opacity;
  text-shadow:0 2px 0 #000c,0 0 10px #000a;transform-origin:50% 100%}
.training-hit-pop small{display:block;margin-top:3px;font:600 11px/1 var(--font-hud,sans-serif);letter-spacing:.14em;text-transform:uppercase;opacity:.9}
.training-hit-pop.red{color:#ff7868}.training-hit-pop.gold{color:#ffd24a}.training-hit-pop.amber{color:#ffab3d}.training-hit-pop.grey{color:#e4e6e0}
`;

export function createHitPops({ doc = document, parent = null } = {}) {
  if (!doc.getElementById('trainingHitPopCss')) {
    const st = doc.createElement('style'); st.id = 'trainingHitPopCss'; st.textContent = CSS; (doc.head || doc.body).append(st);
  }
  const host = parent || doc.body;
  const pops = [], spare = [];
  function element() {
    const el = spare.pop() || doc.createElement('div');
    if (!el.parentNode) host.append(el);
    el.hidden = false;
    return el;
  }
  return {
    // at: a point in the world just over the plate {x, y, z}; text: from hitPopText.
    add(at, text) {
      if (!at || !text) return null;
      if (pops.length >= HIT_POP.max) { const old = pops.shift(); old.el.hidden = true; spare.push(old.el); }
      const el = element();
      el.className = 'training-hit-pop ' + text.tone;
      el.textContent = text.main;
      const sub = doc.createElement('small'); sub.textContent = text.sub; el.append(sub);
      el.style.opacity = '0';
      const p = { el, x: at.x, y: at.y, z: at.z, t: 0, jitter: (pops.length % 3 - 1) * 14 };
      pops.push(p);
      return p;
    },
    // project(x, y, z) -> { x, y, on } in CSS pixels (on: in front of the camera and on the screen).
    update(dt, project) {
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i];
        p.t += dt;
        const u = p.t / HIT_POP.life;
        if (u >= 1) { p.el.hidden = true; spare.push(p.el); pops.splice(i, 1); continue; }
        const f = hitPopFrame(u), s = project(p.x, p.y + HIT_POP.rise * f.lift, p.z);
        if (!s || !s.on) { p.el.style.opacity = '0'; continue; }
        p.el.style.opacity = f.opacity.toFixed(3);
        p.el.style.transform = `translate(${(s.x + p.jitter).toFixed(1)}px,${s.y.toFixed(1)}px) translate(-50%,-100%) scale(${f.scale.toFixed(3)})`;
      }
    },
    clear() { while (pops.length) { const p = pops.pop(); p.el.hidden = true; spare.push(p.el); } },
    count: () => pops.length
  };
}
