// Jerry: death cries die away by about two seconds, regardless of take length/pitch.
export const ZOMBIE_DEATH_SECONDS = 2;
export const isZombieDeathTake = id => /^zombies\/[^/]+\/death$/.test(id);
export function deathCryTiming(seconds = ZOMBIE_DEATH_SECONDS) {
  const end = Math.max(.01, Math.min(ZOMBIE_DEATH_SECONDS, seconds));
  return { end, fade: Math.min(.45, end * .3) };
}
export function scheduleDeathCryFade(param, start, seconds, level = 1) {
  const t = deathCryTiming(seconds);
  param.setValueAtTime(level, start);
  param.setValueAtTime(level, start + t.end - t.fade);
  param.linearRampToValueAtTime(0, start + t.end);
  return start + t.end;
}
