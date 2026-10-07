// GP-139: one presentation stack. Existing owners keep their nodes, timers and events.
const mounted = new WeakMap();
const selectors = '#bigBanner, #stockNotice, #dawnCard, #hollowPickup, .prop-note-card';

export function mountNoticeRail(doc = document) {
  if (mounted.has(doc)) return mounted.get(doc);
  const hud = doc.getElementById?.('hud'), panel = doc.getElementById?.('hudTopLeft');
  const host = doc.defaultView;
  if (!hud || !panel || !host?.ResizeObserver || !host?.MutationObserver) return null;
  const rail = doc.createElement('div'); rail.id = 'noticeRail'; hud.append(rail);
  function position() {
    const r = panel.getBoundingClientRect(), h = hud.getBoundingClientRect();
    rail.style.left = (r.left - h.left) + 'px';
    rail.style.top = (r.bottom - h.top + 2) + 'px';
    rail.style.width = r.width + 'px';
    rail.style.maxHeight = Math.max(80, host.innerHeight - r.bottom - 128) + 'px';
  }
  function collect() {
    for (const node of doc.querySelectorAll(selectors)) {
      if (node.parentElement !== rail) rail.append(node);
    }
  }
  const resize = new host.ResizeObserver(position); resize.observe(panel, { box: 'border-box' }); resize.observe(hud, { box: 'border-box' });
  const changes = new host.MutationObserver(collect);
  changes.observe(hud, { childList: true }); changes.observe(doc.body, { childList: true });
  const wheel = event => { if (rail.scrollHeight > rail.clientHeight) event.stopPropagation(); };
  rail.addEventListener('wheel', wheel); host.addEventListener('resize', position);
  collect(); position();
  const result = { element: rail };
  mounted.set(doc, result);
  return result;
}
