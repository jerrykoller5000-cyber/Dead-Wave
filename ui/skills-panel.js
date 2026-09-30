import { SKILL_RANKS } from '../game/skills.js';
import { text } from './strings.js';

export const SKILL_KEYS = Object.freeze(Object.keys(SKILL_RANKS));

export function skillProgress(skills, key) {
  const state = skills?.[key] || { xp: 0, rank: 0 };
  const rank = Math.max(0, Math.min(5, state.rank | 0));
  const xp = Math.max(0, state.xp | 0);
  const from = rank ? SKILL_RANKS[key][rank - 1] : 0;
  const to = SKILL_RANKS[key][rank];
  return { rank, xp, from, to, fraction: to === undefined ? 1 : Math.max(0, Math.min(1, (xp - from) / (to - from))) };
}

export function renderSkills(container, skills) {
  if (!container) return;
  const rows = SKILL_KEYS.map(key => {
    const p = skillProgress(skills, key);
    const row = document.createElement('div'); row.className = 'skill-row'; row.dataset.skill = key;
    const top = document.createElement('div'); top.className = 'skill-row-top';
    const name = document.createElement('strong'); name.textContent = text(`skills.${key}.name`);
    const rank = document.createElement('span'); rank.textContent = text('skills.rank', { rank: p.rank });
    top.append(name, rank);
    const track = document.createElement('div'); track.className = 'skill-track';
    const fill = document.createElement('span'); fill.style.width = `${Math.round(p.fraction * 100)}%`; track.append(fill);
    const progress = document.createElement('small'); progress.textContent = p.to === undefined
      ? text('skills.max') : text('skills.progress', { xp: p.xp, next: p.to });
    row.append(top, track, progress);
    return row;
  });
  container.replaceChildren(...rows);
}

export function mountSkillsPanels({ pause, death, toast, getSkills, playerId = 0, events = window }) {
  const refresh = () => { renderSkills(pause, getSkills()); renderSkills(death, getSkills()); };
  let timer = 0;
  events.addEventListener('dw-game', ({ detail }) => {
    if (detail?.type === 'run-reset') { refresh(); toast.classList.remove('show'); }
    if (detail?.type !== 'skill-up' || detail.player !== playerId || !SKILL_KEYS.includes(detail.key)) return;
    refresh();
    toast.textContent = text('skills.rankToast', { name: text(`skills.${detail.key}.name`), rank: detail.rank });
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('show'), 3200);
  });
  refresh();
  return { refresh };
}
