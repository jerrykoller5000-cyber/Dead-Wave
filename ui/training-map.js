// GB-166 (Jerry, 2026-10-13): "Swap the map out with that picture. Only for training grounds. The real map will be back
// when you play the actual game." In the Training Ground a crayon giraffe covers the minimap and the full map; it is
// an <img> laid over each map canvas, so the map code and the game underneath are untouched.
export const TRAINING_MAP_SRC = 'assets/ui/training-map-giraffe.jpg';
// GB-166 (Jerry, 2026-10-13): the full map's legend gives way to this line while training (kept exactly as he wrote it).
export const TRAINING_MAP_CAPTION = 'No map for Training Grounds. Please enjoy this picture of a giraffe :3';
export const TRAINING_MAP_HOSTS = Object.freeze(['minimapFrame', 'objectiveMapSurface']);
const state = new WeakMap();

export function syncTrainingMap(doc, on) {
  if (!doc) return false;
  on = !!on;
  if (state.get(doc) === on) return on;
  for (const id of TRAINING_MAP_HOSTS) {
    const host = doc.getElementById(id);
    if (!host) continue;
    let img = host.querySelector('img.training-map');
    if (!img && on) {
      img = doc.createElement('img');
      img.className = 'training-map'; img.src = TRAINING_MAP_SRC; img.alt = ''; img.draggable = false;
      const canvas = host.querySelector('canvas');
      const radius = canvas && doc.defaultView ? doc.defaultView.getComputedStyle(canvas).borderRadius : '';
      Object.assign(img.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', zIndex: '2', borderRadius: radius || '' });
      if (doc.defaultView && doc.defaultView.getComputedStyle(host).position === 'static') host.style.position = 'relative';
      host.appendChild(img);
    }
    if (img) img.style.display = on ? 'block' : 'none';
  }
  // The legend: its own lines are hidden (the map code keeps writing them, unseen) and the caption shown instead.
  const legend = doc.getElementById('fullMap') && doc.getElementById('fullMap').querySelector('.legend');
  if (legend) {
    let cap = legend.querySelector('.training-map-caption');
    if (!cap && on) { cap = doc.createElement('span'); cap.className = 'training-map-caption'; cap.textContent = TRAINING_MAP_CAPTION; Object.assign(cap.style, { textTransform: 'none', letterSpacing: '0' }); legend.appendChild(cap); }
    for (const n of Array.from(legend.children)) {
      if (n === cap) n.style.display = on ? 'inline' : 'none';
      else if (on) { if (n.dataset.trainingMapHid == null) n.dataset.trainingMapHid = n.style.display || ''; n.style.display = 'none'; }
      else if (n.dataset.trainingMapHid != null) { n.style.display = n.dataset.trainingMapHid; delete n.dataset.trainingMapHid; }
    }
  }
  state.set(doc, on);
  return on;
}
