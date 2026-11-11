# cloud: ex4-<gun>.json = ex-<gun>.json whose export also carries the arms' meshes (sleeves, cuffs, bare forearm) as drawn
import json, glob, os
add = r"""
const arms = {};
for (const sd of ['r', 'l']) { const A = V.arms && V.arms[sd]; if (!A) continue; const ms = A.meshes || {}; arms[sd] = {};
  for (const k of Object.keys(ms)) { if (k === 'glove' || k === 'glovePads' || k === 'bare' || k === 'bareNails') continue; const m = ms[k]; if (!m || !m.isMesh || !vis(m) || !m.geometry || !m.geometry.attributes.position) continue;
    const pos = m.geometry.attributes.position, wor = new Float32Array(pos.count * 3); for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); wor[i * 3] = v.x; wor[i * 3 + 1] = v.y; wor[i * 3 + 2] = v.z; }
    const ix = m.geometry.index; arms[sd][k] = { wor: b64(wor), idx: ix ? b64(new Uint32Array(ix.array)) : null }; } }
"""
for f in glob.glob('/home/claude/fpshot/ex-*.json'):
    s = json.load(open(f)); e = s[-1]['js']
    e = e.replace('const __cam = ', add + 'const __cam = ', 1).replace("{ info, parts, hands }", "{ info, parts, hands, arms }")
    s[-1]['js'] = e; json.dump(s, open(f.replace('/ex-', '/ex4-'), 'w'))
print('ok')
