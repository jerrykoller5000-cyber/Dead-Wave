// GB-166: the giraffe stands in for the map in the Training Ground only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { syncTrainingMap, TRAINING_MAP_SRC, TRAINING_MAP_HOSTS, TRAINING_MAP_CAPTION } from './training-map.js';

const fakeDoc = () => {
  const el = (tag) => ({ tag, style: {}, dataset: {}, children: [], className: '', textContent: '', appendChild(c) { this.children.push(c); }, querySelector(s) { if (s === 'canvas') return null; if (s === '.legend') return legend; return this.children.find((c) => '.' + c.className === s || (s === 'img.training-map' && c.className === 'training-map')) || null; } });
  const hosts = Object.fromEntries(TRAINING_MAP_HOSTS.map((id) => [id, el('div')]));
  const legend = el('div'); const lines = ['span', 'br', 'span', 'br', 'span'].map(el); lines[0].textContent = 'TAB CLOSE · ZOMBIES'; lines.forEach((n) => legend.appendChild(n));
  const full = el('div');
  return { hosts, legend, lines, getElementById: (id) => hosts[id] || (id === 'fullMap' ? full : null), createElement: el, defaultView: { getComputedStyle: () => ({ position: 'static', borderRadius: '50%' }) } };
};

test('training shows the giraffe over the minimap and the full map; the real game shows the map', () => {
  const doc = fakeDoc();
  assert.equal(syncTrainingMap(doc, false), false);
  for (const h of Object.values(doc.hosts)) assert.equal(h.children.length, 0, 'no picture in the real game');
  syncTrainingMap(doc, true);
  for (const h of Object.values(doc.hosts)) { const img = h.children[0]; assert.ok(img, 'picture added'); assert.equal(img.src, TRAINING_MAP_SRC); assert.equal(img.style.display, 'block'); assert.equal(img.style.objectFit, 'cover'); }
  const cap = doc.legend.children.find((c) => c.className === 'training-map-caption');
  assert.equal(cap.textContent, 'No map for Training Grounds. Please enjoy this picture of a giraffe :3');
  assert.equal(cap.textContent, TRAINING_MAP_CAPTION); assert.equal(cap.style.display, 'inline');
  for (const n of doc.lines) assert.equal(n.style.display, 'none', 'legend lines hidden in training');
  syncTrainingMap(doc, false);
  for (const h of Object.values(doc.hosts)) assert.equal(h.children[0].style.display, 'none', 'map back when he leaves training');
  assert.equal(cap.style.display, 'none'); for (const n of doc.lines) assert.equal(n.style.display, '', 'legend back in the real game');
  syncTrainingMap(doc, true);
  for (const h of Object.values(doc.hosts)) assert.equal(h.children.length, 1, 'reused, not stacked');
});
