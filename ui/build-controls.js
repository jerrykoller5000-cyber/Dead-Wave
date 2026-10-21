import { text, DEFAULT_INPUT_LABELS } from './strings.js';

// Keep a key and its action in one wrapping unit. Continuations such as
// "drag for a line" belong to the preceding mouse action, not a loose row.
export function buildControlGroups({ upgrade = false, drag = false, bearing = 'N', labels = {} } = {}) {
  const actions = ['fire', 'rotate', 'repair', 'scrap', 'buildWheel'];
  const params = { bearing, ...Object.fromEntries(actions.map(k => [k, `\u0001${k}\u0002`])) };
  const keys = upgrade ? ['build.message.upgradeControls', 'build.message.scrapControls'] :
    [drag ? 'build.message.dragControls' : 'build.message.placeControls'];
  const groups = [];
  for (const key of keys) for (const chunk of text(key, params).split(' · ')) {
    if (!chunk.includes('\u0001') && groups.length) groups[groups.length - 1] += ' · ' + chunk;
    else groups.push(chunk);
  }
  return groups.map(group => group.split(/(\u0001\w+\u0002)/).filter(Boolean).map(part => {
    const action = /^\u0001(\w+)\u0002$/.exec(part)?.[1];
    return action ? { key: true, text: String(labels[action] ?? DEFAULT_INPUT_LABELS[action]) } : { key: false, text: part };
  }));
}

export function renderBuildBanner(el, { name, cost, upgrade, drag, bearing, hints = [] }) {
  const doc = el.ownerDocument, heading = doc.createElement('b'), controls = doc.createElement('span');
  heading.className = 'place-heading';
  heading.textContent = upgrade ? text('build.upgrade.name') : text('build.message.price', { name, cost });
  controls.className = 'place-controls';
  for (const group of buildControlGroups({ upgrade, drag, bearing })) {
    const row = doc.createElement('span'); row.className = 'place-control';
    for (const part of group) {
      const node = doc.createElement(part.key ? 'kbd' : 'span'); node.textContent = part.text; row.append(node);
    }
    controls.append(row);
  }
  el.replaceChildren(heading, controls);
  for (const hint of hints) if (hint.text) {
    const line = doc.createElement('span'); line.className = 'place-note ' + hint.className;
    line.textContent = hint.text; el.append(line);
  }
  el.classList.add('on');
}
