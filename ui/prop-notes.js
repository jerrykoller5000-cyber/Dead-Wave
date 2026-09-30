// GP-91: one E-read card per story site in a run. This never changes the site's action.
import { text } from './strings.js';

export const PROP_NOTE_SITES = Object.freeze({
  'objective:radio-repair': 'relayBroken',
  'objective:medical-convoy': 'convoy',
  'objective:wreck-salvage': 'utilityTruck',
  'objective:ranger-cache': 'ranger',
  'objective:hikers-cache': 'hikers',
  'objective:trapper-cache': 'trapper',
  'objective:fuel-depot': 'fuel',
  dock: 'dock',
  watchtower: 'watchtower',
  hq: 'hq'
});

export function createPropNotes() {
  let runId = null;
  const seen = new Set();
  return {
    reset(id) { runId = id; seen.clear(); },
    read(id, { repaired = false } = {}) {
      const key = Object.hasOwn(PROP_NOTE_SITES, id) ? PROP_NOTE_SITES[id] : null;
      if (runId === null || !key || seen.has(id) || (id === 'objective:radio-repair' && repaired)) return null;
      seen.add(id);
      return { id, title: text('story.prop.title'), line: text(`story.prop.${key}`) };
    },
    seen: id => seen.has(id)
  };
}

export function mountPropNoteCard(doc = document) {
  const card = doc.createElement('aside');
  card.id = 'propNoteCard'; card.className = 'prop-note-card';
  card.setAttribute('role', 'status'); card.setAttribute('aria-live', 'polite');
  card.hidden = true;
  const heading = doc.createElement('strong'), body = doc.createElement('p');
  card.append(heading, body); doc.body.append(card);
  let timer = null;
  return {
    show(note) {
      if (!note) return;
      (doc.querySelector('#hqBriefing[open]') || doc.body).append(card);
      heading.textContent = note.title; body.textContent = note.line;
      card.dataset.site = note.id; card.hidden = false;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { card.hidden = true; timer = null; }, 9000);
    },
    hide() { if (timer) clearTimeout(timer); timer = null; card.hidden = true; },
    destroy() { if (timer) clearTimeout(timer); card.remove(); }
  };
}
