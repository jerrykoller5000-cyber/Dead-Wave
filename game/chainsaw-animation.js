// GP-188: one starter pull per draw. Interrupted starts must finish a fresh pull.
export const SAW_START = Object.freeze({ reach: 0.22, pull: 0.48, retract: 0.67, return: 1.02 });
export function createSawStart() { return { phase: 'off', t: 0, starts: 0 }; }
export function stepSawStart(s, dt, { equipped, available = true, suspended = false }) {
  if (!equipped || !available) { s.phase = 'off'; s.t = 0; return s; }
  if (suspended) return s;
  if (s.phase === 'off') { s.phase = 'starting'; s.t = 0; s.starts++; }
  else if (s.phase === 'starting') {
    s.t = Math.min(SAW_START.return, s.t + Math.max(0, Math.min(0.1, dt)));
    if (s.t >= SAW_START.return) s.phase = 'ready';
  }
  return s;
}
const ease = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
export function sawStartPose(s) {
  if (s.phase !== 'starting') return { take: 0, cord: 0 };
  const t = s.t;
  const take = t < SAW_START.reach ? ease(t / SAW_START.reach)
    : t <= SAW_START.retract ? 1 : 1 - ease((t - SAW_START.retract) / (SAW_START.return - SAW_START.retract));
  const cord = t < SAW_START.reach ? 0 : t < SAW_START.pull
    ? ease((t - SAW_START.reach) / (SAW_START.pull - SAW_START.reach))
    : 1 - ease((t - SAW_START.pull) / (SAW_START.retract - SAW_START.pull));
  return { take, cord };
}
